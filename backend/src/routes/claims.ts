import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadImage, uploadDocument } from '../middleware/upload.js';
import { AuthRequest } from '../types/index.js';
import { analyzeDamage } from '../services/damageAnalysisService.js';
import { generateRepairEstimate } from '../services/repairEstimateService.js';
import { verifyDocument } from '../services/documentVerificationService.js';
import { getChatResponse } from '../services/claimAssistantService.js';

const router = Router();

router.use(authMiddleware);

// GET /api/claims/garages - List active garages for user selection
router.get('/garages', async (_req: AuthRequest, res: Response) => {
  try {
    const garages = await prisma.garage.findMany({
      where: { isActive: true, isApproved: true },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, phone: true, address: true, city: true,
        licenseNumber: true, specialties: true,
      },
    });
    res.json(garages);
  } catch (error) {
    console.error('List garages error:', error);
    res.status(500).json({ error: 'Failed to fetch garages.' });
  }
});

// Helper to extract string params from Express 5 (which types them as string | string[])
const param = (req: AuthRequest, name: string): string => req.params[name] as string;

// POST /api/claims — only verified vehicles may file claims; the claim is linked to the
// selected vehicle's policy (insurance is vehicle-based)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, garageId, incidentDate, incidentLocation, incidentDescription, weatherConditions, hasPoliceReport } = req.body;

    if (!vehicleId || !incidentDate || !incidentLocation || !incidentDescription) {
      res.status(400).json({ error: 'Vehicle, incident date, location, and description are required.' });
      return;
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId: req.userId },
      include: { insurancePolicy: { select: { id: true } } },
    });

    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found.' });
      return;
    }

    // The insurance/admin panel must verify the vehicle and its policy before claims unlock
    if (vehicle.verificationStatus !== 'VERIFIED') {
      res.status(403).json({ error: 'This vehicle has not been verified yet. You cannot submit a claim until the vehicle and insurance policy have been verified.' });
      return;
    }

    if (!vehicle.insurancePolicy) {
      res.status(400).json({ error: 'This vehicle has no insurance policy. The insurance company must add one before a claim can be filed.' });
      return;
    }

    const claim = await prisma.claim.create({
      data: {
        userId: req.userId!,
        vehicleId,
        policyId: vehicle.insurancePolicy.id,
        garageId: garageId || null,
        incidentDate: new Date(incidentDate),
        incidentLocation,
        incidentDescription,
        weatherConditions: weatherConditions || null,
        hasPoliceReport: hasPoliceReport || false,
      },
    });

    res.status(201).json(claim);
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({ error: 'Failed to create claim.' });
  }
});

// GET /api/claims
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const statusFilter = req.query.status as string;
    const where: any = { userId: req.userId };
    if (statusFilter) {
      where.status = statusFilter;
    }

    const claims = await prisma.claim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { make: true, model: true, year: true, color: true } },
        damageAssessment: { select: { overallSeverity: true } },
        _count: { select: { images: true, documents: true } },
      },
    });

    res.json(claims);
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ error: 'Failed to fetch claims.' });
  }
});

// GET /api/claims/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
      include: {
        vehicle: true,
        policy: true,
        garage: { select: { id: true, name: true, phone: true, address: true, city: true } },
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

    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    res.json(claim);
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({ error: 'Failed to fetch claim.' });
  }
});

// PUT /api/claims/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    if (existing.status !== 'DRAFT') {
      res.status(400).json({ error: 'Can only edit claims in DRAFT status.' });
      return;
    }

    const { incidentDate, incidentLocation, incidentDescription, weatherConditions, hasPoliceReport, garageId } = req.body;

    const claim = await prisma.claim.update({
      where: { id: param(req, 'id') },
      data: {
        ...(incidentDate && { incidentDate: new Date(incidentDate) }),
        ...(incidentLocation && { incidentLocation }),
        ...(incidentDescription && { incidentDescription }),
        ...(weatherConditions !== undefined && { weatherConditions }),
        ...(hasPoliceReport !== undefined && { hasPoliceReport }),
        ...(garageId !== undefined && { garageId: garageId || null }),
      },
    });

    res.json(claim);
  } catch (error) {
    console.error('Update claim error:', error);
    res.status(500).json({ error: 'Failed to update claim.' });
  }
});

// PATCH /api/claims/:id/garage - Select or change the garage after claim creation
router.patch('/:id/garage', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
      include: { garageEstimate: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    if (existing.garageEstimate) {
      res.status(400).json({ error: 'The garage has already submitted an estimate. Please contact your insurance company to change the garage.' });
      return;
    }

    if (['APPROVED', 'COMPLETED', 'REJECTED'].includes(existing.status)) {
      res.status(400).json({ error: 'The garage can no longer be changed for this claim.' });
      return;
    }

    const { garageId } = req.body;
    if (!garageId) {
      res.status(400).json({ error: 'Garage is required.' });
      return;
    }

    const garage = await prisma.garage.findFirst({
      where: { id: garageId, isActive: true, isApproved: true },
    });

    if (!garage) {
      res.status(404).json({ error: 'Garage not found or not available.' });
      return;
    }

    // Once the claim is submitted, a garage assignment moves it to GARAGE_REVIEW
    const newStatus = existing.status === 'DRAFT' ? existing.status : 'GARAGE_REVIEW';

    const claim = await prisma.claim.update({
      where: { id: param(req, 'id') },
      data: {
        garageId,
        ...(newStatus !== existing.status && { status: newStatus }),
      },
    });

    res.json(claim);
  } catch (error) {
    console.error('Update garage error:', error);
    res.status(500).json({ error: 'Failed to update garage.' });
  }
});

