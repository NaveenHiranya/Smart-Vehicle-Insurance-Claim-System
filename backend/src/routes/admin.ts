import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import { AuthRequest, VEHICLE_TYPES } from '../types/index.js';
import { recalculatePayout } from '../services/payoutService.js';
import { analyzeDamage } from '../services/damageAnalysisService.js';
import { scoreClaimFraud } from '../services/fraudScoringService.js';
import { reconcileEstimates } from '../services/reconciliationService.js';
import { createNotification, createNotificationForClaimOwner } from '../services/notificationService.js';

const router = Router();
router.use(adminAuthMiddleware);

const param = (req: AuthRequest, name: string): string => req.params[name] as string;

// Re-applies the insurance deduction to a vehicle's claims (valuation caps payouts)
async function syncVehiclePayouts(vehicleId: string): Promise<void> {
  const claims = await prisma.claim.findMany({ where: { vehicleId }, select: { id: true } });
  for (const c of claims) {
    await recalculatePayout(c.id);
  }
}

// GET /api/admin/stats
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [userCount, claimCounts, docCount, pendingDocs, pendingVehicles, openTickets] = await Promise.all([
      prisma.user.count({ where: { isAdmin: false } }),
      prisma.claim.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.document.count(),
      prisma.document.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.vehicle.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ]);
    const claimsByStatus = Object.fromEntries(claimCounts.map((c: { status: string; _count: { id: number } }) => [c.status, c._count.id]));
    res.json({ userCount, claimsByStatus, docCount, pendingDocs, pendingVehicles, openTickets });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET /api/admin/users — includes each user's vehicles so admins can inspect them under the Users tab
router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isAdmin: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, address: true, createdAt: true,
        nic: true, licenseType: true, annualFee: true, joinedAt: true,
        _count: { select: { vehicles: true, claims: true } },
        vehicles: {
          select: {
            id: true, make: true, model: true, year: true,
            licensePlate: true, color: true, vin: true,
            _count: { select: { claims: true } },
          },
        },
        // Latest policy first — drives the current-plan display and the Add Policy flow
        policies: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, policyNumber: true, coverageType: true,
            deductible: true, premiumAmount: true, coveragePercent: true,
            startDate: true, endDate: true,
            template: { select: { name: true } },
          },
        },
      },
    });
    res.json(users);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// PATCH /api/admin/users/:id — insurance company records an admin fills in
router.patch('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: param(req, 'id') } });
    if (!user || user.isAdmin) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const { phone, address, nic, licenseType, annualFee, joinedAt } = req.body;

    // Build the update payload from provided keys only — absent fields stay unchanged
    const data: Record<string, unknown> = {};
    if (phone !== undefined) data.phone = phone.trim() === '' ? null : phone.trim();
    if (address !== undefined) data.address = address.trim() === '' ? null : address.trim();
    if (nic !== undefined) data.nic = nic.trim() === '' ? null : nic.trim();
    if (licenseType !== undefined) data.licenseType = licenseType.trim() === '' ? null : licenseType.trim();
    if (annualFee !== undefined) {
      if (annualFee === null || annualFee === '') data.annualFee = null;
      else {
        const fee = Number(annualFee);
        if (Number.isNaN(fee) || fee < 0) {
          res.status(400).json({ error: 'Annual fee must be a non-negative number.' });
          return;
        }
        data.annualFee = fee;
      }
    }
    if (joinedAt !== undefined) {
      if (joinedAt === null || joinedAt === '') data.joinedAt = null;
      else {
        const date = new Date(joinedAt);
        if (Number.isNaN(date.getTime())) {
          res.status(400).json({ error: 'Invalid joined date.' });
          return;
        }
        data.joinedAt = date;
      }
    }

    const updated = await prisma.user.update({
      where: { id: param(req, 'id') },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, address: true, nic: true, licenseType: true,
        annualFee: true, joinedAt: true, createdAt: true,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('Admin user update error:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// DELETE /api/admin/users/:id — removes the user and (via cascade) their vehicles, claims and policies
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: param(req, 'id') } });
    if (!user || user.isAdmin) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    await prisma.user.delete({ where: { id: param(req, 'id') } });
    res.json({ message: 'User deleted.' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// GET /api/admin/vehicles — all vehicles with owner, claims count and insurance; ?user= scopes to one owner
router.get('/vehicles', async (req: AuthRequest, res: Response) => {
  try {
    const userFilter = req.query.user as string | undefined;
    const search = req.query.search as string | undefined;
    const verification = req.query.verification as string | undefined;
    const where: any = {};
    if (userFilter) where.userId = userFilter;
    if (verification && ['PENDING', 'VERIFIED', 'REJECTED'].includes(verification)) {
      where.verificationStatus = verification;
    }
    if (search) {
      where.OR = [
        { make: { contains: search } },
        { model: { contains: search } },
        { licensePlate: { contains: search } },
        { user: { firstName: { contains: search } } },
        { user: { lastName: { contains: search } } },
      ];
    }
    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { claims: true } },
        insurancePolicy: { include: { template: { select: { name: true } } } },
      },
    });
    res.json(vehicles);
  } catch (error) {
    console.error('Admin vehicles error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

// PATCH /api/admin/vehicles/:id/verify — the insurance/admin panel verifies (or rejects)
// the vehicle and its insurance policy; VERIFIED requires an attached policy
router.patch('/vehicles/:id/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes } = req.body;
    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
      res.status(400).json({ error: 'Status must be VERIFIED, REJECTED, or PENDING.' });
      return;
    }
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: param(req, 'id') },
      include: { insurancePolicy: { select: { id: true } } },
    });
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found.' });
      return;
    }
    if (status === 'VERIFIED' && !vehicle.insurancePolicy) {
      res.status(400).json({ error: 'Add an insurance policy to this vehicle before verifying it.' });
      return;
    }
    const updated = await prisma.vehicle.update({
      where: { id: param(req, 'id') },
      data: {
        verificationStatus: status,
        verifiedAt: status === 'VERIFIED' ? new Date() : null,
        ...(notes !== undefined && { verificationNotes: notes || null }),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        insurancePolicy: { include: { template: { select: { name: true } } } },
        _count: { select: { claims: true } },
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('Admin vehicle verification error:', error);
    res.status(500).json({ error: 'Failed to update verification.' });
  }
});

