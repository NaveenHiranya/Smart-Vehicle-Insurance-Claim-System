---
kind: build_system
name: Monorepo Build & Deployment (npm Workspaces, Nixpacks/Railway, Vercel)
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
---

## What system/approach is used

The project is a Node.js monorepo with two sub-projects — `backend/` (Express + TypeScript + Prisma) and `frontend/` (React + Vite). There is no top-level package manager workspace; instead the root `package.json` delegates to each subdirectory via `cd` scripts. The backend is compiled to plain JavaScript under `backend/dist/` using `tsc` and run with Node. The frontend is built as static assets under `frontend/dist/` by Vite. Deployment targets are Railway for the backend (using Nixpacks) and Vercel for the frontend.

## Key files and packages

- Root orchestrator: `package.json` — defines cross-project scripts (`build`, `start`, `dev:backend`, `dev:frontend`, `build:backend`, `build:frontend`, `install:all`, `seed`).
- Backend build: `backend/package.json` — `build` runs `prisma generate && tsc`; `start:migrate` runs `prisma db push && node dist/index.js`; development uses `tsx watch src/index.ts`.
- Frontend build: `frontend/package.json` — `build` runs `tsc -b && vite build`; dev uses `vite`; lint uses `oxlint`.
- Backend compiler: `backend/tsconfig.json` — target ES2020, module `NodeNext`, strict mode, outputs to `./dist`, source maps enabled.
- Frontend bundler: `frontend/vite.config.ts` — React + Tailwind plugins, env-driven `VITE_API_URL`, dev proxy rewrites `/api` and `/uploads` to the backend target, sourcemaps disabled in production builds.
- Backend deployment: `railway.toml` — builder `nixpacks`, build command `cd backend && npm install && npm run build`, start command `cd backend && npx prisma db push && node dist/index.js`, restart policy on failure with max 3 retries.
- Frontend deployment: `frontend/vercel.json` — framework `vite`, build output `dist/`, SPA rewrite rule, long-lived cache headers for `/assets/*`.
- Database schema/migrations live under `backend/prisma/schema.prisma` and are applied at deploy time via `prisma db push`.

## Architecture and conventions

- **Single-root script hub**: All cross-cutting commands (`build`, `start`, `dev:*`, `install:all`) live in the root `package.json`. Local development is started per-subproject via `npm run dev:backend` / `npm run dev:frontend`; there is no concurrent dev server orchestration script.
- **Backend compile-and-run model**: Source lives in `src/`, compilation produces `dist/` (per `tsconfig.json`), and runtime entry is `dist/index.js`. Prisma client generation (`prisma generate`) is part of the build step so the generated types are shipped with the artifact.
- **Database migration strategy**: Development and deployment both use `prisma db push` (schema push, not versioned migrations) rather than `prisma migrate deploy`. This means the database schema is always synchronized from `schema.prisma` at startup.
- **Frontend asset pipeline**: Vite compiles TypeScript via `tsc -b` first (project references implied by `-b`), then bundles to `dist/`. Environment variables are loaded through Vite's `loadEnv` and exposed to the browser via the `VITE_` prefix (e.g. `VITE_API_URL`).
- **Dev-time API proxying**: The Vite dev server proxies `/api` and `/uploads` to the configured backend URL, allowing the frontend to call relative endpoints during local development without CORS concerns.
- **Deployment separation**: Backend → Railway (Nixpacks); Frontend → Vercel. Each platform has its own configuration file that declares its own build and start commands, keeping deployments decoupled.

## Conventions and constraints

- **Build order is explicit in scripts**: The root `build` script installs and builds only the backend; the frontend must be built separately via `npm run build:frontend`. There is no single command that builds both sides together beyond running them sequentially.
- **Prisma is regenerated on every backend build** (`prisma generate && tsc`), ensuring generated client code stays in sync with `schema.prisma`.
- **Schema drift is resolved at deploy time** via `prisma db push` in both `start:migrate` and the Railway start command — no separate migration artifacts are produced or committed.
- **Strict TypeScript settings** are enforced in the backend (`strict: true`, `esModuleInterop`, `forceConsistentCasingInFileNames`, `sourceMap: true`).
- **Production builds disable frontend sourcemaps** (`sourcemap: false` in `vite.config.ts` build config).
- **Railway restart policy** is set to `on_failure` with a maximum of 3 retries, providing basic resilience for the backend process.
- **Vercel serves the frontend as an SPA** with a catch-all rewrite to `/index.html` and immutable caching for `/assets/*`.
- **No Dockerfile or Makefile exists**; containerization is delegated entirely to Railway's Nixpacks builder.