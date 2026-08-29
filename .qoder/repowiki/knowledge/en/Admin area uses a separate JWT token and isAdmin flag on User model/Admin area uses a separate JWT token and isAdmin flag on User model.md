---
kind: design
name: Admin area uses a separate JWT token and isAdmin flag on User model
source: session
category: adr
---

# Admin area uses a separate JWT token and isAdmin flag on User model

_Source: coding plans from commit period d557fe4 → 54b9bcc — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The system needed an administrative interface to manage claims, users, and document approvals that is distinct from the end-user claim submission flow. Admin actions must be restricted to privileged accounts without complicating the existing user auth.

## Decision drivers
- separation of concerns between admin and user flows
- reuse existing JWT infrastructure
- simple privilege check at middleware level

## Considered options
- **Separate admin JWT with isAdmin flag on User** — pros: Leverages existing JWT auth; single DB field for role; middleware can enforce both auth and admin check; admin token stored separately in localStorage avoids collision
- **Role-based RBAC on the same token** _(rejected)_ — pros: Single token, unified role model; cons: Requires changing every existing route's middleware; mixes admin/user concerns in one token payload; more complex authorization logic across the app
- **Server-side admin session store** _(rejected)_ — pros: Revocable sessions; cons: Adds a new stateful dependency (cache/DB) and sticky routing; unnecessary given short-lived JWTs

## Decision
Add an `isAdmin` boolean to the `User` Prisma model and protect `/api/admin/*` routes with a dedicated `adminAuth` middleware that verifies the JWT and checks `isAdmin === true`. The frontend stores the admin token under a separate `adminToken` key and mounts all admin pages under `/admin/*` behind an `AdminProtectedRoute`.

## Consequences
Admin and user sessions are independent in localStorage; any change made by an admin (claim status, document approval/rejection) is immediately visible to users because it writes directly to the shared database. The approach scales simply but relies on the seed script (`seedAdmin.ts`) to provision the initial admin account.