// POST /api/admin/vehicles/:id/policy — add or replace the vehicle's insurance policy.
// Values come from a built-in plan (templateId) or a fully custom entry; any change resets
// the vehicle to PENDING because the insurance info needs re-verification.
router.post('/vehicles/:id/policy', async (req: AuthRequest, res: Response) => {
  try {
    const { templateId, providerName, policyNumber, coverageType, deductible, premiumAmount, coveragePercent, startDate, endDate } = req.body;
    const vehicle = await prisma.vehicle.findUnique({ where: { id: param(req, 'id') } });
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found.' });
      return;
    }

    let data: {
      providerName: string;
      policyNumber: string;
      coverageType: string;
      deductible: number;
      premiumAmount: number;
      coveragePercent: number;
      templateId: string | null;
    };

    if (templateId) {
      const template = await prisma.policyTemplate.findFirst({
        where: { id: templateId, isActive: true },
      });
      if (!template) {
        res.status(404).json({ error: 'Policy plan not found.' });
        return;
      }
      data = {
        providerName: 'Flash Claim Insurance',
        policyNumber: `FC-${Date.now().toString(36).toUpperCase()}`,
        coverageType: template.coverageType,
        deductible: template.deductible,
        premiumAmount: template.annualFee,
        coveragePercent: template.coveragePercent,
        templateId: template.id,
      };
    } else {
      if (!providerName || !policyNumber || !coverageType || deductible === undefined || premiumAmount === undefined || !startDate || !endDate) {
        res.status(400).json({ error: 'Either choose a plan or provide all policy fields (provider, number, type, deductible, premium, start and end dates).' });
        return;
      }
      const ded = Number(deductible);
      const pct = coveragePercent !== undefined ? Number(coveragePercent) : 100;
      const fee = Number(premiumAmount);
      if (Number.isNaN(ded) || ded < 0) { res.status(400).json({ error: 'Deductible must be a non-negative number.' }); return; }
      if (Number.isNaN(pct) || pct <= 0 || pct > 100) { res.status(400).json({ error: 'Coverage % must be between 1 and 100.' }); return; }
      if (Number.isNaN(fee) || fee < 0) { res.status(400).json({ error: 'Premium must be a non-negative number.' }); return; }
      data = {
        providerName: String(providerName).trim(),
        policyNumber: String(policyNumber).trim(),
        coverageType: String(coverageType).trim(),
        deductible: ded,
        premiumAmount: fee,
        coveragePercent: pct,
        templateId: null,
      };
    }

    // One policy per vehicle — update in place keeps existing claim.policyId links stable
    const existing = await prisma.insurancePolicy.findFirst({ where: { vehicleId: vehicle.id } });
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    let policy;
    if (existing) {
      policy = await prisma.insurancePolicy.update({
        where: { id: existing.id },
        data: { ...data, ...(start && { startDate: start }), ...(end && { endDate: end }) },
      });
    } else {
      const s = start ?? new Date();
      const e = end ?? (() => { const d = new Date(s); d.setFullYear(d.getFullYear() + 1); return d; })();
      policy = await prisma.insurancePolicy.create({
        data: {
          userId: vehicle.userId,
          vehicleId: vehicle.id,
          startDate: s,
          endDate: e,
          ...data,
        },
      });
    }

    // Changed insurance info needs re-verification
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { verificationStatus: 'PENDING', verifiedAt: null },
    });

    // Re-apply the policy terms to this vehicle's claims
    const claims = await prisma.claim.findMany({ where: { vehicleId: vehicle.id }, select: { id: true } });
    for (const c of claims) {
      await recalculatePayout(c.id);
    }

    res.status(existing ? 200 : 201).json(policy);
  } catch (error) {
    console.error('Admin vehicle policy error:', error);
    res.status(500).json({ error: 'Failed to save policy.' });
  }
});

