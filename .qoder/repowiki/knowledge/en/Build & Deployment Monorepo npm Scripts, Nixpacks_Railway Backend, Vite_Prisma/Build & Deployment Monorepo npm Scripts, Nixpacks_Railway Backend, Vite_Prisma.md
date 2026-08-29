---
kind: build_system
name: 'Build & Deployment: Monorepo npm Scripts, Nixpacks/Railway Backend, Vite/Prisma'
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - backend/tsconfig.json
    - frontend/package.json
    - frontend/vite.config.ts
    - railway.toml
    - frontend/vercel.json
    - .nvmrc
    - backend/.env.example
    - frontend/.env.example
---

## Build System Overview

This is a monorepo containing a TypeScript/Express backend and a React/Vite frontend, each with its own `package.json`. There is no Makefile or Dockerfile; build orchestration is handled entirely through npm scripts at the repo root plus platform-specific deployment configs.

## Key Files

- `package.json` (root) — top-level orchestrator scripts that `cd` into subprojects (`build`, `build:backend`, `build:frontend`, `dev:backend`, `dev:frontend`, `install:all`, `seed`).
- `backend/package.json` — defines Node.js engine `>=20.9.0`, build script `prisma generate && tsc`, dev via `tsx watch`, start via `node dist/index.js`, and Prisma commands (`migrate`, `push`, `studio`, `generate`).
- `backend/tsconfig.json` — compiles `src/**/*` to `dist/` with `target: ES2020`, `module: NodeNext`, strict mode enabled, emits declarations + source maps.
- `frontend/package.json` — Vite-based build (`tsc -b && vite build`), lint via `oxlint`, dev server via `vite`.
- `frontend/vite.config.ts` — builds to `dist/`, uses `@vitejs/plugin-react` and `@tailwindcss/vite`; dev server proxies `/api` and `/uploads` to `$VITE_API_URL` (default `http://localhost:5000`).
- `railway.toml` — Railway deployment config using `nixpacks` builder; build runs `cd backend && npm install && npm run build`; deploy runs `npx prisma db push && node dist/index.js`; pins `NODE_VERSION` and `NIXPACKS_NODE_VERSION` to `22.17.0` because Sharp requires Node ≥ 20.9.
- `frontend/vercel.json` — present for Vercel hosting of the static frontend build.
- `.nvmrc` (repo root and `backend/`) — pins Node version across environments.
- `backend/.env.example` / `frontend/.env.example` — environment variable templates.

## Architecture & Conventions

- **Monorepo without a package manager workspace**: The root `package.json` does not use `workspaces`; instead it shells out to `cd backend/frontend && npm ...`. Each subproject manages its own dependencies independently.
- **Backend build pipeline**:
  1. `prisma generate` generates the Prisma client from `backend/prisma/schema.prisma`.
  2. `tsc` compiles TypeScript to `backend/dist/`.
  3. Runtime starts with `node dist/index.js`.
  4. Database migration on deploy is done via `npx prisma db push` (development/migration workflow).
- **Frontend build pipeline**:
  1. `tsc -b` performs type-checking across project references.
  2. `vite build` produces a static `frontend/dist/` bundle.
  3. Dev server proxies API calls to the backend so local development works without CORS concerns.
- **Environment variables**: Frontend reads `VITE_API_URL` at build time via `loadEnv`; backend loads env via `dotenv` at runtime.
- **Node version pinning**: Enforced via `engines.node >= 20.9.0` in `backend/package.json`, `.nvmrc` files, and explicit `NODE_VERSION = "22.17.0"` in `railway.toml` to satisfy Sharp's native binary requirement.

## Deployment Targets

- **Railway** (backend): Uses `nixpacks` builder defined in `railway.toml`. Build step installs deps and runs `npm run build`; deploy step pushes the DB schema and starts the compiled server. Restart policy is `on_failure` with max 3 retries.
- **Vercel** (frontend): `vercel.json` is present, indicating the built `frontend/dist/` is deployed as a static site.
- **Local development**: Root scripts `dev:backend` (tsx watch) and `dev:frontend` (vite) are used side-by-side; the Vite dev server proxies `/api` and `/uploads` to the backend.

## Constraints & Rules Observed

- Backend must be built before running (`prisma generate && tsc`); there is no runtime compilation.
- Database schema changes are applied via `prisma db push` during deploy (not migrations), which overwrites schema state — appropriate for this project's scope but not suited for production data preservation.
- Node version is pinned to 22.17.0 on Railway and constrained to ≥ 20.9.0 locally due to Sharp/native module requirements.
- No Dockerfile exists; containerization is delegated to Railway's Nixpacks builder.
- No CI/CD pipeline file (e.g., GitHub Actions) was found in the repository; build steps are defined only in `package.json` scripts and `railway.toml`.