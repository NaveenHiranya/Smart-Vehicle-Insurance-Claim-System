---
kind: design
name: Admin area via shared JWT with isAdmin flag and separate frontend routes
source: session
category: adr
---

# Admin area via shared JWT with isAdmin flag and separate frontend routes

_Source: coding plans from commit period e6688f6 → 78b4927 — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The system needed a way for support staff to approve/reject claim documents and change claim statuses without giving them full user access or building a separate auth system.

## Decision drivers
- reuse existing JWT auth instead of duplicating login flow
- keep admin and user data in the same database so changes are immediately visible
- isolate admin UI from the public app to avoid accidental exposure

## Considered options
- **Separate admin DB + separate auth server** _(rejected)_ — pros: strong isolation, independent scaling; cons: duplicated auth, sync complexity, more infrastructure
- **Role-based middleware on existing routes** _(rejected)_ — pros: minimal code change; cons: admin endpoints mixed with user endpoints, harder to secure and audit
- **Shared JWT with isAdmin flag + /api/admin namespace** — pros: single auth flow, immediate visibility of changes, clear URL boundary; cons: admin token stored separately in localStorage; must remember to check isAdmin on every admin route

## Decision
Add an `isAdmin` boolean to the `User` model (default false), reuse the existing JWT secret, and expose all admin operations under `/api/admin/*` guarded by `backend/src/middleware/adminAuth.ts`. The frontend mounts its own `AdminLayout` and routes under `/admin/*`, storing the token in `localStorage` as `adminToken` and using a dedicated axios instance (`frontend/src/services/adminApi.ts`). A one-time seed script creates the initial admin account.

## Consequences
Admin actions write directly into the shared Prisma-managed SQLite database, so document approvals and status changes appear instantly on the user-facing claim detail pages. Admin and user sessions are decoupled at the client level (separate localStorage keys) but share the same JWT signing key. Future risk: any endpoint under `/api/admin` must be wrapped with `adminAuth`; missing middleware would grant admin-level access to anyone who guesses a route.