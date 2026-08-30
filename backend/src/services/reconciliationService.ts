import prisma from '../utils/prisma.js';
import { generateContentWithFallback } from '../utils/gemini.js';

export interface ReconciliationFlag {
  type: 'OVERCHARGE' | 'MISSED_DAMAGE' | 'PRICE_OUTLIER' | 'EXTRA_ITEM' | 'LABOR_DISCREPANCY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  detail: string;
  aiAmount: number | null;
  garageAmount: number | null;
}

export interface ReconciliationResult {
  divergenceScore: number;
  flags: ReconciliationFlag[];
  summary: string;
  aiTotal: number;
  garageTotal: number;
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    divergenceScore: {
      type: 'INTEGER',
      description: '0 = estimates align well, 100 = major discrepancies. Based on number and severity of flags.',
    },
    flags: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['OVERCHARGE', 'MISSED_DAMAGE', 'PRICE_OUTLIER', 'EXTRA_ITEM', 'LABOR_DISCREPANCY'] },
          severity: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          detail: { type: 'STRING' },
          aiAmount: { type: 'NUMBER', nullable: true },
          garageAmount: { type: 'NUMBER', nullable: true },
        },
        required: ['type', 'severity', 'detail', 'aiAmount', 'garageAmount'],
      },
    },
    summary: { type: 'STRING' },
  },
  required: ['divergenceScore', 'flags', 'summary'],
};

const PROMPT = `You are an insurance claims analyst reconciling a garage repair estimate against an AI-generated damage estimate.

Your job: compare the two estimates line by line and flag discrepancies.

Flag types:
- OVERCHARGE: garage charges significantly more than AI estimate for the same part or service (>30% higher)
- MISSED_DAMAGE: AI detected damage that the garage did not include in their estimate (potential missed repair)
- PRICE_OUTLIER: a specific garage line item is priced far outside the AI's estimate for that part
- EXTRA_ITEM: garage included a part/service not in the AI estimate (may be legitimate or unnecessary)
- LABOR_DISCREPANCY: labor hours or rate differ significantly between estimates

Severity:
- LOW: minor difference, likely within normal variation (<20%)
- MEDIUM: notable difference worth reviewing (20-50%)
- HIGH: major discrepancy requiring investigation (>50% or missing critical items)

Be fair — garages may legitimately charge more for OEM parts, local market conditions, or additional work discovered during teardown. Only flag clear outliers.

For aiAmount and garageAmount, use the LKR cost for that specific line. Use null if the item doesn't exist in one estimate.`;

export async function reconcileEstimates(claimId: string): Promise<ReconciliationResult> {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      damageAssessment: true,
      repairEstimate: true,
      garageEstimate: true,
      vehicle: true,
    },
  });

  if (!claim) throw new Error('Claim not found');
  if (!claim.repairEstimate) throw new Error('AI repair estimate not found');
  if (!claim.garageEstimate) throw new Error('Garage estimate not found');

  const aiItems = claim.repairEstimate.items as any[];
  const garageItems = claim.garageEstimate.items as any;

  const context = [
    `Vehicle: ${claim.vehicle?.make ?? ''} ${claim.vehicle?.model ?? ''} ${claim.vehicle?.year ?? ''} (${claim.vehicle?.vehicleType ?? 'CAR'})`,
    '',
    'AI DAMAGE ASSESSMENT:',
    JSON.stringify(claim.damageAssessment?.damages ?? [], null, 2),
    '',
    'AI REPAIR ESTIMATE (itemized):',
    JSON.stringify(aiItems, null, 2),
    `AI Total: Rs. ${claim.repairEstimate.totalCost.toLocaleString()} (Parts: Rs. ${claim.repairEstimate.totalPartsCost.toLocaleString()}, Labor+Paint: Rs. ${claim.repairEstimate.totalLaborCost.toLocaleString()}, Days: ${claim.repairEstimate.estimatedDays})`,
    '',
    'GARAGE ESTIMATE:',
    JSON.stringify(garageItems, null, 2),
    `Garage Total: Rs. ${claim.garageEstimate.totalCost.toLocaleString()} (Parts: Rs. ${claim.garageEstimate.totalPartsCost.toLocaleString()}, Labor: Rs. ${claim.garageEstimate.totalLaborCost.toLocaleString()}, Days: ${claim.garageEstimate.estimatedDays})`,
    '',
    `Difference: Rs. ${(claim.garageEstimate.totalCost - claim.repairEstimate.totalCost).toLocaleString()} (${claim.garageEstimate.totalCost > claim.repairEstimate.totalCost ? 'garage higher' : 'AI higher'})`,
  ].join('\n');

  const { text, modelUsed } = await generateContentWithFallback(
    [PROMPT, context],
    {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
    }
  );
  console.log(`[reconciliation] model=${modelUsed}`);

  let parsed: { divergenceScore: number; flags: ReconciliationFlag[]; summary: string };
  try {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : text);
  } catch {
    throw new Error('Failed to parse Gemini reconciliation response');
  }

  const score = Math.max(0, Math.min(100, parsed.divergenceScore ?? 0));
  const flags = (parsed.flags ?? []).map((f) => ({
    type: f.type ?? 'PRICE_OUTLIER',
    severity: f.severity ?? 'MEDIUM',
    detail: String(f.detail ?? '').slice(0, 500),
    aiAmount: typeof f.aiAmount === 'number' ? f.aiAmount : null,
    garageAmount: typeof f.garageAmount === 'number' ? f.garageAmount : null,
  }));

  const result: ReconciliationResult = {
    divergenceScore: score,
    flags,
    summary: String(parsed.summary ?? '').slice(0, 1000),
    aiTotal: claim.repairEstimate.totalCost,
    garageTotal: claim.garageEstimate.totalCost,
  };

  await prisma.claim.update({
    where: { id: claimId },
    data: {
      reconciliationScore: score,
      reconciliationResult: { flags, summary: result.summary, aiTotal: result.aiTotal, garageTotal: result.garageTotal } as any,
      reconciliationSummary: result.summary,
      reconciledAt: new Date(),
    },
  });

  return result;
}
