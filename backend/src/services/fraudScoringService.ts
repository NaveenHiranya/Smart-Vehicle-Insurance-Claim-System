import prisma from '../utils/prisma.js';
import { generateContentWithFallback } from '../utils/gemini.js';
import { loadImagePart, resolveUploadPath } from '../utils/imageUtils.js';

export interface FraudFlag {
  signal: string;
  points: number;
  detail: string;
}

export interface FraudResult {
  score: number;
  flags: FraudFlag[];
  summary: string;
  tier: 'LOW' | 'MEDIUM' | 'HIGH';
}

const RECENT_POLICY_DAYS = 14;
const MAX_DUPLICATE_PLATE_CLAIMS = 1;

// --- Rule-based signals -------------------------------------------------------

function policyRecency(createdAt: Date, policyStartDate: Date): FraudFlag | null {
  const daysBetween = Math.floor((createdAt.getTime() - policyStartDate.getTime()) / 86_400_000);
  if (daysBetween >= 0 && daysBetween <= RECENT_POLICY_DAYS) {
    return {
      signal: 'policy_recency',
      points: 15,
      detail: `Claim filed ${daysBetween} day(s) after policy start`,
    };
  }
  return null;
}

async function duplicatePlate(vehicleId: string): Promise<FraudFlag | null> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { licensePlate: true } });
  if (!vehicle) return null;
  const otherClaims = await prisma.claim.count({
    where: {
      vehicle: { licensePlate: vehicle.licensePlate },
      vehicleId: { not: vehicleId },
    },
  });
  if (otherClaims > MAX_DUPLICATE_PLATE_CLAIMS) {
    return {
      signal: 'duplicate_plate',
      points: 30,
      detail: `Vehicle plate ${vehicle.licensePlate} has ${otherClaims} other claims`,
    };
  }
  return null;
}

function documentSignals(documents: Array<{ type: string; verificationStatus: string }>): FraudFlag[] {
  const required = ['LICENSE', 'REGISTRATION', 'ACCIDENT_REPORT'];
  const flags: FraudFlag[] = [];
  for (const docType of required) {
    const doc = documents.find((d) => d.type === docType);
    if (!doc) {
      flags.push({
        signal: 'doc_missing',
        points: 10,
        detail: `${docType} not uploaded`,
      });
    } else if (doc.verificationStatus === 'ISSUES_FOUND' || doc.verificationStatus === 'UNREADABLE' || doc.verificationStatus === 'REJECTED') {
      flags.push({
        signal: 'doc_verification_failed',
        points: 25,
        detail: `${docType} verification failed (${doc.verificationStatus})`,
      });
    }
  }
  return flags;
}

// --- LLM signal: incident/damage consistency check ----------------------------

const MISMATCH_SCHEMA = {
  type: 'OBJECT',
  properties: {
    mismatch: { type: 'BOOLEAN' },
    reason: { type: 'STRING' },
  },
  required: ['mismatch', 'reason'],
};

const MISMATCH_PROMPT = `You are a fraud analyst. You will be given:
1. The policyholder's incident description (what they say happened)
2. The AI damage analysis (what a computer vision system detected on the photos)

Decide whether the detected damage is PLAUSIBLE given the described incident.

Return mismatch=true ONLY if the damage is clearly inconsistent with the incident. Examples:
- Description says "minor bumper bump" but damage shows severe structural damage to roof → mismatch=true
- Description says "rear-ended" but damage is on the front bumper → mismatch=true
- Description is vague ("hit something") but damage shows many severe dents across the car → mismatch=true (vague description masking staged damage)
- Description and damage match in broad strokes → mismatch=false (even if severity differs slightly)

Reason: one sentence explaining why or why not.`;

const VISUAL_CHECK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    syntheticImageSuspected: { type: 'BOOLEAN' },
    syntheticImageReason: { type: 'STRING' },
    vehicleMismatch: { type: 'BOOLEAN' },
    vehicleMismatchReason: { type: 'STRING' },
    colorMismatch: { type: 'BOOLEAN' },
    colorMismatchReason: { type: 'STRING' },
  },
  required: [
    'syntheticImageSuspected', 'syntheticImageReason',
    'vehicleMismatch', 'vehicleMismatchReason',
    'colorMismatch', 'colorMismatchReason',
  ],
};

