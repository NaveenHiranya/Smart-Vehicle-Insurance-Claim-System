import { Router, Response } from 'express';
import prisma from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { detectVehicleFromImage } from '../services/vehicleDetectionService.js';
import { AuthRequest, VEHICLE_TYPES } from '../types/index.js';

const router = Router();

// All vehicle routes require authentication
router.use(authMiddleware);

const param = (req: AuthRequest, name: string): string => req.params[name] as string;

// POST /api/vehicles/detect - AI vehicle detection from an image
// source=photo (default) recognizes the vehicle; source=book reads details
// from the vehicle book (CR book / certificate of registration)
router.post('/detect', uploadImage.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image uploaded.' });
      return;
    }

    const source = req.body?.source === 'book' ? 'book' : 'photo';
    const imagePath = `/uploads/images/${req.file.filename}`;
    const detection = await detectVehicleFromImage(imagePath, source);

    res.json({ ...detection, imagePath });
  } catch (error) {
    console.error('Vehicle detection error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze vehicle image.';
    res.status(500).json({ error: message });
  }
});

// POST /api/vehicles — insurance (a built-in plan) may optionally be attached at registration;
// the vehicle always starts PENDING until the insurance company verifies it
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { make, model, year, vin, licensePlate, color, mileage, photos, insurance, vehicleType } = req.body;

    if (!make || !model || !year || !licensePlate || !color) {
      res.status(400).json({ error: 'Make, model, year, license plate, and color are required.' });
      return;
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: req.userId!,
        make,
        model,
        year: parseInt(year),
        vin: vin || null,
        licensePlate,
        color,
        mileage: mileage ? parseInt(mileage) : null,
        photos: JSON.stringify(photos || []),
        vehicleType: (VEHICLE_TYPES as readonly string[]).includes(vehicleType) ? vehicleType : 'CAR',
      },
      include: { insurancePolicy: { include: { template: { select: { name: true } } } } },
    });

    // Optional insurance at registration — the policy itself still needs admin verification
    if (insurance?.templateId) {
      const template = await prisma.policyTemplate.findFirst({
        where: { id: insurance.templateId, isActive: true },
      });
      if (template) {
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
          include: { template: { select: { name: true } } },
        });
        vehicle.insurancePolicy = policy;
      }
    }

    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Failed to register vehicle.' });
  }
});

// GET /api/vehicles
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { claims: true } },
        insurancePolicy: { include: { template: { select: { name: true } } } },
      },
    });

    res.json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

// GET /api/vehicles/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
      include: {
        insurancePolicy: { include: { template: { select: { name: true } } } },
        claims: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            incidentDate: true,
            createdAt: true,
          },
        },
      },
    });

    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found.' });
      return;
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle.' });
  }
});

// PUT /api/vehicles/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.vehicle.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Vehicle not found.' });
      return;
    }

    const { make, model, year, vin, licensePlate, color, mileage, photos, vehicleType } = req.body;

    const vehicle = await prisma.vehicle.update({
      where: { id: param(req, 'id') },
      data: {
        ...(make && { make }),
        ...(model && { model }),
        ...(year && { year: parseInt(year) }),
        ...(vin !== undefined && { vin }),
        ...(licensePlate && { licensePlate }),
        ...(color && { color }),
        ...(mileage !== undefined && { mileage: mileage ? parseInt(mileage) : null }),
        ...(photos && { photos: JSON.stringify(photos) }),
        ...(vehicleType && (VEHICLE_TYPES as readonly string[]).includes(vehicleType) && { vehicleType }),
      },
    });

    res.json(vehicle);
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Failed to update vehicle.' });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.vehicle.findFirst({
      where: { id: param(req, 'id'), userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Vehicle not found.' });
      return;
    }

    await prisma.vehicle.delete({ where: { id: param(req, 'id') } });
    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle.' });
  }
});

export default router;
