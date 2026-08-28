import prisma from '../utils/prisma.js';
import { RepairEstimateItem, RepairEstimateResult, DamageItem } from '../types/index.js';

// Repair cost lookup table (typical ranges in USD)
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
    parts: { default: [50, 300], glass: [200, 800], SEVERE: [300, 1200] },
    laborHours: { default: [1, 3], SEVERE: [3, 6] },
  },
  broken_light: {
    parts: { default: [80, 400], headlight: [150, 800], taillight: [100, 500] },
    laborHours: { default: [0.5, 2] },
  },
  bumper_damage: {
    parts: { default: [150, 600], SEVERE: [400, 1200] },
    laborHours: { default: [2, 5], SEVERE: [5, 10] },
  },
  glass_damage: {
    parts: { default: [150, 500], windshield: [200, 800], SEVERE: [400, 1200] },
    laborHours: { default: [1, 3], SEVERE: [3, 5] },
  },
  panel_deformation: {
    parts: { default: [200, 800], SEVERE: [600, 2000] },
    laborHours: { default: [3, 8], SEVERE: [8, 16] },
  },
  wheel_damage: {
    parts: { default: [150, 600], SEVERE: [400, 1500] },
    laborHours: { default: [1, 3], SEVERE: [3, 6] },
  },
  structural_damage: {
    parts: { default: [500, 2000], SEVERE: [1000, 5000] },
    laborHours: { default: [8, 20], SEVERE: [16, 40] },
  },
  other: {
    parts: { default: [50, 300] },
    laborHours: { default: [1, 4] },
  },
};

const LABOR_RATES: Record<string, number> = {
  MINOR: 75,
  MODERATE: 95,
  SEVERE: 125,
};

const PAINT_MATERIALS: Record<string, number> = {
  MINOR: 50,
  MODERATE: 150,
  SEVERE: 350,
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
  const laborRate = LABOR_RATES[severity] || 95;
  const paintMaterials = PAINT_MATERIALS[severity] || 100;

  const partCost = getMidpoint(partsRange);
  const laborHours = parseFloat((getMidpoint(laborRange) / 2).toFixed(1));
  const laborCost = Math.round(laborHours * laborRate);
  const subtotal = partCost + laborCost + paintMaterials;

  const partName = damage.affectedParts.length > 0
    ? damage.affectedParts.join(', ')
    : `${damage.type.replace(/_/g, ' ')} repair parts`;

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
      vehicle: true,
      damageAssessment: true,
      policy: true,
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

  // Calculate insurance payout if policy is linked
  if (claim.policy) {
    const deductible = claim.policy.deductible;
    const coveredAmount = Math.max(0, totalCost - deductible);
    const estimatedPayout = coveredAmount;

    const existingPayout = await prisma.insurancePayout.findUnique({
      where: { claimId },
    });

    const payoutData = {
      deductible,
      coveredAmount,
      estimatedPayout,
      notes: `Based on ${damages.length} damage item(s). Deductible of $${deductible} applied.`,
    };

    if (existingPayout) {
      await prisma.insurancePayout.update({
        where: { claimId },
        data: payoutData,
      });
    } else {
      await prisma.insurancePayout.create({
        data: {
          claimId,
          repairEstimateId: estimate.id,
          ...payoutData,
        },
      });
    }
  }

  return {
    items,
    totalPartsCost,
    totalLaborCost,
    totalCost,
    estimatedDays,
  };
}