const VISUAL_CHECK_PROMPT = `You are a cautious motor-insurance image reviewer for Sri Lanka.
Compare the CLAIM PHOTOS with the REGISTERED VEHICLE PHOTOS and the registered details.

Check three independent questions:
1. syntheticImageSuspected: return true only when there are visible signs that a claim image may be AI-generated or materially manipulated, such as impossible text, warped number plates, repeated/inconsistent vehicle geometry, impossible reflections, or inconsistent shadows. A normal phone photo, compression, blur, or unusual damage is not enough.
2. vehicleMismatch: return true only when the damaged vehicle clearly appears to be a different vehicle from the registered vehicle, considering make, model, body type, vehicle class, plate when readable, and stable visual features. Return false when the images are too unclear to decide.
3. colorMismatch: return true only when the vehicle's visible main paint color clearly conflicts with the registered color. Ignore lighting, shadows, dust, reflections, two-tone trim, and minor shade differences. Return false when the color cannot be judged reliably.

Never treat any result as proof of fraud. Give one short evidence-based reason for each result. Do not infer a mismatch merely because the claim vehicle is damaged.`;

interface VisualCheck {
  syntheticImageSuspected: boolean;
  syntheticImageReason: string;
  vehicleMismatch: boolean;
  vehicleMismatchReason: string;
  colorMismatch: boolean;
  colorMismatchReason: string;
}

function parseJsonResponse(text: string): Record<string, unknown> | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function stringReason(value: unknown): string {
  return String(value ?? '').trim().slice(0, 300);
}

function registeredPhotoPaths(rawPhotos: string): string[] {
  try {
    const parsed = JSON.parse(rawPhotos || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((photo): photo is string => typeof photo === 'string').slice(0, 3)
      : [];
  } catch {
    return [];
  }
}

async function visualVehicleCheck(claim: {
  vehicle: { make: string; model: string; year: number; color: string; vehicleType: string; photos: string };
  images: Array<{ filePath: string; type: string }>;
}): Promise<FraudFlag[]> {
  const registeredParts = await Promise.all(
    registeredPhotoPaths(claim.vehicle.photos).map((photo) => loadImagePart(resolveUploadPath(photo))),
  );
  const claimParts = await Promise.all(
    claim.images.slice(0, 4).map((image) => loadImagePart(resolveUploadPath(image.filePath))),
  );
  const usableRegistered = registeredParts.filter((part) => part !== null);
  const usableClaim = claimParts.filter((part) => part !== null);
  if (usableClaim.length === 0) return [];

  const context = `REGISTERED VEHICLE DETAILS:\nMake: ${claim.vehicle.make}\nModel: ${claim.vehicle.model}\nYear: ${claim.vehicle.year}\nColor: ${claim.vehicle.color}\nVehicle type: ${claim.vehicle.vehicleType}\n\nThe next ${usableRegistered.length} image(s) are REGISTERED VEHICLE PHOTOS. The remaining ${usableClaim.length} image(s) are CLAIM PHOTOS.`;
  const { text, modelUsed } = await generateContentWithFallback(
    [VISUAL_CHECK_PROMPT, context, ...usableRegistered, ...usableClaim],
    {
      responseMimeType: 'application/json',
      responseSchema: VISUAL_CHECK_SCHEMA,
      temperature: 0.1,
    },
  );
  console.log(`[fraudScoring] visual check model=${modelUsed} registered=${usableRegistered.length} claim=${usableClaim.length}`);

  const parsed = parseJsonResponse(text);
  if (!parsed) return [];
  const check: VisualCheck = {
    syntheticImageSuspected: parsed.syntheticImageSuspected === true,
    syntheticImageReason: stringReason(parsed.syntheticImageReason),
    vehicleMismatch: parsed.vehicleMismatch === true,
    vehicleMismatchReason: stringReason(parsed.vehicleMismatchReason),
    colorMismatch: parsed.colorMismatch === true,
    colorMismatchReason: stringReason(parsed.colorMismatchReason),
  };
  const flags: FraudFlag[] = [];
  if (check.syntheticImageSuspected) {
    flags.push({
      signal: 'possible_ai_generated_image',
      points: 35,
      detail: `Possible AI-generated or manipulated claim image: ${check.syntheticImageReason || 'visual inconsistencies detected'}`,
    });
  }
  if (check.vehicleMismatch) {
    flags.push({
      signal: 'claim_vehicle_mismatch',
      points: 30,
      detail: `Claim photo may show a different vehicle from the registered vehicle: ${check.vehicleMismatchReason || 'vehicle details do not align'}`,
    });
  }
  if (check.colorMismatch) {
    flags.push({
      signal: 'vehicle_color_mismatch',
      points: 20,
      detail: `Claim photo color may not match the registered vehicle (${claim.vehicle.color}): ${check.colorMismatchReason || 'visible paint color differs'}`,
    });
  }
  return flags;
}

async function incidentDamageMismatch(
  incidentDescription: string,
  damageAssessment: { damages: any; overallSeverity: string }
): Promise<FraudFlag | null> {
  const context = [
    `Incident description: ${incidentDescription}`,
    `Detected damages: ${JSON.stringify(damageAssessment)}`,
  ].join('\n');

  const { text, modelUsed } = await generateContentWithFallback(
    [MISMATCH_PROMPT, context],
    {
      responseMimeType: 'application/json',
      responseSchema: MISMATCH_SCHEMA,
      temperature: 0.1,
    }
  );
  console.log(`[fraudScoring] mismatch signal model=${modelUsed}`);

  let parsed: { mismatch: boolean; reason: string };
  try {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : text);
  } catch {
    return null;
  }

  if (parsed.mismatch) {
    return {
      signal: 'incident_damage_mismatch',
      points: 30,
      detail: `AI says damage is inconsistent with incident: ${String(parsed.reason ?? '').slice(0, 300)}`,
    };
  }
  return null;
}

