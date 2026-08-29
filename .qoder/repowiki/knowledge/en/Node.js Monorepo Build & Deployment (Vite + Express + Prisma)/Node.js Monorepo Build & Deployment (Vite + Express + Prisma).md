---
kind: build_system
name: Node.js Monorepo Build & Deployment (Vite + Express + Prisma)
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - frontend/package.json
    - backend/tsconfig.json
    - frontend/vite.config.ts
    - railway.toml
    - frontend/vercel.json
    - .nvmrc
---

## Overview

The project is a Node.js monorepo with two independent applications — a TypeScript/Express backend (`backend/`) and a React/Vite frontend (`frontend/`) — orchestrated from a root `package.json`. There are no Makefiles, Dockerfiles, or CI pipelines; build and deployment are driven by npm scripts, Vite, TypeScript, Prisma CLI, and platform-specific deploy configs (Railway for the backend, Vercel for the frontend).

## Build Tools & Scripts

- **Root orchestrator** (`package.json`): provides workspace-level scripts that `cd` into each subproject:
  - `build`: builds only the backend.
  - `build:backend`, `build:frontend`: per-app builds.
  - `dev:backend`, `dev:frontend`: parallel development servers.
  - `install:all`: installs dependencies in both apps.
  - `seed`: runs backend seed scripts.
- **Backend build** (`backend/package.json`):
  - `build`: runs `prisma generate` then `tsc` (TypeScript compilation to `dist/`).
  - `start:migrate`: runs `prisma db push` then starts the compiled server.
  - Runtime entry: `dist/index.js`.
  - Development uses `tsx watch` for hot-reload of `.ts` sources.
- **Frontend build** (`frontend/package.json`):
  - `build`: runs `tsc -b` (TypeScript project references) then `vite build` producing static assets under `frontend/dist/`.
  - `lint`: runs `oxlint`.
  - Development uses `vite` dev server with proxy rules configured in `vite.config.ts`.
- **TypeScript**: Backend targets ES2020 with `module: NodeNext`; output goes to `backend/dist/` with source maps and declaration files enabled. Frontend uses TS project references via `tsc -b`.
- **Prisma**: Schema lives at `backend/prisma/schema.prisma`; `prisma generate` is part of every backend build, and migrations are applied via `prisma db push` at runtime on Railway.

## Environment & Version Pinning

- Node version pinned at the repo root via `.nvmrc` = `22.17.0`.
- Backend declares `engines.node >= 20.9.0`.
- Railway explicitly pins `NODE_VERSION = "22.17.0"` and `NIXPACKS_NODE_VERSION = "22.17.0"` in `railway.toml` because the `sharp` dependency requires Node ≥ 20.9.

## Deployment Targets

- **Backend → Railway** (`railway.toml`):
  - Builder: `nixpacks`.
  - Build command: `cd backend && npm install && npm run build`.
  - Start command: `cd backend && npx prisma db push && node dist/index.js`.
  - Restart policy: `on_failure`, max retries 3.
- **Frontend → Vercel** (`frontend/vercel.json`): serves the built static site produced by `vite build`.
- The Vite dev server proxies `/api` and `/uploads` requests to the backend target defined by `VITE_API_URL` (default `http://localhost:5000`).

## Conventions Observed

- Each subproject manages its own `node_modules` and `package-lock.json`; there is no monorepo tool (no `pnpm workspaces`, `npm workspaces`, or `turbo` config).
- The root `package.json` acts as a thin shim — it does not declare any dependencies, only scripts that delegate to subprojects.
- Database schema changes are applied at runtime via `prisma db push` rather than migration files on this deployment path.
- Source maps are generated for the backend (`sourceMap: true` in `tsconfig.json`) but disabled for the frontend production build (`sourcemap: false` in `vite.config.ts`).
- No test runner or linting step is wired into the build pipeline; linting (`oxlint`) exists as a standalone script in the frontend.
- No Dockerfile or CI/CD pipeline was found in the repository; deployment relies entirely on the declarative `railway.toml` and `vercel.json` files.