// POST /api/admin/vehicles — register a vehicle on behalf of a user
router.post('/vehicles', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, make, model, year, vin, licensePlate, color, mileage, vehicleType } = req.body;
    if (!userId || !make || !model || !year || !licensePlate || !color) {
      res.status(400).json({ error: 'Owner, make, model, year, license plate, and color are required.' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isAdmin) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const parsedYear = parseInt(year);
    if (Number.isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
      res.status(400).json({ error: 'Year must be a valid number.' });
      return;
    }
    const vehicle = await prisma.vehicle.create({
      data: {
        userId,
        make: String(make).trim(),
        model: String(model).trim(),
        year: parsedYear,
        vin: vin ? String(vin).trim() : null,
        licensePlate: String(licensePlate).trim(),
        color: String(color).trim(),
        mileage: mileage ? parseInt(mileage) : null,
        photos: '[]',
        vehicleType: (VEHICLE_TYPES as readonly string[]).includes(vehicleType) ? vehicleType : 'CAR',
      },
    });
    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Admin create vehicle error:', error);
    res.status(500).json({ error: 'Failed to create vehicle.' });
  }
});

// PATCH /api/admin/vehicles/:id — correct vehicle details (make, model, year,
// chassis/VIN, plate, color, mileage, class); payouts re-synced because the
// vehicle class scales repair pricing
router.patch('/vehicles/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { make, model, year, vin, licensePlate, color, mileage, vehicleType } = req.body;

    const existing = await prisma.vehicle.findUnique({ where: { id: param(req, 'id') } });
    if (!existing) {
      res.status(404).json({ error: 'Vehicle not found.' });
      return;
    }

    const data: Record<string, unknown> = {};
    if (make !== undefined) {
      if (!String(make).trim()) {
        res.status(400).json({ error: 'Make cannot be empty.' });
        return;
      }
      data.make = String(make).trim();
    }
    if (model !== undefined) {
      if (!String(model).trim()) {
        res.status(400).json({ error: 'Model cannot be empty.' });
        return;
      }
      data.model = String(model).trim();
    }
    if (licensePlate !== undefined) {
      if (!String(licensePlate).trim()) {
        res.status(400).json({ error: 'License plate cannot be empty.' });
        return;
      }
      data.licensePlate = String(licensePlate).trim();
    }
    if (color !== undefined) {
      if (!String(color).trim()) {
        res.status(400).json({ error: 'Color cannot be empty.' });
        return;
      }
      data.color = String(color).trim();
    }
    if (year !== undefined) {
      const parsedYear = parseInt(year);
      if (Number.isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
        res.status(400).json({ error: 'Year must be a valid number.' });
        return;
      }
      data.year = parsedYear;
    }
    if (vin !== undefined) data.vin = String(vin).trim() || null;
    if (mileage !== undefined) data.mileage = mileage === '' || mileage === null ? null : parseInt(mileage);
    if (vehicleType !== undefined && (VEHICLE_TYPES as readonly string[]).includes(vehicleType)) data.vehicleType = vehicleType;

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'Nothing to update.' });
      return;
    }

    const updated = await prisma.vehicle.update({ where: { id: param(req, 'id') }, data });
    await syncVehiclePayouts(param(req, 'id'));
    res.json(updated);
  } catch (error) {
    console.error('Admin vehicle edit error:', error);
    res.status(500).json({ error: 'Failed to update vehicle.' });
  }
});

