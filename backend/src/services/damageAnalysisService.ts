import prisma from '../utils/prisma.js';
import { generateContentWithFallback } from '../utils/gemini.js';
import { buildImageParts } from '../utils/imageUtils.js';
import { DamageAnalysisResult, DamageItem } from '../types/index.js';
import { PART_IDS } from './partCatalog.js';

const DAMAGE_TYPES = [
  'dent', 'scratch', 'crack', 'broken_light', 'bumper_damage',
  'glass_damage', 'panel_deformation', 'wheel_damage', 'structural_damage', 'other',
] as const;

const SEVERITIES = ['MINOR', 'MODERATE', 'SEVERE'] as const;
type Severity = (typeof SEVERITIES)[number];

// The response shape is enforced by the API itself (responseSchema): the model
// physically cannot wrap the JSON in prose or invent field names, so parsing is
// deterministic instead of best-effort.
const DAMAGE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    damages: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: [...DAMAGE_TYPES] },
          severity: { type: 'STRING', enum: [...SEVERITIES] },
          location: { type: 'STRING' },
          description: { type: 'STRING' },
          affectedParts: { type: 'ARRAY', items: { type: 'STRING', enum: PART_IDS } },
        },
        required: ['type', 'severity', 'location', 'description'],
      },
    },
    drivabilityAssessment: { type: 'STRING' },
    overallSeverity: { type: 'STRING', enum: [...SEVERITIES] },
  },
  required: ['damages', 'drivabilityAssessment', 'overallSeverity'],
};

// Short and rule-based — the schema already carries the shape, so the prompt only
// has to teach the model HOW to assess, not how to format.
const DAMAGE_ANALYSIS_PROMPT = `You are a vehicle damage assessor. Inspect the photos and list every distinct instance of visible damage: dents, scratches, cracks, broken lights, bumper, glass, wheel, panel or structural damage.

Rules:
- One entry per damaged area; merge damage that overlaps on the same panel.
- MINOR = cosmetic only. MODERATE = functional damage, still drivable. SEVERE = safety-critical or structural.
- location: short area name, e.g. "front-left bumper".
- description: one short sentence.
- affectedParts: the main replaceable parts involved, chosen ONLY from the allowed part list (e.g. front_bumper, headlight, fairing, canopy, cargo_body). Pick parts that fit the vehicle type stated for this claim. Up to 4 parts; omit entirely if not applicable.
- Assess in the context of the vehicle type stated for this claim.
- No visible damage: empty damages array and overallSeverity MINOR.`;

const MAX_AI_IMAGES = 6;
const MAX_DAMAGES = 20;

function normalizeType(raw: unknown): string {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return (DAMAGE_TYPES as readonly string[]).includes(key) ? key : 'other';
}

function normalizeSeverity(raw: unknown): Severity {
  const key = String(raw ?? '').trim().toUpperCase();
  return (SEVERITIES as readonly string[]).includes(key) ? (key as Severity) : 'MODERATE';
}

const SEVERITY_RANK: Record<Severity, number> = { MINOR: 0, MODERATE: 1, SEVERE: 2 };

const DRIVABILITY_DEFAULTS: Record<Severity, string> = {
  MINOR: 'Safe to drive — cosmetic damage only.',
  MODERATE: 'Drivable with caution; the damage should be repaired soon.',
  SEVERE: 'May not be safe to drive — professional inspection advised before driving.',
};

/**
 * Parses and normalizes the model output into the exact shape the rest of the
 * system expects. The schema makes clean JSON the norm; this guards against any
 * remaining edge case (wrapped JSON, missing fields, wrong enum casing) so a
 * slightly-off response can never break the estimate calculation downstream.
 */
