import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { getJwtSecret } from '../utils/jwt.js';
import { AuthRequest } from '../types/index.js';

export async function garageAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { garageId: string; role: string };
    if (payload.role !== 'garage') {
      res.status(403).json({ error: 'Garage access required.' });
      return;
    }
    const garage = await prisma.garage.findUnique({ where: { id: payload.garageId } });
    if (!garage || !garage.isApproved || !garage.isActive) {
      res.status(403).json({ error: 'Garage account not found, not approved, or inactive.' });
      return;
    }
    req.userId = payload.garageId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