// --- Main entry point ---------------------------------------------------------

function tierFromScore(score: number): FraudResult['tier'] {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  return 'HIGH';
}

export async function scoreClaimFraud(claimId: string): Promise<FraudResult> {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      policy: true,
      damageAssessment: true,
      documents: true,
      images: { select: { filePath: true, type: true } },
      vehicle: { select: { make: true, model: true, year: true, color: true, vehicleType: true, photos: true } },
    },
  });
  if (!claim) throw new Error('Claim not found');

  const flags: FraudFlag[] = [];

  // Rule signals
  if (claim.policy) {
    const recency = policyRecency(claim.createdAt, claim.policy.startDate);
    if (recency) flags.push(recency);
  }

  const plate = await duplicatePlate(claim.vehicleId);
  if (plate) flags.push(plate);

  for (const f of documentSignals(claim.documents)) flags.push(f);

  // Multimodal signal: compare claim photos with the registered vehicle and
  // look for visual signs of synthetic or materially manipulated imagery.
  try {
    for (const flag of await visualVehicleCheck(claim)) flags.push(flag);
  } catch (err) {
    console.error('[fraudScoring] visual vehicle check failed:', err);
  }

  // LLM signal (only if we have both description and damage data)
  if (claim.damageAssessment && claim.incidentDescription?.trim()) {
    try {
      const mismatch = await incidentDamageMismatch(
        claim.incidentDescription,
        claim.damageAssessment as unknown as { damages: any; overallSeverity: string }
      );
      if (mismatch) flags.push(mismatch);
    } catch (err) {
      console.error('[fraudScoring] LLM signal failed:', err);
    }
  }

  const score = Math.min(100, flags.reduce((sum, f) => sum + f.points, 0));
  const tier = tierFromScore(score);
  const summary =
    score === 0
      ? 'Low risk — no flags.'
      : `${tier} risk (${score}/100) — ${flags.map((f) => f.detail).join('; ')}.`;

  await prisma.claim.update({
    where: { id: claimId },
    data: {
      fraudScore: score,
      fraudFlags: flags as any,
      fraudSummary: summary,
      fraudScoredAt: new Date(),
    },
  });

  return { score, flags, summary, tier };
}