// PATCH /api/admin/vehicles/:id/valuation — insurance company sets the vehicle's value (caps payouts)
router.patch('/vehicles/:id/valuation', async (req: AuthRequest, res: Response) => {
  try {
    const { valuation } = req.body;
    const vehicle = await prisma.vehicle.findUnique({ where: { id: param(req, 'id') } });
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found.' });
      return;
    }
    if (valuation === null || valuation === '') {
      const updated = await prisma.vehicle.update({
        where: { id: param(req, 'id') },
        data: { valuation: null },
      });
      await syncVehiclePayouts(param(req, 'id'));
      res.json(updated);
      return;
    }
    const value = Number(valuation);
    if (Number.isNaN(value) || value < 0) {
      res.status(400).json({ error: 'Valuation must be a non-negative number.' });
      return;
    }
    const updated = await prisma.vehicle.update({
      where: { id: param(req, 'id') },
      data: { valuation: value },
    });
    await syncVehiclePayouts(param(req, 'id'));
    res.json(updated);
  } catch (error) {
    console.error('Admin vehicle valuation error:', error);
    res.status(500).json({ error: 'Failed to update valuation.' });
  }
});

// ---------- Built-in policy plans (per insurance type) ----------

// GET /api/admin/policy-templates
router.get('/policy-templates', async (_req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.policyTemplate.findMany({
      orderBy: [{ isActive: 'desc' }, { coverageType: 'asc' }, { annualFee: 'asc' }],
      include: { _count: { select: { policies: true } } },
    });
    res.json(templates);
  } catch (error) {
    console.error('Admin policy templates error:', error);
    res.status(500).json({ error: 'Failed to fetch policy plans.' });
  }
});

// POST /api/admin/policy-templates
router.post('/policy-templates', async (req: AuthRequest, res: Response) => {
  try {
    const { name, coverageType, description, deductible, coveragePercent, annualFee, isActive } = req.body;
    if (!name || !coverageType || deductible === undefined || coveragePercent === undefined || annualFee === undefined) {
      res.status(400).json({ error: 'Name, insurance type, deductible, coverage %, and annual fee are required.' });
      return;
    }
    const ded = Number(deductible);
    const pct = Number(coveragePercent);
    const fee = Number(annualFee);
    if (Number.isNaN(ded) || ded < 0) { res.status(400).json({ error: 'Deductible must be a non-negative number.' }); return; }
    if (Number.isNaN(pct) || pct <= 0 || pct > 100) { res.status(400).json({ error: 'Coverage % must be between 1 and 100.' }); return; }
    if (Number.isNaN(fee) || fee < 0) { res.status(400).json({ error: 'Annual fee must be a non-negative number.' }); return; }

    const template = await prisma.policyTemplate.create({
      data: {
        name: String(name).trim(),
        coverageType: String(coverageType).trim(),
        description: description ? String(description).trim() : null,
        deductible: ded,
        coveragePercent: pct,
        annualFee: fee,
        isActive: isActive === undefined ? true : Boolean(isActive),
      },
    });
    res.status(201).json(template);
  } catch (error) {
    console.error('Admin create policy template error:', error);
    res.status(500).json({ error: 'Failed to create policy plan.' });
  }
});

// PATCH /api/admin/policy-templates/:id
router.patch('/policy-templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.policyTemplate.findUnique({ where: { id: param(req, 'id') } });
    if (!existing) {
      res.status(404).json({ error: 'Policy plan not found.' });
      return;
    }
    const { name, coverageType, description, deductible, coveragePercent, annualFee, isActive } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (coverageType !== undefined) data.coverageType = String(coverageType).trim();
    if (description !== undefined) data.description = description === null || description === '' ? null : String(description).trim();
    if (deductible !== undefined) {
      const ded = Number(deductible);
      if (Number.isNaN(ded) || ded < 0) { res.status(400).json({ error: 'Deductible must be a non-negative number.' }); return; }
      data.deductible = ded;
    }
    if (coveragePercent !== undefined) {
      const pct = Number(coveragePercent);
      if (Number.isNaN(pct) || pct <= 0 || pct > 100) { res.status(400).json({ error: 'Coverage % must be between 1 and 100.' }); return; }
      data.coveragePercent = pct;
    }
    if (annualFee !== undefined) {
      const fee = Number(annualFee);
      if (Number.isNaN(fee) || fee < 0) { res.status(400).json({ error: 'Annual fee must be a non-negative number.' }); return; }
      data.annualFee = fee;
    }
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.policyTemplate.update({
      where: { id: param(req, 'id') },
      data,
    });
    res.json(updated);
  } catch (error) {
    console.error('Admin update policy template error:', error);
    res.status(500).json({ error: 'Failed to update policy plan.' });
  }
});

