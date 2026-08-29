The module is a full-stack Express + Prisma backend paired with a React/Vite frontend, organized around a dedicated `/api/admin` route set protected by an `adminAuthMiddleware` that enforces both a valid JWT and `isAdmin: true` on the user record.

Backend layering:
- Entry point `backend/src/index.ts` mounts routers; `backend/src/routes/admin.ts` exposes all admin endpoints under `/api/admin/*` (stats, users, claims CRUD, document approval/rejection, garage management, admin notes).
- Authentication is split into three middleware files: `auth.ts` (regular users), `garageAuth.ts` (garage partners), and `adminAuth.ts` (admin-only); each guards its own route group.
- Data access goes exclusively through Prisma (`backend/src/utils/prisma.ts`) against `backend/prisma/schema.prisma`; a seed script (`scripts/seedAdmin.ts`) creates the initial admin account.
- AI-assisted services live in `services/` (claim assistant, damage analysis, document verification, repair estimate, vehicle detection) and are reused by admin workflows such as document review.

Frontend layering:
- Admin pages live under `frontend/src/pages/admin/` (Dashboard, Users, Claims, Claim Detail, Documents, Garages, Login) and are wrapped by `AdminProtectedRoute`, which checks for an `adminToken` in localStorage before rendering.
- A parallel `GarageProtectedRoute` / `GarageLayout` pair isolates the garage sub-app from the admin portal.
- API calls go through `frontend/src/services/api.ts`, `adminApi.ts`, and `garageApi.ts`, keeping request logic out of components.

Dependency direction is strictly one-way: frontend → Express routes → Prisma client → PostgreSQL; admin routes depend on the shared `AuthRequest` type from `backend/src/types/index.ts` to attach `userId` after JWT verification.