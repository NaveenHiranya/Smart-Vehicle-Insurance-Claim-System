---
kind: design
name: Move insurance from user-level to per-vehicle with admin verification gate
source: session
category: adr
---

# Move insurance from user-level to per-vehicle with admin verification gate

_Source: coding plans from commit period edf9a4d → 9f24cc7 — records intent at planning time; the implementation may lag or differ._

## Context
The system previously attached an insurance policy at the user level during registration, and claims could fall back to a user-level policy. This made it impossible to tie coverage details to a specific vehicle and left no enforcement point for verifying that a vehicle's insurance was legitimate before allowing claims.

## Decision drivers
- per-vehicle payout accuracy
- enforceable pre-claim verification workflow
- simpler claim flow (no policy selection)

## Considered options
- **Keep user-level policies + add vehicle linkage later** _(rejected)_ — pros: minimal DB change; cons: ambiguous which vehicle a claim covers; no natural place to enforce verification before filing
- **One policy per vehicle with mandatory admin verification** — pros: clear ownership of coverage, single source of truth for claim math, explicit PENDING/VERIFIED/REJECTED states drive UI and API gates; cons: requires migration, backfill, and new admin workflows

## Decision
Attach `InsurancePolicy` directly to `Vehicle` via a unique `vehicleId` relation in `backend/prisma/schema.prisma`, create or update the policy when a vehicle is added or edited, and gate claim submission behind `verificationStatus === 'VERIFIED'`. Admins manage verification through `PATCH /vehicles/:id/verify` and can add/edit the vehicle's policy via `POST /vehicles/:id/policy`; any policy change resets the vehicle to PENDING so it must be re-verified.

## Consequences
Existing vehicles start as PENDING and existing user-level policies are only re-attached by a one-off backfill script. The frontend dashboard now shows one insurance card per vehicle, the Register flow drops step 2 plan selection, and claim creation removes the `policyId` body parameter in favor of reading the vehicle's policy server-side. Deleting a verified vehicle's policy automatically resets its status to PENDING, preventing further claims until re-verified.