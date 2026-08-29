---
kind: dependency_management
name: Multi-Project npm Dependency Management with Lockfiles and Nixpacks Build
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - frontend/package.json
    - backend/package-lock.json
    - frontend/package-lock.json
    - railway.toml
    - backend/.gitignore
    - frontend/.gitignore
---

## What system/approach is used

This repository uses **npm** as the package manager across three separate Node.js/TypeScript projects: a root workspace, a `backend/` Express server, and a `frontend/` React + Vite application. Each project declares its own dependencies in a dedicated `package.json`, and each maintains a corresponding `package-lock.json` lockfile to pin exact transitive dependency versions. There is no monorepo tool (no `pnpm-workspace.yaml`, `lerna.json`, or `turbo.json`) — the root `package.json` only provides convenience scripts that `cd` into each subproject and invoke npm commands.

The backend build and deployment are orchestrated by **Railway** using the `nixpacks` builder (`railway.toml`), which runs `npm install && npm run build` during containerization and executes Prisma migrations at startup.

## Key files and packages

- `package.json` (root) — workspace-level scripts for installing all deps (`install:all`), building both sides (`build:backend`, `build:frontend`), and running dev servers per subproject.
- `backend/package.json` — runtime dependencies include `express`, `@prisma/client`, `jsonwebtoken`, `bcryptjs`, `multer`, `cors`, `dotenv`, `zod`, `@google/generative-ai`; devDependencies include `typescript`, `tsx`, `nodemon`, `prisma`, and type definitions for third-party libs.
- `frontend/package.json` — runtime dependencies include `react`, `react-dom`, `react-router-dom`, `axios`, `react-dropzone`, `lucide-react`; devDependencies include `vite`, `@vitejs/plugin-react`, `tailwindcss`, `oxlint`, and React/Node types.
- `backend/package-lock.json` and `frontend/package-lock.json` — lockfiles committed alongside source, pinning exact dependency trees.
- `railway.toml` — defines the production build pipeline (`builder = "nixpacks"`, build command, start command with `prisma db push`).
- `.gitignore` files in `backend/` and `frontend/` exclude `node_modules/`, `dist/`, `.env`, and generated DB files, ensuring lockfiles remain the single source of truth for reproducible installs.

## Architecture and conventions

- **Per-project isolation**: Each subproject has its own `package.json`, `package-lock.json`, `node_modules/`, and `dist/`. The root does not hoist shared dependencies; there is no shared dependency graph between frontend and backend.
- **Version ranges use caret (`^`)**: All declared dependencies specify semver-compatible ranges via `^`, allowing minor/patch updates while preventing breaking changes. This applies uniformly across both `dependencies` and `devDependencies` in both subprojects.
- **Lockfile-driven reproducibility**: `package-lock.json` is present in both `backend/` and `frontend/`, so CI/Railway resolves an identical tree on every install. No vendoring strategy (e.g., `vendor/` directory) is used — dependencies are fetched from the public npm registry.
- **No private registries or scoped packages beyond npm defaults**: All packages come from the default npm registry; there are no `.npmrc` files, no `registry` overrides, and no private scope usage.
- **Build-time vs runtime separation**: Dev-only tools (`tsx`, `nodemon`, `vite`, `oxlint`, `tailwindcss`, `prisma` CLI) live exclusively under `devDependencies`, keeping production bundles lean.
- **Prisma integration**: The backend pins `prisma` and `@prisma/client` to the same major version (`^6.19.3`) and generates client code as part of the build script (`prisma generate && tsc`). Migrations are applied at runtime via `npx prisma db push` in the Railway start command.

## Conventions and constraints

- **One `package.json` per deployable unit**: Backend and frontend are treated as independent deployments, each with its own manifest and lockfile. The root `package.json` contains only orchestration scripts, not dependency declarations.
- **Lockfiles must be committed**: Both `backend/package-lock.json` and `frontend/package-lock.json` are tracked in version control (they are not listed in any `.gitignore`), making them the authoritative source for deterministic builds.
- **Dependency updates follow semver-caret policy**: All entries use `^` ranges, so updating a dependency means bumping the range to allow compatible upgrades rather than locking to a fixed patch version.
- **Production environment variables are externalized**: Dependencies like `dotenv` load secrets from `.env`, which is gitignored; no credentials are embedded in manifests or lockfiles.
- **Deployment assumes fresh `npm install`**: The Railway `buildCommand` runs `npm install` explicitly, relying on the lockfile to resolve dependencies without pre-cached `node_modules`.