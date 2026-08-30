---
kind: design
name: Tie insurance policies to vehicles and gate claims on vehicle verification
source: session
category: adr
---

# Tie insurance policies to vehicles and gate claims on vehicle verification

_Source: coding plans from commit period d2b2fd8 → 7d6c8df — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The previous model attached a single user-level policy, making it unclear which vehicle's coverage applied to a claim. The system needed per-vehicle coverage with an admin verification step before any claim could be filed.

## Decision drivers
- clear ownership of coverage per vehicle
- prevent unverified claims
- simplify payout math by binding the claim directly to its vehicle's policy

## Considered options
- **Keep user-level policy (original design)** _(rejected)_ — pros: minimal DB changes, existing UI mostly intact; cons: ambiguous which vehicle is covered; no way to enforce verification per vehicle
- **One policy per vehicle with admin verification workflow** — pros: each vehicle has exactly one policy, claims auto-use that policy, admin can verify/adjust per vehicle; cons: requires schema changes, backfill of existing data, UI rework across user and admin flows
- **Multi-policy per vehicle with active-flag selection** — pros: flexible for users with multiple policies; cons: adds complexity to claim selection and payout calculation; not needed for this domain

## Decision
Move from user-level to vehicle-level policies: add `VehicleVerification` enum and `verificationStatus` to Vehicle, make InsurancePolicy reference a single Vehicle via a unique `vehicleId`, and block claim submission unless the vehicle is VERIFIED. Admin endpoints (`PATCH /vehicles/:id/verify`, `POST /vehicles/:id/policy`) manage verification state and per-vehicle policy creation/editing.

## Consequences
Existing vehicles start as PENDING so admins must review them; existing claims continue to work via their original `policyId`. Replacing or editing a vehicle's policy resets verification to PENDING, ensuring changed coverage is re-reviewed. Frontend shifts from a single dashboard insurance card to a per-vehicle grid, and claim filing now requires selecting a verified vehicle rather than choosing a policy.