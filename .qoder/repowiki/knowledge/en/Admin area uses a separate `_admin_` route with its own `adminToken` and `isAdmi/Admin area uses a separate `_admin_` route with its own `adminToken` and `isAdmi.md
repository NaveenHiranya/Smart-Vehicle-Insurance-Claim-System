---
kind: design
name: Admin area uses a separate `/admin/*` route with its own `adminToken` and `isAdmin` flag
source: session
category: adr
---

# Admin area uses a separate `/admin/*` route with its own `adminToken` and `isAdmin` flag

_Source: coding plans from commit period 5451956 → e6688f6 — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The system needed an operator interface to approve/reject claims documents and change claim statuses, but the existing user-facing app was not designed for privileged operations.

## Decision drivers
- separation of concerns between end-users and operators
- reuse the existing JWT auth flow without building a parallel identity system
- immediate visibility of admin changes to regular users

## Considered options
- **Single app with role-based routing (same token)** _(rejected)_ — pros: simpler auth; no second token store; cons: admin pages would be mixed into the user UI; risk of accidental exposure if frontend guards fail
- **Separate backend service with its own DB** _(rejected)_ — pros: strong isolation; cons: doubles infrastructure; data would need replication or shared DB anyway
- **Separate `/admin/*` routes sharing the same DB, with a dedicated `adminToken` stored in localStorage and an `isAdmin` flag on the User model** — pros: clear boundary via URL prefix and distinct token key (`adminToken`); middleware `adminAuth` enforces `isAdmin === true`; changes write directly to the shared Prisma-managed SQLite so users see updates instantly; cons: two tokens coexist in localStorage; must remember to clear `adminToken` on logout

## Decision
Add an `isAdmin Boolean @default(false)` field to the Prisma `User` model, seed an initial admin account via `backend/src/scripts/seedAdmin.ts`, and expose a new `/api/admin/*` endpoint group guarded by `backend/src/middleware/adminAuth.ts`. The frontend mounts a standalone admin SPA under `/admin/*` with its own `AdminLayout`, `AdminProtectedRoute`, and a dedicated axios instance in `frontend/src/services/adminApi.ts` that reads `adminToken` from localStorage. All mutations write directly to the shared database so approvals/rejections are immediately visible on the user-facing claim detail page.

## Consequences
Admin and user code paths diverge at both URL and token boundaries, reducing accidental privilege escalation. Every admin route performs an extra `prisma.user.findUnique` lookup per request, adding one read per mutation. The seed script creates a hardcoded default password that should be rotated before production use.