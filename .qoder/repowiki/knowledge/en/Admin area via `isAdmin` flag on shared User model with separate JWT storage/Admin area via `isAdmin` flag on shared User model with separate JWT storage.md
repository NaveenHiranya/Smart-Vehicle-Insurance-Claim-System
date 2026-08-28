---
kind: design
name: Admin area via `isAdmin` flag on shared User model with separate JWT storage
source: session
category: adr
---

# Admin area via `isAdmin` flag on shared User model with separate JWT storage

_Source: coding plans from commit period b7e31c1 → 0f5f220 — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The system needed an administrative interface to approve/reject user documents and change claim statuses, but adding a completely separate admin database or auth system would duplicate the existing user/claim data store and complicate real-time visibility.

## Decision drivers
- single source of truth for claims/documents
- immediate visibility of admin actions to end users
- reuse existing JWT auth infrastructure

## Considered options
- **Separate admin database + separate auth system** _(rejected)_ — pros: complete isolation from user data; no risk of accidental cross-access; cons: duplicates schema, requires sync between two stores, adds operational complexity
- **Role-based permissions within existing auth (e.g. `role: 'admin'`)** _(rejected)_ — pros: cleaner semantic model; cons: requires redesign of the existing User model and all middleware that reads roles; more invasive change than a single boolean flag
- **`isAdmin` Boolean flag on the existing `User` model with dedicated `/api/admin/*` routes and a separate `adminToken` in localStorage** — pros: minimal DB migration (`@default(false)`), reuses existing Prisma client and JWT secret, keeps admin UI isolated under `/admin/*` with its own layout and axios instance; cons: boolean role is less expressive than a full role enum; admin token stored separately from user token increases state surface

## Decision
Add `isAdmin Boolean @default(false)` to the Prisma `User` model, protect `/api/admin/*` endpoints with a middleware that verifies the same JWT secret and checks `prisma.user.findUnique({ isAdmin })`, and serve the admin SPA under `/admin/*` using a distinct `adminToken` in localStorage and a dedicated `AdminLayout` / `AdminProtectedRoute`.

## Consequences
Admin actions (status changes, document approve/reject) write directly into the shared SQLite database, so users see updates immediately without polling or event propagation. The trade-off is that any admin credential grants full read/write access over all users and claims, and the boolean flag does not scale to fine-grained admin roles without future refactoring.