// DELETE /api/admin/policy-templates/:id — policies created from it keep their copied values
router.delete('/policy-templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.policyTemplate.delete({ where: { id: param(req, 'id') } });
    res.json({ message: 'Policy plan deleted.' });
  } catch (error) {
    console.error('Admin delete policy template error:', error);
    res.status(500).json({ error: 'Failed to delete policy plan.' });
  }
});

// GET /api/admin/claims — supports comma-separated status lists (e.g. ?status=SUBMITTED,UNDER_REVIEW)
router.get('/claims', async (req: AuthRequest, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const userFilter = req.query.user as string | undefined;
    const vehicleFilter = req.query.vehicle as string | undefined;
    const where: any = {};
    if (statusFilter) {
      const statuses = statusFilter.split(',').map((s) => s.trim()).filter(Boolean);
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    // Scoped views: claims of one user (?user=) or one vehicle (?vehicle=)
    if (userFilter) where.userId = userFilter;
    if (vehicleFilter) where.vehicleId = vehicleFilter;
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

// PATCH /api/admin/claims/:id/final-value — the insurer sets the final claimable amount for
// a claim; once set it overrides the computed estimate shown to the customer
router.patch('/claims/:id/final-value', async (req: AuthRequest, res: Response) => {
  try {
    const { finalClaimableValue } = req.body;
    const claimId = param(req, 'id');
    const claim = await prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    // null / empty string clears the final value so the computed estimate applies again
    if (finalClaimableValue === null || finalClaimableValue === '') {
      const updated = await prisma.claim.update({
        where: { id: claimId },
        data: { finalClaimableValue: null, finalValueSetAt: null },
      });
      try {
        await createNotificationForClaimOwner(
          claimId, 'FINAL_VALUE', 'Claimable value cleared',
          'Your insurer has cleared the final claimable value — the original estimate will now be shown.'
        );
      } catch (err) {
        console.error('Final-value notification failed:', err);
      }
      res.json(updated);
      return;
    }

    const value = Number(finalClaimableValue);
    if (Number.isNaN(value) || value < 0) {
      res.status(400).json({ error: 'Final claimable value must be a non-negative number.' });
      return;
    }

    const updated = await prisma.claim.update({
      where: { id: claimId },
      data: { finalClaimableValue: Math.round(value), finalValueSetAt: new Date() },
    });

    try {
      const fmt = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });
      await createNotificationForClaimOwner(
        claimId, 'FINAL_VALUE', 'Claimable value updated',
        `Your insurer has set the final claimable value to ${fmt.format(value)}.`
      );
    } catch (err) {
      console.error('Final-value notification failed:', err);
    }
    res.json(updated);
  } catch (error) {
    console.error('Admin final claimable value error:', error);
    res.status(500).json({ error: 'Failed to set final claimable value.' });
  }
});

// POST /api/admin/claims/:id/analyze — re-run the AI damage analysis
router.post('/claims/:id/analyze', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findUnique({ where: { id: param(req, 'id') } });
    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    const assessment = await analyzeDamage(param(req, 'id'));
    res.json(assessment);
  } catch (error) {
    console.error('Admin analyze damage error:', error);
    // Same mapping as the user-facing analyze route: precondition problems are
    // actionable 400s, everything else is an AI-side hiccup worth retrying.
    const message = error instanceof Error ? error.message : '';
    if (message.includes('images')) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(502).json({ error: 'AI damage analysis failed. Please try again in a moment.' });
  }
});

// POST /api/admin/claims/:id/fraud-score — (re)calculate the fraud score for a claim
router.post('/claims/:id/fraud-score', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findUnique({ where: { id: param(req, 'id') } });
    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }
    const result = await scoreClaimFraud(param(req, 'id'));
    res.json(result);
  } catch (error) {
    console.error('Admin fraud-score error:', error);
    res.status(502).json({ error: 'Fraud scoring failed. Please try again.' });
  }
});

