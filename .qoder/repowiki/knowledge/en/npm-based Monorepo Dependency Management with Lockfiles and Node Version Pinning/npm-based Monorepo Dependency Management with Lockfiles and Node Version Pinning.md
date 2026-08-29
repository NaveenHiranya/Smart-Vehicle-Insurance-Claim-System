---
kind: dependency_management
name: npm-based Monorepo Dependency Management with Lockfiles and Node Version Pinning
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

This repository uses **npm** as the package manager for both the Express/TypeScript backend (`backend/`) and the React/Vite frontend (`frontend/`). It is structured as a **multi-package monorepo** with a root `package.json` that provides convenience scripts to orchestrate install/build/start across both packages, but each subproject maintains its own independent dependency graph.

## Key Files

- `package.json` (root) — workspace-level scripts (`install:all`, `build`, `dev:backend`, `dev:frontend`, `seed`) that `cd` into each subdirectory and invoke their local npm commands. No shared dependencies are declared here; it is purely orchestration.
- `backend/package.json` — declares runtime dependencies (`express`, `@prisma/client`, `jsonwebtoken`, `bcryptjs`, `multer`, `sharp`, `zod`, `@google/generative-ai`, `cors`, `dotenv`) and dev dependencies (`typescript`, `tsx`, `nodemon`, Prisma CLI, and `@types/*` packages).
- `frontend/package.json` — declares runtime dependencies (`react`, `react-dom`, `react-router-dom`, `axios`, `lucide-react`, `react-dropzone`) and dev dependencies (`vite`, `typescript`, `oxlint`, Tailwind plugins, `@types/*`).
- `backend/package-lock.json` and `frontend/package-lock.json` — lockfiles pin exact transitive dependency versions for reproducible installs.
- `.nvmrc` at repo root and `backend/.nvmrc` — both pin Node.js version `22.17.0`, ensuring consistent runtime behavior across environments.
- `backend/tsconfig.json` and `frontend/tsconfig*.json` — TypeScript configuration used alongside `tsx` in the backend and `tsc -b` in the frontend build.

## Architecture and Conventions

- **Per-package manifests**: Each subproject has its own `package.json` with separate `dependencies` and `devDependencies`. There is no `workspaces` field or shared root dependency list — the root only shells out to child directories.
- **Version ranges use caret (`^`)**: All dependencies in both packages specify semver ranges with `^`, allowing minor/patch updates within the major version (e.g. `express ^5.2.1`, `react ^19.2.8`). This is paired with `package-lock.json` files that freeze the resolved tree for deterministic builds.
- **Node version pinning**: The project pins Node to `22.17.0` via `.nvmrc` at the repo root and under `backend/`. The backend's `package.json` also declares an `engines.node >= 20.9.0` constraint, which is broader than the `.nvmrc` pin.
- **No vendoring**: Dependencies are installed from the public npm registry into `node_modules/` directories under each package. There is no `vendor/`, `yarn.lock`-style offline cache, or private registry configured in any visible config file.
- **Prisma integration**: The backend uses Prisma (`prisma` CLI + `@prisma/client`) with schema defined in `backend/prisma/schema.prisma`. Build scripts run `prisma generate` before TypeScript compilation, tying dependency resolution to codegen.
- **Dev tooling separation**: Type definitions live in `devDependencies` (e.g. `@types/express`, `@types/node`, `@types/react`) rather than being bundled with runtime deps, keeping production bundles lean.

## Conventions and Constraints

- **Lockfiles are committed**: Both `backend/package-lock.json` and `frontend/package-lock.json` are present in the repo, enforcing that all collaborators resolve to the same transitive dependency tree.
- **Node version must match `.nvmrc`**: The presence of `.nvmrc` files signals that development should be done with Node 22.17.0 (managed via nvm). CI or local setups should honor this file.
- **No private registry or scoped packages**: All dependencies are pulled from the default npm registry; there is no `.npmrc` with `registry=`, `@scope:registry=`, or `always-auth` settings visible in the repo.
- **Runtime vs dev split**: Runtime-only libraries (Express, React, Axios, etc.) go in `dependencies`; tooling (TypeScript, Vite, Oxlint, nodemon, tsx, Prisma CLI, type definitions) goes in `devDependencies`.
- **Build scripts enforce order**: Backend `build` runs `prisma generate && tsc`; root `build` chains into the backend directory first, ensuring generated types exist before compilation.
- **Frontend uses ESM**: `"type": "module"` in `frontend/package.json` dictates module resolution for the entire frontend package.