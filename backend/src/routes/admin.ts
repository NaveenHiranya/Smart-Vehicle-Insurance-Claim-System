import { Router, Response } from 'express';
import prisma from '../utils/prisma.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();
router.use(adminAuthMiddleware);

const param = (req: AuthRequest, name: string): string => req.params[name] as string;

// GET /api/admin/stats
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [userCount, claimCounts, docCount, pendingDocs] = await Promise.all([
      prisma.user.count({ where: { isAdmin: false } }),
      prisma.claim.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.document.count(),
      prisma.document.count({ where: { verificationStatus: 'PENDING' } }),
    ]);
    const claimsByStatus = Object.fromEntries(claimCounts.map((c: { status: string; _count: { id: number } }) => [c.status, c._count.id]));
    res.json({ userCount, claimsByStatus, docCount, pendingDocs });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET /api/admin/users
router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isAdmin: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, address: true, createdAt: true,
        _count: { select: { vehicles: true, claims: true } },
      },
    });
    res.json(users);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// GET /api/admin/claims
router.get('/claims', async (req: AuthRequest, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const where: any = {};
    if (statusFilter) where.status = statusFilter;
    if (search) {
      where.OR = [
        { user: { firstName: { contains: search } } },
        { user: { lastName: { contains: search } } },
        { user: { email: { contains: search } } },
        { vehicle: { make: { contains: search } } },
        { vehicle: { model: { contains: search } } },
      ];
    }
    const claims = await prisma.claim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        vehicle: { select: { make: true, model: true, year: true, licensePlate: true } },
        damageAssessment: { select: { overallSeverity: true } },
        _count: { select: { images: true, documents: true } },
      },
    });
    res.json(claims);
  } catch (error) {
    console.error('Admin claims error:', error);
    res.status(500).json({ error: 'Failed to fetch claims.' });
  }
});

// GET /api/admin/claims/:id
router.get('/claims/:id', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: param(req, 'id') },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        vehicle: true,
        policy: true,
        images: true,
        damageAssessment: true,
        repairEstimate: true,
        insurancePayout: true,
        documents: true,
        chatMessages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!claim) { res.status(404).json({ error: 'Claim not found.' }); return; }
    res.json(claim);
  } catch (error) {
    console.error('Admin claim detail error:', error);
    res.status(500).json({ error: 'Failed to fetch claim.' });
  }
});

// PATCH /api/admin/claims/:id/status
router.patch('/claims/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status value.' });
      return;
    }
    const claim = await prisma.claim.update({
      where: { id: param(req, 'id') },
      data: { status },
    });
    res.json(claim);
  } catch (error) {
    console.error('Admin status update error:', error);
    res.status(500).json({ error: 'Failed to update claim status.' });
  }
});

// GET /api/admin/documents
router.get('/documents', async (req: AuthRequest, res: Response) => {
  try {
    const statusFilter = (req.query.status as string) || 'PENDING';
    const where: any = {};
    if (statusFilter !== 'ALL') where.verificationStatus = statusFilter;
    const docs = await prisma.document.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        claim: {
          select: {
            id: true, status: true, incidentDate: true,
            user: { select: { firstName: true, lastName: true, email: true } },
            vehicle: { select: { make: true, model: true, year: true } },
          },
        },
      },
    });
    res.json(docs);
  } catch (error) {
    console.error('Admin documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

// PATCH /api/admin/documents/:id/approve
router.patch('/documents/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const doc = await prisma.document.update({
      where: { id: param(req, 'id') },
      data: {
        verificationStatus: 'VERIFIED',
        verificationResult: { status: 'VERIFIED', issues: [], approvedByAdmin: true } as any,
      },
    });
    res.json(doc);
  } catch (error) {
    console.error('Admin approve doc error:', error);
    res.status(500).json({ error: 'Failed to approve document.' });
  }
});

// PATCH /api/admin/documents/:id/reject
router.patch('/documents/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const doc = await prisma.document.update({
      where: { id: param(req, 'id') },
      data: {
        verificationStatus: 'ISSUES_FOUND',
        verificationResult: { status: 'ISSUES_FOUND', issues: [reason || 'Rejected by insurance reviewer'], approvedByAdmin: false } as any,
      },
    });
    res.json(doc);
  } catch (error) {
    console.error('Admin reject doc error:', error);
    res.status(500).json({ error: 'Failed to reject document.' });
  }
});

export default router;