export function parseDamageAnalysis(raw: string): DamageAnalysisResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain a JSON object.');
  }
  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  const damages: DamageItem[] = (Array.isArray(parsed.damages) ? parsed.damages : [])
    .slice(0, MAX_DAMAGES)
    .map((d: Record<string, unknown>) => {
      const type = normalizeType(d.type);
      const idSet = new Set(PART_IDS);
      const affectedParts = (Array.isArray(d.affectedParts) ? d.affectedParts : [])
        .map((p) => String(p ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_'))
        .filter((p) => idSet.has(p))
        .slice(0, 6);
      return {
        type,
        severity: normalizeSeverity(d.severity),
        location: String(d.location ?? 'unspecified area').trim().slice(0, 120) || 'unspecified area',
        description: String(d.description ?? '').trim().slice(0, 300) || `${type.replace(/_/g, ' ')} damage.`,
        ...(affectedParts.length > 0 && { affectedParts }),
      };
    });

  const overallRaw = String(parsed.overallSeverity ?? '').trim().toUpperCase();
  const overallSeverity: Severity = (SEVERITIES as readonly string[]).includes(overallRaw)
    ? (overallRaw as Severity)
    : damages.reduce<Severity>((max, d) => (SEVERITY_RANK[d.severity] > SEVERITY_RANK[max] ? d.severity : max), 'MINOR');

  const drivabilityAssessment =
    String(parsed.drivabilityAssessment ?? '').trim().slice(0, 300) || DRIVABILITY_DEFAULTS[overallSeverity];

  return { damages, drivabilityAssessment, overallSeverity };
}

export async function analyzeDamage(claimId: string): Promise<DamageAnalysisResult> {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { images: true, vehicle: true },
  });

  if (!claim) {
    throw new Error('Claim not found');
  }

  if (claim.images.length === 0) {
    throw new Error('No images to analyze');
  }

  // Images are downscaled before upload — full-size phone photos are the main
  // cause of slow scans and payload-limit 400s. Closeups carry the damage
  // detail, so they are prioritized for the limited slots.
  const imageParts = await buildImageParts(claim.images, MAX_AI_IMAGES);
  if (imageParts.length === 0) {
    throw new Error('No readable images to analyze');
  }

  const vehicleContext = `Vehicle: ${claim.vehicle.year} ${claim.vehicle.make} ${claim.vehicle.model}, Type: ${claim.vehicle.vehicleType}, Color: ${claim.vehicle.color}`;

  const { text: responseText, modelUsed } = await generateContentWithFallback(
    [DAMAGE_ANALYSIS_PROMPT, vehicleContext, ...imageParts],
    {
      responseMimeType: 'application/json',
      responseSchema: DAMAGE_SCHEMA,
      temperature: 0.1,
    }
  );
  console.log(
    `[damageAnalysis] model=${modelUsed} images=${imageParts.length}/${claim.images.length} chars=${responseText.length}`
  );

  // Schema-enforced output plus normalization — a hard parse failure now means
  // something is genuinely wrong, so it surfaces as an error instead of being
  // silently stored as an empty assessment.
  const analysisResult = parseDamageAnalysis(responseText);

  // Save or update damage assessment
  const existingAssessment = await prisma.damageAssessment.findUnique({
    where: { claimId },
  });

  const assessmentData = {
    damages: analysisResult.damages as any,
    drivabilityAssessment: analysisResult.drivabilityAssessment,
    overallSeverity: analysisResult.overallSeverity as any,
    aiRawResponse: responseText as any,
  };

  let assessment;
  if (existingAssessment) {
    assessment = await prisma.damageAssessment.update({
      where: { claimId },
      data: assessmentData,
    });
  } else {
    assessment = await prisma.damageAssessment.create({
      data: {
        claimId,
        ...assessmentData,
      },
    });
  }

  // Update AI annotations on images
  for (const img of claim.images) {
    await prisma.claimImage.update({
      where: { id: img.id },
      data: {
        aiAnnotation: analysisResult.damages.filter(
          (d) => d.location.toLowerCase().includes(img.type === 'DAMAGE_CLOSEUP' ? 'close' : 'full')
        ) as any,
      },
    });
  }

  // Auto-generate repair estimate after damage analysis (local calculation — fast)
  try {
    const { generateRepairEstimate } = await import('./repairEstimateService.js');
    await generateRepairEstimate(claimId);
  } catch (err) {
    console.error('Auto repair estimate generation failed:', err);
  }

  // Auto-score the claim for fraud (one Gemini call + rule checks)
  try {
    const { scoreClaimFraud } = await import('./fraudScoringService.js');
    await scoreClaimFraud(claimId);
  } catch (err) {
    console.error('Fraud scoring failed:', err);
  }

  return analysisResult;
}
