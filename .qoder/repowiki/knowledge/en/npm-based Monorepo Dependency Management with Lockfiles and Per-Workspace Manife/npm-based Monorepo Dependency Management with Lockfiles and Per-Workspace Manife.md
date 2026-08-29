---
kind: dependency_management
name: npm-based Monorepo Dependency Management with Lockfiles and Per-Workspace Manifests
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - frontend/package.json
    - backend/package-lock.json
    - frontend/package-lock.json
    - .nvmrc
    - backend/.nvmrc
    - backend/prisma/schema.prisma
---

## System Overview

This repository uses **npm** as the package manager for both the backend (Node/Express + Prisma) and frontend (React + Vite) workspaces. There is no monorepo tool (e.g., npm workspaces, Turborepo, pnpm, yarn); instead, each subproject (`backend/`, `frontend/`) maintains its own `package.json` and `package-lock.json`, and a root-level `package.json` provides convenience scripts to orchestrate installs and builds across both.

## Key Files

- `package.json` (root): Defines cross-workspace scripts (`install:all`, `build`, `dev:backend`, `dev:frontend`, `seed`) that `cd` into each workspace and invoke its local npm commands. No dependency declarations here — it is purely an orchestrator.
- `backend/package.json`: Declares runtime dependencies (`express`, `@prisma/client`, `jsonwebtoken`, `bcryptjs`, `multer`, `sharp`, `zod`, `@google/generative-ai`, `cors`, `dotenv`) and dev dependencies (`typescript`, `tsx`, `nodemon`, `@types/*`). Uses `engines.node >=20.9.0`.
- `frontend/package.json`: Declares runtime dependencies (`react`, `react-dom`, `react-router-dom`, `axios`, `lucide-react`, `react-dropzone`) and dev dependencies (`vite`, `@vitejs/plugin-react`, `tailwindcss`, `oxlint`, `typescript`, `@types/react*`).
- `backend/package-lock.json` / `frontend/package-lock.json`: Lockfiles pin exact transitive versions for reproducible installs per workspace.
- `.nvmrc` (root and under `backend/`): Pins Node.js version to `22.17.0` for consistent environments.
- `backend/prisma/schema.prisma`: Prisma client generation is wired into the build script via `prisma generate && tsc`.

## Architecture and Conventions

- **Per-workspace manifests**: Each of the two workspaces declares its own dependencies independently; there is no shared dependency graph at the repo root.
- **Lockfile-driven installs**: Both workspaces ship `package-lock.json`, so CI or any developer running `npm install` gets deterministic transitive resolution.
- **Node version pinning**: The root `.nvmrc` (mirrored in `backend/.nvmrc`) pins Node to `22.17.0`. The backend manifest additionally declares `engines.node >=20.9.0`, providing a soft constraint for engines that honor it.
- **Build-time code generation**: Backend dependencies include `prisma` and `@prisma/client`; the `build` script runs `prisma generate` before TypeScript compilation, ensuring the generated Prisma client is always present.
- **Dev vs runtime separation**: Dependencies are split between `dependencies` and `devDependencies` in both workspaces (e.g., `tsx` and `nodemon` only in backend dev deps; `oxlint` and `vite` only in frontend dev deps).
- **No vendoring**: All third-party packages are resolved from the public npm registry via npm's default resolver; no `vendor/` directories or private registries are configured.

## Conventions and Constraints

- **Version ranges use caret (`^`)**: All declared versions in both `package.json` files use `^` (e.g., `"express": "^5.2.1"`, `"react": "^19.2.8"`), allowing minor/patch updates within the major version while keeping lockfiles pinned for reproducibility.
- **Single Node version enforced by `.nvmrc`**: Developers should use the Node version specified in `.nvmrc` (`22.17.0`) to avoid compatibility drift.
- **Prisma lifecycle tied to npm scripts**: Database migrations and schema generation are invoked through npm scripts (`prisma:migrate`, `prisma:push`, `prisma:generate`, `prisma:studio`), not ad-hoc CLI calls.
- **No private registry or `npmrc` configuration found**: The repository does not contain a `.npmrc` file or `NPM_CONFIG_*` environment variables pointing to a private registry; all packages resolve from the public npm registry.
- **No dependency update automation**: There is no Dependabot, Renovate, or similar bot configuration visible in the repository tree; updates are expected to be performed manually by editing the relevant `package.json` and committing the resulting `package-lock.json` changes.