---
kind: design
name: Admin area uses a separate JWT token and an isAdmin flag on the User model
source: session
category: adr
---

# Admin area uses a separate JWT token and an isAdmin flag on the User model

_Source: coding plans from commit period 537e579 → 5451956 — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The system needed a way for support staff to view all claims, approve/reject documents, and change claim statuses without giving regular users elevated privileges. The existing user-facing app already used JWT-based auth.

## Decision drivers
- reuse existing JWT flow
- keep admin and user sessions isolated in the browser
- avoid a separate identity provider

## Considered options
- **Separate admin role via `isAdmin` flag on the same User table** — pros: simple schema change; single login endpoint; no new auth service; middleware can check the flag at request time
- **Dedicated admin account or separate user table** _(rejected)_ — pros: cleaner separation of concerns; cons: requires a second login flow, separate cookie/token storage, and duplicated auth logic

## Decision
Add an `isAdmin Boolean @default(false)` field to the Prisma `User` model, seed one admin account, and gate `/api/admin/*` routes with a middleware that verifies the existing JWT and queries `prisma.user.findUnique` for `isAdmin === true`. The frontend stores the admin token under a distinct `adminToken` key in localStorage and mounts its own `/admin/*` routes behind an `AdminProtectedRoute`.

## Consequences
Admin and user sessions coexist in the same browser but are isolated by token key and route prefix. Every admin request incurs an extra DB lookup to confirm the flag. If the flag is removed from a user, their next admin request will immediately receive 403. Admin actions write directly to the shared database so changes appear instantly to end users — there is no audit log or approval queue beyond the document `verificationStatus`/`verificationResult` fields.