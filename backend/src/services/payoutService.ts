import prisma from '../utils/prisma.js';

/**
 * Recalculates the insurance payout for a claim after any estimate change.
 *
 * The claim is deducted from its policy: the deductible is subtracted from the
 * current estimate total (the garage estimate takes precedence over the AI
 * estimate once submitted), the plan's coverage percentage is applied, and the
 * result is capped at the vehicle's valuation when one is set.
 */
export async function recalculatePayout(claimId: string): Promise<void> {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      policy: true,
      vehicle: { select: { valuation: true } },
      repairEstimate: { select: { id: true, totalCost: true } },
      garageEstimate: { select: { totalCost: true } },
      insurancePayout: { select: { id: true } },
    },
  });
  if (!claim || !claim.policy) return;

  // The garage estimate is the final basis once submitted; until then the AI estimate applies
  const baseTotal = claim.garageEstimate?.totalCost ?? claim.repairEstimate?.totalCost ?? null;
  if (baseTotal == null) return;

  const deductible = claim.policy.deductible;
  const coveragePercent = claim.policy.coveragePercent ?? 100;
  const valuation = claim.vehicle?.valuation ?? null;

  const afterDeductible = Math.max(0, baseTotal - deductible);
  let coveredAmount = afterDeductible * (coveragePercent / 100);
  if (valuation != null && valuation > 0) coveredAmount = Math.min(coveredAmount, valuation);
  coveredAmount = Math.round(coveredAmount);

  const basis = claim.garageEstimate ? 'garage estimate' : 'repair estimate';
  const parts = [
    `Based on the ${basis} of Rs. ${baseTotal.toLocaleString()}`,
    `deductible of Rs. ${deductible.toLocaleString()} applied`,
    coveragePercent < 100 ? `${coveragePercent}% coverage` : null,
    valuation != null && valuation > 0 && coveredAmount >= valuation ? `capped at vehicle valuation of Rs. ${valuation.toLocaleString()}` : null,
  ].filter(Boolean).join(', ');

  const payoutData = {
    deductible,
    coveredAmount,
    estimatedPayout: coveredAmount,
    notes: `${parts}.`,
  };

  if (claim.insurancePayout) {
    await prisma.insurancePayout.update({
      where: { claimId },
      data: payoutData,
    });
  } else if (claim.repairEstimate) {
    await prisma.insurancePayout.create({
      data: {
        claimId,
        repairEstimateId: claim.repairEstimate.id,
        ...payoutData,
      },
    });
  }
}