// POST /api/claims/:id/submit
router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
      include: { images: true, vehicle: true },
    });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    if (claim.status !== 'DRAFT') {
      res.status(400).json({ error: 'Claim has already been submitted.' });
      return;
    }

    if (claim.images.length === 0) {
      res.status(400).json({ error: 'Please upload at least one image before submitting.' });
      return;
    }

    const claimId = param(req, 'id') as string;

    // Update status: if garage is assigned, go to GARAGE_REVIEW, otherwise SUBMITTED
    const fullClaim = await prisma.claim.findUnique({ where: { id: claimId } });
    const newStatus = fullClaim?.garageId ? 'GARAGE_REVIEW' : 'SUBMITTED';
    const updatedClaim = await prisma.claim.update({
      where: { id: claimId },
      data: { status: newStatus },
    });

    // Run AI damage analysis in the background
    analyzeDamage(claimId).catch((err: unknown) => {
      console.error('Background damage analysis failed:', err);
    });

    res.json(updatedClaim);
  } catch (error) {
    console.error('Submit claim error:', error);
    res.status(500).json({ error: 'Failed to submit claim.' });
  }
});

// POST /api/claims/:id/images
router.post('/:id/images', uploadImage.array('images', 10), async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const imageType = (req.body.imageType as string) || 'FULL_VEHICLE';

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No images uploaded.' });
      return;
    }

    const images = await Promise.all(
      files.map((file) =>
        prisma.claimImage.create({
          data: {
            claimId: param(req, 'id'),
            type: imageType === 'DAMAGE_CLOSEUP' ? 'DAMAGE_CLOSEUP' : 'FULL_VEHICLE',
            filePath: `/uploads/images/${file.filename}`,
            label: req.body.label || null,
          },
        })
      )
    );

    res.status(201).json(images);
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({ error: 'Failed to upload images.' });
  }
});

// DELETE /api/claims/:id/images/:imageId
router.delete('/:id/images/:imageId', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    const image = await prisma.claimImage.findFirst({
      where: { id: param(req, 'imageId'), claimId: param(req, 'id') },
    });

    if (!image) {
      res.status(404).json({ error: 'Image not found.' });
      return;
    }

    // Delete file from disk
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.resolve(uploadDir, image.filePath.replace(/^\/uploads\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.claimImage.delete({ where: { id: image.id } });
    res.json({ message: 'Image deleted successfully.' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image.' });
  }
});

// POST /api/claims/:id/analyze - Trigger AI damage analysis
router.post('/:id/analyze', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    const assessment = await analyzeDamage(param(req, 'id'));
    res.json(assessment);
  } catch (error) {
    console.error('Analyze damage error:', error);
    // Known preconditions surface as actionable 400s; anything else is an AI-side
    // hiccup the user can retry (the cascade has already exhausted the models).
    const message = error instanceof Error ? error.message : '';
    if (message.includes('images')) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(502).json({ error: 'AI damage analysis failed. Please try again in a moment.' });
  }
});

// POST /api/claims/:id/estimate - Generate repair estimate
router.post('/:id/estimate', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
      include: { vehicle: true, damageAssessment: true, policy: true },
    });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    if (!claim.damageAssessment) {
      res.status(400).json({ error: 'Damage analysis must be completed first.' });
      return;
    }

    const estimate = await generateRepairEstimate(param(req, 'id'));
    res.json(estimate);
  } catch (error) {
    console.error('Generate estimate error:', error);
    res.status(500).json({ error: 'Failed to generate estimate.' });
  }
});

// POST /api/claims/:id/documents
router.post('/:id/documents', uploadDocument.single('document'), async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No document uploaded.' });
      return;
    }

    const docType = req.body.documentType || 'LICENSE';
    const validTypes = ['LICENSE', 'REGISTRATION', 'ACCIDENT_REPORT', 'REPAIR_ESTIMATE'];
    if (!validTypes.includes(docType)) {
      res.status(400).json({ error: 'Invalid document type.' });
      return;
    }

    const document = await prisma.document.create({
      data: {
        claimId: param(req, 'id'),
        type: docType as any,
        filePath: `/uploads/documents/${req.file.filename}`,
      },
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
});

// GET /api/claims/:id/documents
router.get('/:id/documents', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    const documents = await prisma.document.findMany({
      where: { claimId: param(req, 'id') },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

// POST /api/claims/:id/documents/:docId/verify
router.post('/:id/documents/:docId/verify', async (req: AuthRequest, res: Response) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: param(req, 'docId'), claimId: param(req, 'id') },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const result = await verifyDocument(document.id);
    res.json(result);
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({ error: 'Failed to verify document.' });
  }
});

// GET /api/claims/:id/chat
router.get('/:id/chat', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    const messages = await prisma.chatMessage.findMany({
      where: { claimId: param(req, 'id') },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages.' });
  }
});

// POST /api/claims/:id/chat
router.post('/:id/chat', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    const response = await getChatResponse(param(req, 'id'), message);
    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to get chat response.' });
  }
});

export default router;
