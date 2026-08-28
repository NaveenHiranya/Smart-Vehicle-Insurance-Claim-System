import { Router, Response } from 'express';
import prisma from '../utils/prisma.js';
import { garageAuthMiddleware } from '../middleware/garageAuth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();
router.use(garageAuthMiddleware);

const param = (req: AuthRequest, name: string): string => req.params[name] as string;

// GET /api/garage/claims - List claims assigned to this garage
router.get('/claims', async (req: AuthRequest, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const where: any = { garageId: req.userId };
    if (statusFilter) where.status = statusFilter;

    const claims = await prisma.claim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        vehicle: { select: { make: true, model: true, year: true, color: true, licensePlate: true } },
        damageAssessment: { select: { id: true, overallSeverity: true, damages: true, assessedAt: true } },
        repairEstimate: { select: { id: true, items: true, totalPartsCost: true, totalLaborCost: true, totalCost: true, estimatedDays: true } },
        garageEstimate: { select: { id: true, submittedAt: true } },
        _count: { select: { images: true } },
      },
    });

    res.json(claims);
  } catch (error) {
    console.error('Garage claims error:', error);
    res.status(500).json({ error: 'Failed to fetch claims.' });
  }
});

// GET /api/garage/claims/:id - Claim detail with AI assessment
router.get('/claims/:id', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), garageId: req.userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        vehicle: true,
        images: true,
        damageAssessment: true,
        repairEstimate: true,
        garageEstimate: true,
        documents: true,
        adminNotes: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    res.json(claim);
  } catch (error) {
    console.error('Garage claim detail error:', error);
    res.status(500).json({ error: 'Failed to fetch claim.' });
  }
});

// POST /api/garage/claims/:id/estimate - Submit or update garage estimate
router.post('/claims/:id/estimate', async (req: AuthRequest, res: Response) => {
  try {
    const claimId = param(req, 'id');
    const garageId = req.userId!;

    const claim = await prisma.claim.findFirst({
      where: { id: claimId, garageId },
      include: { damageAssessment: true },
    });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    if (!claim.damageAssessment) {
      res.status(400).json({ error: 'AI damage assessment must be completed first.' });
      return;
    }

    const { items, totalPartsCost, totalLaborCost, totalCost, estimatedDays, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one repair item is required.' });
      return;
    }

    const estimateData = {
      items: items as any,
      totalPartsCost: Number(totalPartsCost) || 0,
      totalLaborCost: Number(totalLaborCost) || 0,
      totalCost: Number(totalCost) || 0,
      estimatedDays: Number(estimatedDays) || 1,
      notes: notes || null,
    };

    const existing = await prisma.garageEstimate.findUnique({ where: { claimId } });

    let estimate;
    if (existing) {
      estimate = await prisma.garageEstimate.update({
        where: { claimId },
        data: estimateData,
      });
    } else {
      estimate = await prisma.garageEstimate.create({
        data: {
          claimId,
          garageId,
          ...estimateData,
        },
      });
    }

    // Update claim status to GARAGE_ESTIMATED
    await prisma.claim.update({
      where: { id: claimId },
      data: { status: 'GARAGE_ESTIMATED' },
    });

    res.json(estimate);
  } catch (error) {
    console.error('Garage submit estimate error:', error);
    res.status(500).json({ error: 'Failed to submit estimate.' });
  }
});

export default router;
