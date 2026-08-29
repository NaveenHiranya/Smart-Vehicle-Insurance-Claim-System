import prisma from '../utils/prisma.js';
import { RepairEstimateItem, RepairEstimateResult, DamageItem } from '../types/index.js';
import { recalculatePayout } from './payoutService.js';

// Repair cost lookup table (typical ranges in LKR – Sri Lankan Rupees)
// Based on Sri Lankan vehicle repair market rates (garage & body shop prices)
const REPAIR_COSTS: Record<string, { parts: Record<string, [number, number]>; laborHours: Record<string, [number, number]> }> = {
  dent: {
    parts: { default: [0, 0] },
    laborHours: { default: [1, 4], SEVERE: [4, 8] },
  },
  scratch: {
    parts: { default: [0, 0] },
    laborHours: { default: [0.5, 2], MODERATE: [2, 4], SEVERE: [4, 8] },
  },
  crack: {
    parts: { default: [15000, 90000], glass: [60000, 240000], SEVERE: [90000, 360000] },
    laborHours: { default: [1, 3], SEVERE: [3, 6] },
  },
  broken_light: {
    parts: { default: [8000, 45000], headlight: [15000, 85000], taillight: [10000, 55000] },
    laborHours: { default: [0.5, 2] },
  },
  bumper_damage: {
    parts: { default: [25000, 120000], SEVERE: [80000, 350000] },
    laborHours: { default: [2, 5], SEVERE: [5, 10] },
  },
  glass_damage: {
    parts: { default: [20000, 100000], windshield: [35000, 180000], SEVERE: [80000, 350000] },
    laborHours: { default: [1, 3], SEVERE: [3, 5] },
  },
  panel_deformation: {
    parts: { default: [40000, 180000], SEVERE: [120000, 550000] },
    laborHours: { default: [3, 8], SEVERE: [8, 16] },
  },
  wheel_damage: {
    parts: { default: [20000, 120000], SEVERE: [80000, 400000] },
    laborHours: { default: [1, 3], SEVERE: [3, 6] },
  },
  structural_damage: {
    parts: { default: [100000, 500000], SEVERE: [250000, 1200000] },
    laborHours: { default: [8, 20], SEVERE: [16, 40] },
  },
  other: {
    parts: { default: [10000, 60000] },
    laborHours: { default: [1, 4] },
  },
};

const LABOR_RATES: Record<string, number> = {
  MINOR: 2500,
  MODERATE: 3500,
  SEVERE: 5000,
};

const PAINT_MATERIALS: Record<string, number> = {
  MINOR: 8000,
  MODERATE: 25000,
  SEVERE: 60000,
};

function getMidpoint(range: [number, number]): number {
  return Math.round((range[0] + range[1]) / 2);
}

function getCostRange(
  category: Record<string, [number, number]>,
  severity: string,
  damageType: string
): [number, number] {
  if (category[severity]) return category[severity];
  if (category[damageType]) return category[damageType];
  return category['default'] || [0, 100];
}

function calculateItem(damage: DamageItem): RepairEstimateItem {
  const config = REPAIR_COSTS[damage.type] || REPAIR_COSTS['other'];
  const severity = damage.severity;

  const partsRange = getCostRange(config.parts, severity, damage.type);
  const laborRange = getCostRange(config.laborHours, severity, damage.type);
  // Severity is normalized upstream, but keep a sane rate if an unknown value sneaks in
  const laborRate = LABOR_RATES[severity] || LABOR_RATES.MODERATE;
  const paintMaterials = PAINT_MATERIALS[severity] || PAINT_MATERIALS.MODERATE;

  const partCost = getMidpoint(partsRange);
  const laborHours = parseFloat((getMidpoint(laborRange) / 2).toFixed(1));
  const laborCost = Math.round(laborHours * laborRate);
  const subtotal = partCost + laborCost + paintMaterials;

  // affectedParts is optional (the AI may omit it to save tokens) — fall back to location + type
  const partName = damage.affectedParts && damage.affectedParts.length > 0
    ? damage.affectedParts.join(', ')
    : `${damage.location ? `${damage.location} ` : ''}${damage.type.replace(/_/g, ' ')} parts`;

  return {
    damageType: damage.type,
    partName,
    partCost,
    laborHours,
    laborRate,
    laborCost,
    paintMaterials,
    subtotal,
  };
}

export async function generateRepairEstimate(claimId: string): Promise<RepairEstimateResult> {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      damageAssessment: true,
    },
  });

  if (!claim || !claim.damageAssessment) {
    throw new Error('Claim or damage assessment not found');
  }

  const damages = claim.damageAssessment.damages as unknown as DamageItem[];

  // Calculate itemized estimates
  const items = damages.map(calculateItem);

  const totalPartsCost = items.reduce((sum, item) => sum + item.partCost, 0);
  const totalLaborCost = items.reduce((sum, item) => sum + item.laborCost + item.paintMaterials, 0);
  const totalCost = totalPartsCost + totalLaborCost;
  const totalLaborHours = items.reduce((sum, item) => sum + item.laborHours, 0);
  const estimatedDays = Math.max(1, Math.ceil(totalLaborHours / 8));

  // Save or update repair estimate
  const existingEstimate = await prisma.repairEstimate.findUnique({
    where: { claimId },
  });

  const estimateData = {
    items: items as any,
    totalPartsCost,
    totalLaborCost,
    totalCost,
    estimatedDays,
  };

  let estimate;
  if (existingEstimate) {
    estimate = await prisma.repairEstimate.update({
      where: { claimId },
      data: estimateData,
    });
  } else {
    estimate = await prisma.repairEstimate.create({
      data: {
        claimId,
        damageAssessmentId: claim.damageAssessment.id,
        ...estimateData,
      },
    });
  }

  // Apply the insurance deduction to this estimate (payout = estimate − deductible, × coverage %, capped at valuation)
  await recalculatePayout(claimId);

  return {
    items,
    totalPartsCost,
    totalLaborCost,
    totalCost,
    estimatedDays,
  };
}
