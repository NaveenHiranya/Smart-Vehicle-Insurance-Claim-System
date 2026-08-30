import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { garageAuthMiddleware } from '../middleware/garageAuth.js';
import { loginLimiter, authLimiter } from '../middleware/rateLimiters.js';
import { remainingLockMs, recordFailure, recordSuccess, TIMING_EQUALIZER_HASH } from '../utils/loginGuard.js';
import { getJwtSecret } from '../utils/jwt.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

// POST /api/garage/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { password, name, ownerName, phone, address, city, licenseNumber, specialties } = req.body;
    const rawEmail = String(req.body.email ?? '').trim();
    const email = rawEmail.toLowerCase();

    if (!email || !password || !name || !ownerName || !phone || !address || !city || !licenseNumber) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }

    // Emails are stored lowercase — check both spellings to avoid duplicates
    const existing = await prisma.garage.findFirst({
      where: rawEmail !== email ? { OR: [{ email }, { email: rawEmail }] } : { email },
    });
    if (existing) {
      res.status(409).json({ error: 'A garage with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const garage = await prisma.garage.create({
      data: {
        email,
        passwordHash,
        name,
        ownerName,
        phone,
        address,
        city,
        licenseNumber,
        specialties: JSON.stringify(specialties || []),
        isApproved: false,
      },
      select: {
        id: true, email: true, name: true, ownerName: true,
        phone: true, address: true, city: true, licenseNumber: true,
        specialties: true, isActive: true, isApproved: true, createdAt: true,
      },
    });

    res.status(201).json({
      garage,
      message: 'Registration successful. Your account is pending admin approval.',
    });
  } catch (error) {
    console.error('Garage registration error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/garage/auth/login
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
    const lockKey = `garage:${email}`;
    const lockMs = remainingLockMs(lockKey);
    if (lockMs > 0) {
      res.status(429).json({ error: `Too many failed attempts. Try again in ${Math.ceil(lockMs / 60000)} minute(s).` });
      return;
    }

    let garage = await prisma.garage.findUnique({ where: { email } });
    // Legacy mixed-case emails — exact spelling match before giving up
    if (!garage && rawEmail !== email) {
      garage = await prisma.garage.findUnique({ where: { email: rawEmail } });
    }
    if (!garage) {
      // Equalize timing so the response does not reveal whether the email exists
      await bcrypt.compare(String(password), TIMING_EQUALIZER_HASH);
      recordFailure(lockKey);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!garage.isApproved) {
      res.status(403).json({ error: 'Your account is pending admin approval. Please wait for approval before logging in.' });
      return;
    }

    if (!garage.isActive) {
      res.status(403).json({ error: 'This garage account has been deactivated. Contact support.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, garage.passwordHash);
    if (!isValidPassword) {
      recordFailure(lockKey);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    recordSuccess(lockKey);

    const token = jwt.sign(
      { garageId: garage.id, role: 'garage' },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      garage: {
        id: garage.id, email: garage.email, name: garage.name,
        ownerName: garage.ownerName, phone: garage.phone,
        address: garage.address, city: garage.city,
        licenseNumber: garage.licenseNumber, specialties: garage.specialties,
      },
      token,
    });
  } catch (error) {
    console.error('Garage login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// GET /api/garage/auth/profile
router.get('/profile', garageAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const garage = await prisma.garage.findUnique({
      where: { id: req.userId },
      select: {
        id: true, email: true, name: true, ownerName: true,
        phone: true, address: true, city: true, licenseNumber: true,
        specialties: true, isActive: true, createdAt: true,
      },
    });

    if (!garage) {
      res.status(404).json({ error: 'Garage not found.' });
      return;
    }

    res.json(garage);
  } catch (error) {
    console.error('Garage profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

export default router;
