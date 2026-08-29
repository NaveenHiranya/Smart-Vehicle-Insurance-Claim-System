---
kind: design
name: Admin area via separate /admin routes with isAdmin flag on User model
source: session
category: adr
---

# Admin area via separate /admin routes with isAdmin flag on User model

_Source: coding plans from commit period 54b9bcc → 537e579 — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The system needed a way for support staff to review and approve user-submitted documents and change claim statuses without exposing these capabilities in the public-facing app.

## Decision drivers
- simple role check without introducing a new RBAC framework
- immediate visibility of admin actions to end users
- separation of admin UI from user UI

## Considered options
- **Role-based access control (RBAC) with roles table** _(rejected)_ — pros: scalable, supports many roles, fine-grained permissions; cons: adds schema complexity and migration overhead for a single admin role
- **Separate admin backend service** _(rejected)_ — pros: complete isolation, independent deployment; cons: doubles infrastructure; unnecessary for one admin user type
- **isAdmin boolean on User + shared JWT secret** — pros: minimal schema change, reuses existing auth flow, single DB write visible instantly; cons: only supports two roles (user/admin), no per-route granular permissions yet

## Decision
Add an `isAdmin` Boolean field to the Prisma `User` model, guard `/api/admin/*` endpoints with middleware that verifies the same JWT and checks `prisma.user.findUnique` for `isAdmin === true`, and serve the admin UI under `/admin/*` with its own `AdminLayout`, `AdminProtectedRoute`, and a separate `adminToken` stored in localStorage.

## Consequences
Admin operations mutate the same database rows as the user app, so approvals and status changes are immediately visible to claimants. The approach is simple but does not scale to multiple admin roles or fine-grained permissions; adding a roles table later would require refactoring the middleware and route guards.