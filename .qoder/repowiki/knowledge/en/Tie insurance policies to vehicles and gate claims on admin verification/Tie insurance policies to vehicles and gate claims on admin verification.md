---
kind: design
name: Tie insurance policies to vehicles and gate claims on admin verification
source: session
category: adr
---

# Tie insurance policies to vehicles and gate claims on admin verification

_Source: coding plans from commit period 9f24cc7 → cfe616b — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The original design attached a single policy per user, making it unclear which vehicle's coverage applied to a claim. The business requires that each vehicle has at most one policy and that an admin must verify the vehicle and its insurance before any claim can be filed.

## Decision drivers
- clear ownership of coverage per vehicle
- admin-controlled risk gating for claims
- stable claim-to-policy linkage

## Considered options
- **Keep user-level policies with per-claim policy selection** _(rejected)_ — pros: minimal DB changes; users keep existing flow; cons: ambiguous which vehicle is covered; no built-in verification gate; payout math stays manual
- **Per-vehicle policy with admin verification workflow** — pros: one policy per vehicle via `InsurancePolicy.vehicleId @unique`; claims auto-link to the vehicle's policy; unverified vehicles return 403; dashboard shows per-vehicle status; cons: requires schema migration (`VehicleVerification` enum, new fields), admin UI, and a one-off backfill of existing policies

## Decision
Move insurance from user to vehicle: add `VehicleVerification` enum and `verificationStatus`/`verifiedAt`/`verificationNotes` to Vehicle, make `InsurancePolicy.vehicleId` unique, enforce `POST /claims` only when `verificationStatus === 'VERIFIED'`, and manage policy attachment via `PATCH /vehicles/:id/verify` and `POST /vehicles/:id/policy` in the admin routes.

## Consequences
Existing vehicles start PENDING and cannot file claims until an admin verifies them; replacing or deleting a vehicle's policy resets verification to PENDING so data changes are re-checked; the frontend shifts registration to a single step and moves plan selection into the vehicle creation flow and per-vehicle Policies page; claim payouts automatically use the linked vehicle policy without user selection.