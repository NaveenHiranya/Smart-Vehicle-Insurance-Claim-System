import prisma from '../utils/prisma.js';
import { RepairEstimateItem, RepairEstimateResult, DamageItem, VehicleType } from '../types/index.js';
import { recalculatePayout } from './payoutService.js';

// Pricing architecture (Sri Lankan market, LKR):
// 1. One base price table calibrated for a typical economy car.
// 2. Vehicle-class factors scale parts / labor / paint from that base —
//    one table serves bikes through buses.
// 3. A few type-specific part overrides where a plain multiplier is badly
//    wrong (three-wheeler canopy, bike fairing, lorry cargo body...).

const VEHICLE_TYPE_FACTORS: Record<VehicleType, { parts: number; labor: number; paint: number }> = {
  MOTORCYCLE:    { parts: 0.45, labor: 0.6,  paint: 0.4 },
  THREE_WHEELER: { parts: 0.55, labor: 0.7,  paint: 0.5 },
  CAR:           { parts: 1.0,  labor: 1.0,  paint: 1.0 },
  VAN:           { parts: 1.15, labor: 1.1,  paint: 1.2 },
  SUV_PICKUP:    { parts: 1.3,  labor: 1.15, paint: 1.3 },
  LORRY_TRUCK:   { parts: 1.8,  labor: 1.5,  paint: 1.6 },
  BUS:           { parts: 2.0,  labor: 1.6,  paint: 1.8 },
  TRACTOR:       { parts: 1.5,  labor: 1.3,  paint: 0.8 },
  OTHER:         { parts: 1.0,  labor: 1.0,  paint: 1.0 },
};

// Premium makes carry higher part prices in the local market
const PREMIUM_MAKES = [
  'bmw', 'mercedes', 'audi', 'land rover', 'range rover', 'jaguar',
  'porsche', 'volvo', 'lexus', 'tesla', 'jeep', 'mini',
];
const PREMIUM_MAKE_FACTOR = 1.6;

// Base-class part catalog (economy car, LKR). Matched by keyword against the
// AI's affectedParts / location / damage type — most specific families first
// so "front bumper" wins over the generic "bumper".
const PART_PRICES: Array<{ family: string; keywords: string[]; range: [number, number] }> = [
  { family: 'headlight',      keywords: ['headlight', 'head lamp'], range: [22000, 95000] },
  { family: 'taillight',      keywords: ['taillight', 'tail light', 'rear light'], range: [15000, 60000] },
  { family: 'fog light',      keywords: ['fog light', 'fog lamp'], range: [8000, 35000] },
  { family: 'windshield',     keywords: ['windshield', 'windscreen', 'front glass'], range: [35000, 185000] },
  { family: 'rear glass',     keywords: ['rear glass', 'back glass', 'rear window'], range: [25000, 120000] },
  { family: 'side mirror',    keywords: ['side mirror', 'wing mirror', 'mirror'], range: [9000, 45000] },
  { family: 'front bumper',   keywords: ['front bumper'], range: [28000, 135000] },
  { family: 'rear bumper',    keywords: ['rear bumper'], range: [26000, 125000] },
  { family: 'bumper',         keywords: ['bumper'], range: [27000, 130000] },
  { family: 'grille',         keywords: ['grille', 'grill'], range: [12000, 65000] },
  { family: 'hood',           keywords: ['hood', 'bonnet'], range: [35000, 150000] },
  { family: 'door',           keywords: ['door'], range: [38000, 165000] },
  { family: 'fender',         keywords: ['fender', 'wing panel'], range: [24000, 110000] },
  { family: 'quarter panel',  keywords: ['quarter panel'], range: [40000, 175000] },
  { family: 'roof',           keywords: ['roof', 'canopy'], range: [45000, 200000] },
  { family: 'trunk lid',      keywords: ['trunk', 'boot lid', 'tailgate'], range: [36000, 155000] },
  { family: 'side skirt',     keywords: ['running board', 'side skirt'], range: [12000, 55000] },
  { family: 'radiator',       keywords: ['radiator'], range: [28000, 95000] },
  { family: 'condenser',      keywords: ['condenser', 'a/c', 'ac condenser'], range: [25000, 85000] },
  { family: 'wheel',          keywords: ['tyre', 'tire', 'wheel', 'rim', 'alloy'], range: [18000, 95000] },
  { family: 'exhaust',        keywords: ['exhaust', 'muffler', 'silencer'], range: [12000, 65000] },
  { family: 'seat',           keywords: ['seat', 'interior'], range: [15000, 90000] },
];

