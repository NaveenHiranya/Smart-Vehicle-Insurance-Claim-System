import { Router, Response } from 'express';
import prisma from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

const param = (req: AuthRequest, name: string): string => req.params[name] as string;

// GET /api/policies/templates — built-in plans offered by the insurance company
router.get('/templates', async (_req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.policyTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ coverageType: 'asc' }, { annualFee: 'asc' }],
    });
    res.json(templates);
  } catch (error) {
    console.error('Get policy templates error:', error);
    res.status(500).json({ error: 'Failed to fetch policy plans.' });
  }
});

// POST /api/policies/activate — activate a built-in plan for one of the signed-in user's vehicles
router.post('/activate', async (req: AuthRequest, res: Response) => {
  try {
    const { templateId, vehicleId } = req.body;
    if (!templateId || !vehicleId) {
      res.status(400).json({ error: 'Plan and vehicle are required.' });
      return;
    }
    const template = await prisma.policyTemplate.findFirst({
      where: { id: templateId, isActive: true },
    });
    if (!template) {
      res.status(404).json({ error: 'Plan not found.' });
      return;
    }

    // The plan attaches to the user's own vehicle
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId: req.userId },
      include: { insurancePolicy: { select: { id: true } } },
    });
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found.' });
      return;
    }
    if (vehicle.insurancePolicy) {
      res.status(409).json({ error: 'This vehicle already has an insurance policy. Delete it first to activate a different plan.' });
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const policy = await prisma.insurancePolicy.create({
      data: {
        userId: req.userId!,
        vehicleId: vehicle.id,
        providerName: 'Flash Claim Insurance',
        policyNumber: `FC-${Date.now().toString(36).toUpperCase()}`,
        coverageType: template.coverageType,
        deductible: template.deductible,
        premiumAmount: template.annualFee,
        coveragePercent: template.coveragePercent,
        templateId: template.id,
        startDate,
        endDate,
      },
    });

    // The vehicle still needs insurance/admin verification before claims unlock
    res.status(201).json(policy);
  } catch (error) {
    console.error('Activate policy error:', error);
    res.status(500).json({ error: 'Failed to activate plan.' });
  }
});

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
      include: { template: { select: { name: true } } },
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

// DELETE /api/policies/:id — removing a verified vehicle's policy makes it unverified again
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.insurancePolicy.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
      include: { vehicle: { select: { id: true, verificationStatus: true } } },
    });

    if (!existing) {
      res.status(404).json({ error: 'Policy not found.' });
      return;
    }

    await prisma.insurancePolicy.delete({ where: { id: param(req, 'id') } });

    // A verified vehicle without a policy can no longer be claimed
    if (existing.vehicle && existing.vehicle.verificationStatus === 'VERIFIED') {
      await prisma.vehicle.update({
        where: { id: existing.vehicle.id },
        data: { verificationStatus: 'PENDING', verifiedAt: null },
      });
    }

    res.json({ message: 'Policy deleted successfully.' });
  } catch (error) {
    console.error('Delete policy error:', error);
    res.status(500).json({ error: 'Failed to delete policy.' });
  }
});

export default router;
