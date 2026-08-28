---
kind: dependency_management
name: npm-based dependency management with per-workspace package.json and lockfiles
category: dependency_management
scope:
    - '**'
source_files:
    - backend/package.json
    - backend/package-lock.json
    - frontend/package.json
    - frontend/package-lock.json
    - .gitignore
---

## What system/approach is used

This repository uses **npm** as the package manager for both the backend (Express/Prisma) and frontend (React/Vite) workspaces. Dependencies are declared in separate `package.json` files under `backend/` and `frontend/`, each with its own `package-lock.json` lockfile. There is no monorepo tooling (no `pnpm-workspace.yaml`, `lerna.json`, `turbo.json`, or root `package.json`) — the two projects are independent npm packages that happen to live side-by-side.

## Key files and packages

- `backend/package.json` — declares runtime dependencies (`express`, `@prisma/client`, `jsonwebtoken`, `bcryptjs`, `multer`, `zod`, `@google/generative-ai`, etc.) and dev dependencies (`typescript`, `tsx`, `nodemon`, `@types/*`). Scripts include Prisma lifecycle commands (`prisma:generate`, `prisma:migrate`, `prisma:push`, `prisma:studio`) and a TypeScript build/start pipeline.
- `frontend/package.json` — declares React + Vite stack (`react`, `react-dom`, `react-router-dom`, `axios`, `lucide-react`, `react-dropzone`) plus Tailwind v4, Oxlint, and TypeScript. Build script chains `tsc -b && vite build`.
- `backend/package-lock.json` / `frontend/package-lock.json` — deterministic lockfiles pin exact resolved versions of every transitive dependency.
- `.gitignore` at repo root excludes `node_modules/` directories, so dependencies are never committed; only manifests and lockfiles are versioned.

## Architecture and conventions

- **Per-project isolation**: Each workspace manages its own dependency graph independently. There is no shared dependency hoisting or workspace protocol between `backend/` and `frontend/`.
- **Version ranges**: All dependencies use caret (`^`) ranges (e.g. `"express": "^5.2.1"`, `"react": "^19.2.8"`), allowing minor/patch updates while blocking major bumps. The sole exception is `typescript` in the frontend, pinned with tilde (`"~6.0.2"`) to restrict patch-level drift.
- **Type safety via `@types/*`**: Backend pins matching `@types` packages for `express`, `cors`, `jsonwebtoken`, `multer`, and `bcryptjs`; frontend pins `@types/react` and `@types/react-dom`. This keeps type definitions aligned with runtime packages.
- **Build-time vs runtime separation**: Runtime-only packages live under `dependencies`; build/dev tools (`typescript`, `tsx`, `nodemon`, `vite`, `oxlint`, `tailwindcss`, `@vitejs/plugin-react`) live under `devDependencies`.
- **No vendoring or private registries**: No `vendor/` directory, no `.npmrc` registry overrides, no scoped private packages. All packages are pulled from the public npm registry.
- **Prisma integration**: `prisma` is listed as a dependency alongside `@prisma/client`, and Prisma schema lives in `backend/prisma/schema.prisma`. Generation/migration steps are exposed as npm scripts rather than being invoked ad-hoc.

## Conventions and constraints

- **Lockfiles must be committed**: Both `package-lock.json` files are present in the repo, ensuring reproducible installs across environments.
- **`node_modules` is ignored**: The root `.gitignore` excludes `node_modules/`, so dependencies are always reinstalled from manifests during setup.
- **Scripts define the install/build contract**: Consumers are expected to run `npm install` in each workspace separately, then use the scripts defined in each `package.json` (e.g. `npm run dev`, `npm run build`, `npm run prisma:migrate`).
- **Major-version boundaries enforced by `^` ranges**: Upgrading to a new major version requires an explicit edit to `package.json`; it will not happen automatically through normal `npm update` flows.