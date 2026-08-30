import prisma from '../utils/prisma.js';
import { generateContentWithFallback } from '../utils/gemini.js';

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
