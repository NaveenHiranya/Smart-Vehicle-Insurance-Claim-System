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
        garage: { select: { id: true, name: true, city: true } },
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
        garage: { select: { id: true, name: true, ownerName: true, phone: true, address: true, city: true, licenseNumber: true } },
        images: true,
        damageAssessment: true,
        repairEstimate: true,
        garageEstimate: true,
        insurancePayout: true,
        documents: true,
        chatMessages: { orderBy: { createdAt: 'asc' } },
        adminNotes: { orderBy: { createdAt: 'desc' } },
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
    const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'GARAGE_REVIEW', 'GARAGE_ESTIMATED', 'APPROVED', 'REJECTED', 'COMPLETED'];
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

// GET /api/admin/claims/:id/notes
router.get('/claims/:id/notes', async (req: AuthRequest, res: Response) => {
  try {
    const notes = await prisma.adminNote.findMany({
      where: { claimId: param(req, 'id') },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notes);
  } catch (error) {
    console.error('Admin get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes.' });
  }
});

// POST /api/admin/claims/:id/notes
router.post('/claims/:id/notes', async (req: AuthRequest, res: Response) => {
  try {
    const { category, content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Note content is required.' });
      return;
    }
    const validCategories = ['vehicle', 'document', 'general'];
    const cat = validCategories.includes(category) ? category : 'general';

    const claim = await prisma.claim.findUnique({ where: { id: param(req, 'id') } });
    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    const note = await prisma.adminNote.create({
      data: { claimId: param(req, 'id'), category: cat, content: content.trim() },
    });
    res.status(201).json(note);
  } catch (error) {
    console.error('Admin create note error:', error);
    res.status(500).json({ error: 'Failed to create note.' });
  }
});

// DELETE /api/admin/notes/:noteId
router.delete('/notes/:noteId', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.adminNote.delete({ where: { id: param(req, 'noteId') } });
    res.json({ message: 'Note deleted.' });
  } catch (error) {
    console.error('Admin delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note.' });
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

// GET /api/admin/garages
router.get('/garages', async (_req: AuthRequest, res: Response) => {
  try {
    const garages = await prisma.garage.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, ownerName: true, phone: true,
        address: true, city: true, licenseNumber: true, specialties: true,
        isActive: true, isApproved: true, createdAt: true,
        _count: { select: { claims: true, garageEstimates: true } },
      },
    });
    res.json(garages);
  } catch (error) {
    console.error('Admin garages error:', error);
    res.status(500).json({ error: 'Failed to fetch garages.' });
  }
});

// PATCH /api/admin/garages/:id/approve
router.patch('/garages/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const garage = await prisma.garage.findUnique({ where: { id: param(req, 'id') } });
    if (!garage) {
      res.status(404).json({ error: 'Garage not found.' });
      return;
    }
    const updated = await prisma.garage.update({
      where: { id: param(req, 'id') },
      data: { isApproved: true, isActive: true },
    });
    res.json(updated);
  } catch (error) {
    console.error('Admin approve garage error:', error);
    res.status(500).json({ error: 'Failed to approve garage.' });
  }
});

// PATCH /api/admin/garages/:id/toggle
router.patch('/garages/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const garage = await prisma.garage.findUnique({ where: { id: param(req, 'id') } });
    if (!garage) {
      res.status(404).json({ error: 'Garage not found.' });
      return;
    }
    const updated = await prisma.garage.update({
      where: { id: param(req, 'id') },
      data: { isActive: !garage.isActive },
    });
    res.json(updated);
  } catch (error) {
    console.error('Admin toggle garage error:', error);
    res.status(500).json({ error: 'Failed to toggle garage.' });
  }
});

export default router;