// POST /api/admin/claims/:id/reconcile — (re)run garage vs AI estimate reconciliation
router.post('/claims/:id/reconcile', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: param(req, 'id') },
      select: { repairEstimate: true, garageEstimate: true },
    });
    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }
    if (!claim.repairEstimate) {
      res.status(400).json({ error: 'AI repair estimate must exist first.' });
      return;
    }
    if (!claim.garageEstimate) {
      res.status(400).json({ error: 'Garage estimate has not been submitted yet.' });
      return;
    }
    const result = await reconcileEstimates(param(req, 'id'));
    res.json(result);
  } catch (error) {
    console.error('Admin reconcile error:', error);
    res.status(502).json({ error: 'Reconciliation failed. Please try again.' });
  }
});

// POST /api/admin/notifications — admin sends a message to a user (optionally tied to a claim)
router.post('/notifications', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, claimId, title, message } = req.body;
    if (!userId || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'userId and message are required.' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (claimId) {
      const claim = await prisma.claim.findUnique({ where: { id: claimId, userId } });
      if (!claim) {
        res.status(404).json({ error: 'Claim not found for this user.' });
        return;
      }
    }
    await createNotification({
      userId,
      claimId: claimId ?? null,
      type: 'ADMIN_MESSAGE',
      title: typeof title === 'string' && title.trim() ? title.trim() : 'Message from admin',
      message: message.trim(),
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification.' });
  }
});

// DELETE /api/admin/claims/:id — removes the claim, its AI results and uploaded files
router.delete('/claims/:id', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: param(req, 'id') },
      include: { images: true, documents: true },
    });
    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    // Uploaded files live outside the DB — remove them from disk too
    // (all related rows cascade via onDelete: Cascade)
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    for (const file of [...claim.images, ...claim.documents]) {
      const filePath = path.resolve(uploadDir, file.filePath.replace(/^\/uploads\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.claim.delete({ where: { id: claim.id } });
    res.json({ message: 'Claim deleted.' });
  } catch (error) {
    console.error('Admin delete claim error:', error);
    res.status(500).json({ error: 'Failed to delete claim.' });
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

    // Notify the policyholder which doc was rejected and why
    try {
      const fullDoc = await prisma.document.findUnique({
        where: { id: param(req, 'id') },
        select: { claimId: true, type: true, claim: { select: { userId: true } } },
      });
      if (fullDoc?.claim) {
        const docLabel = fullDoc.type.replace(/_/g, ' ').toLowerCase();
        await createNotification(
          {
            userId: fullDoc.claim.userId,
            claimId: fullDoc.claimId,
            type: 'DOC_REMINDER',
            title: 'Document rejected',
            message: `Your ${docLabel} was rejected: ${reason ? String(reason).slice(0, 200) : 'please review and re-upload.'}`,
          }
        );
      }
    } catch (err) {
      console.error('Doc reject notification failed:', err);
    }

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

// ---------- SUPPORT TICKETS (filed through the AI assistant chat) ----------

// GET /api/admin/support-tickets — all tickets with reporter and claim context
router.get('/support-tickets', async (_req: AuthRequest, res: Response) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        claim: {
          select: {
            id: true,
            status: true,
            vehicle: { select: { make: true, model: true, year: true, licensePlate: true } },
          },
        },
      },
    });
    res.json(tickets);
  } catch (error) {
    console.error('Admin support tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch support tickets.' });
  }
});

// PATCH /api/admin/support-tickets/:id — reply and/or change status
router.patch('/support-tickets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { status, adminReply } = req.body;
    const ticketId = param(req, 'id');
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const data: { status?: string; adminReply?: string } = {};
    if (typeof status === 'string' && validStatuses.includes(status)) data.status = status;
    if (typeof adminReply === 'string' && adminReply.trim()) data.adminReply = adminReply.trim().slice(0, 1000);
    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'Nothing to update.' });
      return;
    }

    const updated = await prisma.supportTicket.update({ where: { id: ticketId }, data });

    // Let the user know their report was answered
    if (data.adminReply || data.status) {
      await createNotification({
        userId: ticket.userId,
        claimId: ticket.claimId,
        type: 'ADMIN_MESSAGE',
        title: `Support ticket: ${ticket.subject}`,
        message: data.adminReply
          ? data.adminReply
          : `Your support ticket status has been updated to ${data.status}.`,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Admin support ticket update error:', error);
    res.status(500).json({ error: 'Failed to update ticket.' });
  }
});

export default router;
