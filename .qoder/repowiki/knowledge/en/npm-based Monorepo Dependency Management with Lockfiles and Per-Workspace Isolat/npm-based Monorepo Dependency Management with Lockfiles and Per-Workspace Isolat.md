---
kind: dependency_management
name: npm-based Monorepo Dependency Management with Lockfiles and Per-Workspace Isolation
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - frontend/package.json
    - backend/package-lock.json
    - frontend/package-lock.json
    - backend/.nvmrc
    - backend/prisma/schema.prisma
    - frontend/.gitignore
---

## System Overview

The Flash Claim project uses **npm** as the package manager across a multi-workspace monorepo (root + `backend/` + `frontend/`). Each workspace maintains its own `package.json`, `package-lock.json`, and `node_modules/`, with no shared dependency hoisting or npm workspaces configuration. The root `package.json` provides convenience scripts that invoke `npm install` per workspace.

## Key Files and Packages

- **Root**: `package.json` — orchestration scripts only (`build`, `start`, `dev:backend`, `dev:frontend`, `install:all`, `seed`); no dependencies declared here.
- **Backend**: `backend/package.json` — declares runtime dependencies (`express`, `@prisma/client`, `jsonwebtoken`, `bcryptjs`, `multer`, `sharp`, `zod`, `@google/generative-ai`, `dotenv`) and dev dependencies (`typescript`, `tsx`, `nodemon`, Prisma CLI, type packages). Node engine pinned to `>=20.9.0`.
- **Frontend**: `frontend/package.json` — React 19 + Vite stack (`react`, `react-dom`, `react-router-dom`, `axios`, `lucide-react`, `react-dropzone`) plus Tailwind v4 and Oxlint tooling.
- **Lockfiles**: `backend/package-lock.json` and `frontend/package-lock.json` pin exact transitive versions for reproducible installs.
- **Node version**: `backend/.nvmrc` pins Node `22.17.0`; root `.nvmrc` also present for consistent runtime.
- **Prisma**: `backend/prisma/schema.prisma` is generated via `prisma generate` in the build script; Prisma client is treated as a first-class dependency alongside the schema.

## Architecture and Conventions

- **Per-workspace isolation**: Backend and frontend each have independent `package.json` files and lockfiles. There is no `package-lock.json` at the repo root, so cross-workspace dependency sharing does not exist.
- **Version ranges**: All dependencies use caret (`^`) ranges (e.g. `^6.19.3`, `^19.2.8`), allowing minor/patch updates while keeping major-version boundaries.
- **Build-time codegen**: Prisma types are generated from `schema.prisma` during build (`"build": "prisma generate && tsc"`), making the generated client part of the installed dependency graph rather than vendored source.
- **Dev vs runtime separation**: Backend separates runtime deps (`dependencies`) from tooling (`devDependencies` like `tsx`, `nodemon`, `typescript`). Frontend similarly isolates build tooling (`vite`, `oxlint`, `tailwindcss`) from shipped runtime deps.
- **No vendoring**: `node_modules/` directories are gitignored (see `frontend/.gitignore`); dependencies are fetched from the public npm registry on install.

## Conventions and Constraints

- **Node version enforcement**: The backend `engines.node` field requires `>=20.9.0`; the `.nvmrc` files pin a specific LTS release (`22.17.0`) for developer consistency.
- **Reproducible installs**: Lockfiles (`package-lock.json`) in both workspaces ensure deterministic dependency trees across environments.
- **No private registries or scoped packages**: No `.npmrc` file was found, and no `@scope/` packages are used beyond official scopes (`@prisma`, `@google`, `@types`, `@tailwindcss`, `@vitejs`, `@types/*`). Dependencies are sourced from the default public npm registry.
- **Script-driven lifecycle**: All installation and build steps go through npm scripts defined in each workspace's `package.json`; the root scripts delegate to subworkspaces rather than using npm/yarn workspaces features.
- **Type safety via `@types/*`**: Backend explicitly lists `@types/*` packages (for `express`, `cors`, `jsonwebtoken`, `multer`, `bcryptjs`, `node`) as dev dependencies to provide TypeScript definitions for third-party JS libraries.