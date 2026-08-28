---
kind: design
name: Admin area uses a separate JWT token and isAdmin flag on the User model
source: session
category: adr
---

# Admin area uses a separate JWT token and isAdmin flag on the User model

_Source: coding plans from commit period 0f5f220 → d557fe4 — records intent at planning time; the implementation may lag or differ._

## Context
The system needed an internal admin interface to review claims, approve/reject documents, and change claim statuses. The admin area must be isolated from the public user app while still sharing the same database so that admin actions are immediately visible to end users.

## Decision drivers
- separation of concerns between user-facing and admin UIs
- immediate consistency across user and admin views without async queues
- reuse existing JWT auth infrastructure

## Considered options
- **Separate admin token + isAdmin flag (chosen)** — pros: simple extension of existing JWT flow; no new auth server; admin routes protected by middleware that checks `prisma.user.isAdmin`; cons: admin credentials live in the same User table as regular users; requires careful seeding and access control
- **Dedicated admin service with its own DB or RBAC table** — pros: cleaner separation of roles at the data layer; cons: adds schema complexity and operational overhead for a small admin tooling surface
- **Shared layout with role-based route guards** — pros: single codebase for UI; cons: mixes admin and user concerns in one SPA; harder to style and secure independently

## Decision
Add an `isAdmin Boolean @default(false)` field to the Prisma `User` model, seed a dedicated admin account, and protect `/api/admin/*` routes with middleware that verifies the existing JWT and queries `prisma.user.findUnique` for `isAdmin === true`. The frontend hosts a separate `/admin/*` SPA with its own `AdminLayout`, `AdminProtectedRoute`, and a distinct `adminToken` stored in localStorage.

## Consequences
Admin and user apps share one database, so status/document changes propagate instantly. Admin privileges are tied to a single row in the User table, making privilege escalation a simple column flip — future work should consider moving admin rights to a separate role/permission store if multi-admin support is needed. The separate `adminToken` cookie/localStorage key avoids accidental cross-app session reuse.