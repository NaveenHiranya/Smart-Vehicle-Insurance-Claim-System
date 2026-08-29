---
kind: build_system
name: Monorepo Build & Deployment via npm Scripts, Nixpacks, and Vercel
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - frontend/package.json
    - backend/tsconfig.json
    - frontend/tsconfig.app.json
    - frontend/vite.config.ts
    - railway.toml
    - backend/railway.toml
    - frontend/vercel.json
---

## Build System Overview

The Flash Claim platform is a monorepo with separate `backend/` (Express + Prisma + TypeScript) and `frontend/` (React + Vite + TypeScript) workspaces. There is no top-level Makefile or Dockerfile; the build system is driven entirely by npm scripts layered on top of Node tooling, with deployment handled by Railway (backend) and Vercel (frontend).

## Key Files and Packages

- **Root `package.json`** — workspace entry point exposing `build`, `start`, `dev:backend`, `dev:frontend`, `build:backend`, `build:frontend`, `install:all`, and `seed` scripts that delegate to subdirectories.
- **`backend/package.json`** — defines `build: prisma generate && tsc`, `dev: tsx watch src/index.ts`, `start:migrate: prisma db push && node dist/index.js`, and `seed: tsx src/scripts/seedAdmin.ts`. The compiled output is `dist/index.js`.
- **`frontend/package.json`** — defines `build: tsc -b && vite build`, `dev: vite`, `lint: oxlint`. Output goes to `frontend/dist`.
- **`backend/tsconfig.json`** — targets ES2020 / NodeNext, emits to `./dist`, strict mode enabled, generates source maps and declaration files.
- **`frontend/tsconfig.app.json`** — target ES2023, `noEmit: true` (Vite handles emission), uses bundler module resolution, enables unused-variable checks.
- **`frontend/vite.config.ts`** — builds to `dist`, disables sourcemaps in production, proxies `/api` and `/uploads` to the backend during dev (`http://localhost:5000` unless overridden by `VITE_API_URL`).
- **`railway.toml`** (root) — tells Railway to use the nixpacks builder, run `cd backend && npm install && npm run build`, then start with `cd backend && npx prisma db push && node dist/index.js`.
- **`backend/railway.toml`** — alternative per-service config: build via `npm run build`, start with `npx prisma db push && npx tsx src/scripts/seedAdmin.ts && node dist/index.js`, sets `PORT=5000` in production.
- **`frontend/vercel.json`** — declares `buildCommand: npm run build`, `outputDirectory: dist`, `framework: vite`, rewrites all routes to `index.html` for SPA routing, and sets immutable cache headers on `/assets/*`.

## Architecture and Conventions

### Workspace layout
The repo uses a flat monorepo structure rather than a formal lerna/pnpm-workspace setup. Each subproject has its own `package.json`, `node_modules`, and lockfile. The root `package.json` acts as an orchestrator that `cd`s into each directory before invoking its scripts.

### Backend build pipeline
1. `prisma generate` creates the typed Prisma client from `backend/prisma/schema.prisma`.
2. `tsc` compiles `src/**/*.ts` into `dist/` using NodeNext module resolution.
3. Runtime startup runs `node dist/index.js`.
4. Database migrations are applied at runtime via `prisma db push` (development) or `prisma migrate dev`; seed data is loaded via `tsx src/scripts/seedAdmin.ts`.

### Frontend build pipeline
1. `tsc -b` performs a type-check build (no emit) against the project references.
2. `vite build` produces a static bundle under `frontend/dist`.
3. During development, Vite serves the app and proxies API/file requests to the backend, so frontend and backend can be run concurrently without CORS concerns.

### Deployment targets
- **Backend → Railway**: Uses the nixpacks builder. Two `railway.toml` files exist (root and `backend/`); both configure `builder = "nixpacks"` and a `startCommand` that runs Prisma migrations before launching the server. Restart policy is `on_failure` with up to 3 retries.
- **Frontend → Vercel**: Declares the Vite framework, builds to `dist`, and rewrites all routes to `index.html` for client-side routing.

### Environment configuration
- Backend reads secrets via `dotenv` (`.env` / `.env.example` present).
- Frontend loads env via Vite's `loadEnv`, defaulting `VITE_API_URL` to `http://localhost:5000` for local dev proxying.

## Conventions and Constraints

- **TypeScript-first compilation**: Both sides compile TypeScript; the backend emits JS (`outDir: ./dist`) while the frontend relies on Vite with `noEmit` and only uses `tsc -b` for type checking.
- **Prisma schema-driven DB**: Schema lives in `backend/prisma/schema.prisma`; database state is pushed/migrated at runtime via `prisma db push` / `prisma migrate dev` rather than checked-in migration files.
- **No container image**: There is no `Dockerfile`; deployment relies on Railway's nixpacks auto-detection.
- **Single-process runtime**: The backend starts one `node dist/index.js` process; there is no PM2, systemd, or process manager configured beyond Railway's restart policy.
- **Seed-on-start (backend/Railway)**: The `backend/railway.toml` explicitly seeds admin users on every deploy via `npx tsx src/scripts/seedAdmin.ts`.
- **SPA routing fallback**: Vercel rewrites all non-asset paths to `/index.html` to support React Router history mode.
- **Asset caching**: Vercel serves `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`.
- **Dev convenience scripts**: Root `npm run dev:backend` and `dev:frontend` allow parallel local development; `npm run start` boots the backend with automatic migration.