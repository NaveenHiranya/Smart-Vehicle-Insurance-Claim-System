---
kind: dependency_management
name: npm-based Monorepo Dependency Management with Lockfiles and Nixpacks Build
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
    - backend/prisma/schema.prisma
---

## System/Approach

This repository uses **npm** as the package manager for both the backend (Node.js/Express) and frontend (React/Vite) subprojects. There is no monorepo tool (no `package.json` workspaces, no pnpm workspace, no Turborepo); instead, each subdirectory (`backend/`, `frontend/`) maintains its own independent `package.json` and `package-lock.json`. A root-level `package.json` provides convenience scripts that `cd` into each subproject to install/build/start them.

Dependency resolution is locked via npm lockfiles (`backend/package-lock.json`, `frontend/package-lock.json`). The deployment pipeline on Railway uses `nixpacks` builder and runs `npm install && npm run build` in the `backend/` directory; the frontend is built separately (likely deployed to Vercel per `vercel.json`).

## Key Files

- `backend/package.json` — declares runtime dependencies (`express`, `@prisma/client`, `jsonwebtoken`, `bcryptjs`, `multer`, `zod`, `@google/generative-ai`, `cors`, `dotenv`) and dev dependencies (`typescript`, `tsx`, `nodemon`, Prisma CLI, type packages).
- `frontend/package.json` — declares runtime dependencies (`react`, `react-dom`, `react-router-dom`, `axios`, `lucide-react`, `react-dropzone`) and dev dependencies (`vite`, `@vitejs/plugin-react`, `tailwindcss`, `oxlint`, TypeScript types).
- `package.json` (root) — orchestration scripts: `install:all`, `dev:backend`, `dev:frontend`, `build:backend`, `build:frontend`, `start`, `seed`.
- `backend/package-lock.json` / `frontend/package-lock.json` — deterministic dependency trees.
- `railway.toml` — CI/deploy build command pins `npm install && npm run build` for the backend; deploy step runs `npx prisma db push && node dist/index.js`.
- `backend/prisma/schema.prisma` — Prisma schema is generated into the client during `npm run build` via `prisma generate`.

## Architecture and Conventions

- **Per-subproject manifests**: Each of the two subprojects has its own `package.json`, allowing independent versioning of frameworks (e.g., backend uses Express 5.x, frontend uses React 19.x and Vite 8.x).
- **Caret-versioned dependencies**: All dependencies use `^` ranges (e.g., `"express": "^5.2.1"`, `"react": "^19.2.8"`), allowing minor/patch updates automatically while pinning major versions.
- **TypeScript-first**: Both projects declare TypeScript as a dev dependency and compile to JS; the backend compiles via `tsc` and the frontend via `tsc -b && vite build`.
- **Prisma integration**: The backend's build script chains `prisma generate && tsc`; the deploy step pushes migrations via `npx prisma db push` before starting the server.
- **No vendoring or private registry**: Dependencies are resolved from the public npm registry. No `.npmrc`, `yarn.lock`, `pnpm-lock.yaml`, or vendor directories exist.
- **Root orchestration only**: The root `package.json` does not declare any dependencies itself — it only contains scripts that delegate to the subprojects.

## Conventions and Constraints

- **Lockfiles must be committed**: Both `backend/package-lock.json` and `frontend/package-lock.json` are present, ensuring reproducible installs across environments.
- **Build reproducibility**: The Railway build explicitly runs `npm install` (not `npm ci`), so exact pinned versions come from the lockfile but the process is not fully immutable (a fresh install could resolve differently if the lockfile were missing). For strict CI reproducibility, `npm ci` would be more deterministic than `npm install`.
- **Dev vs production split**: Runtime-only packages live under `dependencies`; build/tooling packages (`typescript`, `tsx`, `nodemon`, `vite`, `oxlint`, Prisma CLI, all `@types/*`) live under `devDependencies`.
- **Environment variables**: Dependencies like `dotenv` are used at runtime; secrets are loaded from `.env` (backed by `.env.example` templates) rather than package configuration.
- **No shared workspace config**: Because there are no npm workspaces, adding a new subproject requires creating a new `package.json` and updating the root scripts manually.