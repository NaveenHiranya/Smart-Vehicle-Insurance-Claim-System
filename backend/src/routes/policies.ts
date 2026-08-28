import { Router, Response } from 'express';
import prisma from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

const param = (req: AuthRequest, name: string): string => req.params[name] as string;

// POST /api/policies
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { providerName, policyNumber, coverageType, deductible, premiumAmount, startDate, endDate } = req.body;

    if (!providerName || !policyNumber || !coverageType || deductible === undefined || !premiumAmount || !startDate || !endDate) {
      res.status(400).json({ error: 'All policy fields are required.' });
      return;
    }

    const policy = await prisma.insurancePolicy.create({
      data: {
        userId: req.userId!,
        providerName,
        policyNumber,
        coverageType,
        deductible: parseFloat(deductible),
        premiumAmount: parseFloat(premiumAmount),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    res.status(201).json(policy);
  } catch (error) {
    console.error('Create policy error:', error);
    res.status(500).json({ error: 'Failed to create policy.' });
  }
});

// GET /api/policies
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const policies = await prisma.insurancePolicy.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(policies);
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ error: 'Failed to fetch policies.' });
  }
});

// GET /api/policies/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const policy = await prisma.insurancePolicy.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!policy) {
      res.status(404).json({ error: 'Policy not found.' });
      return;
    }

    res.json(policy);
  } catch (error) {
    console.error('Get policy error:', error);
    res.status(500).json({ error: 'Failed to fetch policy.' });
  }
});

// PUT /api/policies/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.insurancePolicy.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Policy not found.' });
      return;
    }

    const { providerName, policyNumber, coverageType, deductible, premiumAmount, startDate, endDate } = req.body;

    const policy = await prisma.insurancePolicy.update({
      where: { id: param(req, 'id') },
      data: {
        ...(providerName && { providerName }),
        ...(policyNumber && { policyNumber }),
        ...(coverageType && { coverageType }),
        ...(deductible !== undefined && { deductible: parseFloat(deductible) }),
        ...(premiumAmount !== undefined && { premiumAmount: parseFloat(premiumAmount) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });

    res.json(policy);
  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({ error: 'Failed to update policy.' });
  }
});

// DELETE /api/policies/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.insurancePolicy.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Policy not found.' });
      return;
    }

    await prisma.insurancePolicy.delete({ where: { id: param(req, 'id') } });
    res.json({ message: 'Policy deleted successfully.' });
  } catch (error) {
    console.error('Delete policy error:', error);
    res.status(500).json({ error: 'Failed to delete policy.' });
  }
});

export default router;
