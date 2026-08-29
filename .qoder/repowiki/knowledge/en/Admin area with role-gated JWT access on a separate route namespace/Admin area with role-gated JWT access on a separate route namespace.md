---
kind: design
name: Admin area with role-gated JWT access on a separate route namespace
source: session
category: adr
---

# Admin area with role-gated JWT access on a separate route namespace

_Source: coding plans from commit period df69caf → b8bdf64 — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The system needed an administrative interface to approve/reject user-submitted documents and manage claims, but the existing user-facing app had no concept of admin privileges or a protected admin UI.

## Decision drivers
- reuse existing JWT auth mechanism
- isolate admin UI from user UI
- immediate data visibility for users after admin actions

## Considered options
- **Shared layout with role-based navigation** _(rejected)_ — pros: less code duplication; cons: admin pages would be mixed into the user app; harder to enforce admin-only routes
- **Separate admin app with its own token store** — pros: clean separation of concerns, independent auth flow; cons: slightly more frontend surface

## Decision
Create a dedicated `/admin/*` frontend under `frontend/src/pages/admin/` with its own `AdminLayout`, `AdminProtectedRoute`, and `adminToken` stored separately in localStorage. Backend exposes `/api/admin/*` routes guarded by an `adminAuth` middleware that verifies the same JWT secret and additionally checks `User.isAdmin === true` via Prisma. Admin actions write directly to the shared SQLite database so changes are immediately visible to end users.

## Consequences
Admin and user flows are fully decoupled — new admin features can be added without touching user-facing code. The `isAdmin` flag on the User model becomes the single source of truth for privilege checks. Seed script is required to bootstrap at least one admin account. Any future privilege escalation must go through the same `isAdmin` check path.