import rateLimit from 'express-rate-limit';

// Shared per-IP limiters for credential endpoints. Combined with the per-email
// lockout in utils/loginGuard.ts, this covers both distributed and targeted
// brute-force attempts. req.ip resolves through the Railway proxy because the
// app sets `trust proxy` in index.ts.

// Login endpoints — 10 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' },
});

// Registration / OAuth endpoints — 20 requests per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a few minutes.' },
});