// Type-specific part prices that REPLACE the scaled base price — only where a
// multiplier would be badly wrong. Checked before the base catalog.
const TYPE_PART_OVERRIDES: Array<{ type: VehicleType; keywords: string[]; range: [number, number] }> = [
  { type: 'THREE_WHEELER', keywords: ['canopy', 'front cabin', 'hood'], range: [25000, 70000] },
  { type: 'MOTORCYCLE',    keywords: ['fairing'], range: [12000, 55000] },
  { type: 'MOTORCYCLE',    keywords: ['handlebar', 'handle bar'], range: [6000, 28000] },
  { type: 'LORRY_TRUCK',   keywords: ['cargo body', 'cargo bed', 'deck body'], range: [150000, 600000] },
  { type: 'LORRY_TRUCK',   keywords: ['cab'], range: [120000, 450000] },
  { type: 'BUS',           keywords: ['body panel', 'panel'], range: [80000, 350000] },
  { type: 'TRACTOR',       keywords: ['trailer'], range: [80000, 400000] },
];

// Fallback part ranges per damage type when no specific part matched (base class)
const DAMAGE_PART_FALLBACKS: Record<string, Record<string, [number, number]>> = {
  dent:              { default: [0, 0] },
  scratch:           { default: [0, 0] },
  crack:             { default: [18000, 95000], SEVERE: [90000, 350000] },
  broken_light:      { default: [15000, 80000] },
  bumper_damage:     { default: [28000, 135000], SEVERE: [80000, 320000] },
  glass_damage:      { default: [30000, 150000], SEVERE: [80000, 320000] },
  panel_deformation: { default: [38000, 170000], SEVERE: [110000, 500000] },
  wheel_damage:      { default: [18000, 95000], SEVERE: [60000, 260000] },
  structural_damage: { default: [100000, 480000], SEVERE: [240000, 1100000] },
  other:             { default: [10000, 65000] },
};

// Labor hours per damage type & severity (base class)
const LABOR_HOURS: Record<string, Record<string, [number, number]>> = {
  dent:              { default: [1.5, 4], SEVERE: [4, 8] },
  scratch:           { default: [0.5, 2], MODERATE: [2, 4], SEVERE: [4, 8] },
  crack:             { default: [1, 3], SEVERE: [3, 6] },
  broken_light:      { default: [0.5, 1.5] },
  bumper_damage:     { default: [2, 5], SEVERE: [5, 9] },
  glass_damage:      { default: [1, 3], SEVERE: [3, 5] },
  panel_deformation: { default: [3, 8], SEVERE: [8, 15] },
  wheel_damage:      { default: [0.5, 2], SEVERE: [2, 4] },
  structural_damage: { default: [8, 20], SEVERE: [16, 36] },
  other:             { default: [1, 4] },
};

const LABOR_RATES: Record<string, number> = { MINOR: 2500, MODERATE: 3500, SEVERE: 5000 };

// Paint & materials only apply to body-panel damage — not lights, glass, wheels
const PAINT_MATERIALS: Record<string, number> = { MINOR: 9000, MODERATE: 22000, SEVERE: 52000 };
const PAINT_DAMAGE_TYPES = new Set(['dent', 'scratch', 'bumper_damage', 'panel_deformation', 'crack']);

const mid = (r: [number, number]) => (r[0] + r[1]) / 2;
const round100 = (n: number) => Math.round(n / 100) * 100;

function severityRange(table: Record<string, [number, number]>, severity: string): [number, number] {
  return table[severity] ?? table.default ?? [0, 0];
}

interface MatchedPart {
  keyword: string;
  range: [number, number];
}

/**
 * Match part prices from everything the AI said about the damaged area
 * (affectedParts + location + damage type). Type-specific overrides win over
 * the base catalog; overlapping keyword families collapse to the most specific
 * one ("front bumper" beats "bumper") while distinct parts genuinely sum.
 */
