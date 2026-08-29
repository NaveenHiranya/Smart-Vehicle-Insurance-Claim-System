---
kind: dependency_management
name: npm-based Monorepo Dependency Management with Lockfiles
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - frontend/package.json
    - backend/package-lock.json
    - frontend/package-lock.json
    - backend/.gitignore
    - frontend/.gitignore
    - railway.toml
---

## System Overview

This repository uses **npm** as the package manager for a multi-package monorepo consisting of a backend (`backend/`) and frontend (`frontend/`) application. There is no top-level `package-lock.json` or workspace configuration — each subproject manages its own dependencies independently, while a root `package.json` provides convenience scripts to orchestrate installs across both packages.

## Key Files

- `package.json` (root): Defines cross-project scripts like `install:all`, `build`, `start`, `dev:backend`, `dev:frontend`, and `seed`. It does not declare any dependencies itself; it only orchestrates installation into `backend/` and `frontend/` via `cd` commands.
- `backend/package.json`: Declures runtime dependencies (`express`, `@prisma/client`, `jsonwebtoken`, `bcryptjs`, `multer`, `cors`, `dotenv`, `zod`, `@google/generative-ai`) and dev dependencies (`typescript`, `tsx`, `nodemon`, `@types/*`). Includes Prisma-specific scripts (`prisma:generate`, `prisma:migrate`, `prisma:push`, `prisma:studio`, `start:migrate`).
- `frontend/package.json`: Declares React 19, Vite, Tailwind CSS v4, Axios, React Router DOM, and Oxlint. Uses ESM (`"type": "module"`).
- `backend/package-lock.json` and `frontend/package-lock.json`: npm lockfiles (lockfileVersion 3) that pin exact transitive dependency versions and include integrity hashes. Both are committed to the repository, ensuring deterministic builds.
- `.gitignore`: Excludes `node_modules/` from version control in both projects.
- `railway.toml` (root and `backend/`): Deployment configuration used by Railway; the backend includes a `DATABASE_URL` environment variable reference but no custom npm registry configuration.

## Architecture and Conventions

- **Per-package isolation**: Each subproject has its own `package.json` and `package-lock.json`. Dependencies are not shared at the monorepo root level; there is no `pnpm-workspace.yaml`, `yarn.lock`, or npm workspaces config.
- **Version ranges use caret (`^`)**: All dependencies in both `backend/package.json` and `frontend/package.json` specify caret ranges (e.g., `^6.19.3`, `^19.2.8`), allowing minor/patch updates automatically. The exception is `typescript` in the frontend, which uses a tilde range (`~6.0.2`) to restrict patch-only updates.
- **Lockfiles are committed**: Both `package-lock.json` files are tracked in git, so CI and local installs resolve to the exact same tree every time.
- **No vendoring**: `node_modules/` directories exist locally but are ignored by git. Dependencies are fetched from the public npm registry on install.
- **No private registries**: No `.npmrc` file was found in the repository, and all resolved URLs in the lockfiles point to `https://registry.npmjs.org/`. There is no evidence of a private npm registry, scoped private packages, or `GOOGLE_APPLICATION_CREDENTIALS`-style auth for package resolution.
- **Prisma integration**: The backend uses Prisma (`prisma/schema.prisma`) alongside `@prisma/client` and `prisma` as a dev dependency. The build script runs `prisma generate && tsc`, and the start-migrate script runs `prisma db push` before starting the server.
- **Deployment hooks**: The root `package.json` scripts assume a two-step install/build flow (`cd backend && npm install && npm run build`), matching how Railway deploys the backend.

## Constraints and Rules Observed

- Every dependency must be declared explicitly in the appropriate `package.json`; there is no hoisted/shared dependency list.
- Version bumps should use caret ranges unless tighter pinning is needed (as seen with frontend TypeScript's tilde).
- After changing `package.json`, the corresponding `package-lock.json` must be regenerated and committed to keep the lockfile in sync.
- Scripts in the root `package.json` are the canonical entry points for development and deployment; adding new subprojects requires updating these scripts to include them.
- Environment variables (e.g., `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`) are loaded via `dotenv` in the backend and referenced through `.env` / `.env.example` files rather than being baked into dependencies.