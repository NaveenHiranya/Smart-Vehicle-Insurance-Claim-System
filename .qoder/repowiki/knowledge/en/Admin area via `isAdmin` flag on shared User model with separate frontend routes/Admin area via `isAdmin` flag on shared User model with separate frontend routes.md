---
kind: design
name: Admin area via `isAdmin` flag on shared User model with separate frontend routes
source: session
category: adr
---

# Admin area via `isAdmin` flag on shared User model with separate frontend routes

_Source: coding plans from commit period 5efa0d8 → a5fc44c — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The system needed a way for support staff to review and approve user-submitted documents and adjust claim statuses without building a separate admin backend or service.

## Decision drivers
- reuse existing JWT auth and database
- minimal new infrastructure
- immediate visibility of admin changes to end users

## Considered options
- **Separate admin microservice with its own DB** _(rejected)_ — pros: strong isolation, independent scaling; cons: doubles the data layer, adds inter-service sync complexity
- **Role-based access inside the existing `/api/*` routes** _(rejected)_ — pros: no new routes or UI; cons: mixes admin and user concerns in one codebase and URL space; harder to isolate admin UI
- **`isAdmin` boolean on the shared `User` model with dedicated `/api/admin/*` routes and a separate `/admin/*` frontend** — pros: single source of truth for claims/documents, no extra services, simple middleware check; cons: admin token stored separately in localStorage; requires middleware to query DB per request

## Decision
Add an `isAdmin Boolean @default(false)` field to the Prisma `User` model, seed an admin account, and expose a dedicated `/api/admin/*` route set guarded by `backend/src/middleware/adminAuth.ts`. The frontend hosts a parallel admin SPA under `frontend/src/pages/admin/` with its own `AdminLayout`, `AdminProtectedRoute`, and a separate `adminToken` in localStorage.

## Consequences
Admin actions (claim status changes, document approve/reject) write directly to the shared SQLite database so updates appear instantly on the user-facing claim detail page. Every admin request incurs an extra `prisma.user.findUnique` lookup to verify `isAdmin`. Admin credentials are seeded once via `backend/src/scripts/seedAdmin.ts` and must be rotated before production deployment.