function matchPartPrices(damage: DamageItem, vehicleType: VehicleType): MatchedPart[] {
  const haystack = [
    ...(damage.affectedParts ?? []),
    damage.location ?? '',
    damage.type.replace(/_/g, ' '),
  ].join(' ').toLowerCase();

  const candidates: Array<MatchedPart & { specific: boolean }> = [];

  for (const o of TYPE_PART_OVERRIDES) {
    if (o.type !== vehicleType) continue;
    const keyword = o.keywords.find((k) => haystack.includes(k));
    if (keyword) candidates.push({ keyword, range: o.range, specific: true });
  }
  for (const p of PART_PRICES) {
    const keyword = p.keywords.find((k) => haystack.includes(k));
    if (keyword) candidates.push({ keyword, range: p.range, specific: false });
  }

  // Type overrides replace the base price for the same part, and overlapping
  // keyword families collapse to the longest (most specific) keyword
  const sorted = candidates.sort((a, b) => b.keyword.length - a.keyword.length);
  const accepted: MatchedPart[] = [];
  for (const m of sorted) {
    const overlaps = accepted.some((a) => a.keyword.includes(m.keyword) || m.keyword.includes(a.keyword));
    if (!overlaps) accepted.push({ keyword: m.keyword, range: m.range });
  }
  return accepted;
}

interface PricingContext {
  vehicleType: VehicleType;
  factors: { parts: number; labor: number; paint: number };
  makeFactor: number;
}

function calculateItem(damage: DamageItem, ctx: PricingContext): RepairEstimateItem {
  const severity = damage.severity;

  // Parts: type overrides and specific matched parts sum; otherwise the damage-type fallback
  const matched = matchPartPrices(damage, ctx.vehicleType);
  const fallbackTable = DAMAGE_PART_FALLBACKS[damage.type] || DAMAGE_PART_FALLBACKS.other;
  const basePartCost =
    matched.length > 0
      ? matched.reduce((sum, m) => sum + mid(m.range), 0)
      : mid(severityRange(fallbackTable, severity));

  // Labor: real hours from the table
  const hoursTable = LABOR_HOURS[damage.type] || LABOR_HOURS.other;
  const baseLaborHours = mid(severityRange(hoursTable, severity));

  const laborRate = LABOR_RATES[severity] ?? LABOR_RATES.MODERATE;
  const basePaint = PAINT_DAMAGE_TYPES.has(damage.type)
    ? (PAINT_MATERIALS[severity] ?? PAINT_MATERIALS.MODERATE)
    : 0;

  // Scale by vehicle class and brand tier
  const partCost = round100(basePartCost * ctx.factors.parts * ctx.makeFactor);
  const laborHours = Math.max(0.5, Math.round(baseLaborHours * ctx.factors.labor * 2) / 2);
  const laborCost = round100(laborHours * laborRate);
  const paintMaterials = round100(basePaint * ctx.factors.paint);

  const partName = damage.affectedParts && damage.affectedParts.length > 0
    ? damage.affectedParts.join(', ')
    : `${damage.location ? `${damage.location} ` : ''}${damage.type.replace(/_/g, ' ')}`;

  return {
    damageType: damage.type,
    partName,
    partCost,
    laborHours,
    laborRate,
    laborCost,
    paintMaterials,
    subtotal: partCost + laborCost + paintMaterials,
  };
}

export async function generateRepairEstimate(claimId: string): Promise<RepairEstimateResult> {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      damageAssessment: true,
      vehicle: true,
    },
  });

  if (!claim || !claim.damageAssessment) {
    throw new Error('Claim or damage assessment not found');
  }

  // Vehicle class drives the pricing scale; premium makes uplift parts
  const vehicleType = (claim.vehicle?.vehicleType ?? 'CAR') as VehicleType;
  const ctx: PricingContext = {
    vehicleType,
    factors: VEHICLE_TYPE_FACTORS[vehicleType] ?? VEHICLE_TYPE_FACTORS.CAR,
    makeFactor: PREMIUM_MAKES.some((m) => (claim.vehicle?.make ?? '').toLowerCase().includes(m))
      ? PREMIUM_MAKE_FACTOR
      : 1.0,
  };

  const damages = claim.damageAssessment.damages as unknown as DamageItem[];

  // Calculate itemized estimates
  const items = damages.map((d) => calculateItem(d, ctx));

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
