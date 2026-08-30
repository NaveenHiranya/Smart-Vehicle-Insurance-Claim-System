import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { loginLimiter, authLimiter } from '../middleware/rateLimiters.js';
import { remainingLockMs, recordFailure, recordSuccess, TIMING_EQUALIZER_HASH } from '../utils/loginGuard.js';
import { getJwtSecret } from '../utils/jwt.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

// Verifies Google ID tokens against Google's public keys (audience = our client id)
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

// Minimum password policy: 8+ chars with at least one letter and one number
function isValidPassword(password: unknown): boolean {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}

// POST /api/auth/register — insurance is attached per vehicle later, not at signup
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { password, firstName, lastName, phone, address, nic } = req.body;
    const rawEmail = String(req.body.email ?? '').trim();
    const email = rawEmail.toLowerCase();

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'Email, password, first name, and last name are required.' });
      return;
    }

    if (!isValidPassword(password)) {
      res.status(400).json({ error: 'Password must be at least 8 characters and include a letter and a number.' });
      return;
    }

    // Sri Lankan NIC: old format 9 digits + V/X, or new format 12 digits
    if (nic && !/^\d{9}[vVxX]$|^\d{12}$/.test(String(nic).trim())) {
      res.status(400).json({ error: 'NIC must be 9 digits followed by V/X or 12 digits.' });
      return;
    }

    // Emails are stored lowercase — check both spellings so Foo@x.com and
    // foo@x.com cannot become separate accounts
    const existingUser = await prisma.user.findFirst({
      where: rawEmail !== email ? { OR: [{ email }, { email: rawEmail }] } : { email },
    });
    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        address: address || null,
        nic: nic ? String(nic).trim().toUpperCase() : null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        nic: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const rawEmail = String(req.body.email ?? '').trim();
    const email = rawEmail.toLowerCase();

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    // Per-email lockout — 5 failures lock the account for 15 minutes
    const lockKey = `user:${email}`;
    const lockMs = remainingLockMs(lockKey);
    if (lockMs > 0) {
      res.status(429).json({ error: `Too many failed attempts. Try again in ${Math.ceil(lockMs / 60000)} minute(s).` });
      return;
    }

    let user = await prisma.user.findUnique({ where: { email } });
    // Legacy mixed-case emails — exact spelling match before giving up
    if (!user && rawEmail !== email) {
      user = await prisma.user.findUnique({ where: { email: rawEmail } });
    }

    if (!user) {
      // Burn the same bcrypt cost as a real comparison so timing does not
      // reveal whether the email exists
      await bcrypt.compare(String(password), TIMING_EQUALIZER_HASH);
      recordFailure(lockKey);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      recordFailure(lockKey);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    recordSuccess(lockKey);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        isAdmin: user.isAdmin,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/google — Google Identity Services sign-in. The client sends
// the Google ID token (credential); we verify it against Google's public keys
// and create or link the account, then issue our own session token.
router.post('/google', authLimiter, async (req: Request, res: Response) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      res.status(503).json({ error: 'Google sign-in is not configured.' });
      return;
    }

    const { credential } = req.body;
    if (!credential || typeof credential !== 'string') {
      res.status(400).json({ error: 'Google credential is required.' });
      return;
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (error) {
      console.error('Google ID token verification failed:', error);
      res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
      return;
    }

    if (!payload?.sub || !payload.email) {
      res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
      return;
    }
    if (!payload.email_verified) {
      res.status(401).json({ error: 'Your Google account email is not verified.' });
      return;
    }

    const email = payload.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });

    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        // Admin accounts stay password-only — a deliberate hardening rule
        if (byEmail.isAdmin) {
          res.status(403).json({ error: 'Admin accounts must sign in with a password.' });
          return;
        }
        // Google has verified ownership of this email — safe to link
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId: payload.sub },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            googleId: payload.sub,
            firstName: payload.given_name?.trim() || 'Google',
            lastName: payload.family_name?.trim() || 'User',
            // Google-only accounts have no password — an unguessable random hash
            passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
          },
        });
      }
    } else if (user.isAdmin) {
      res.status(403).json({ error: 'Admin accounts must sign in with a password.' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        isAdmin: user.isAdmin,
      },
      token,
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Google sign-in failed.' });
  }
});

// GET /api/auth/profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        nic: true,
        licenseType: true,
        annualFee: true,
        joinedAt: true,
        isAdmin: true,
        createdAt: true,
        // Latest policy — provides the user's insurance type
        policies: { orderBy: { createdAt: 'desc' }, take: 1, select: { coverageType: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, phone, address } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

export default router;
