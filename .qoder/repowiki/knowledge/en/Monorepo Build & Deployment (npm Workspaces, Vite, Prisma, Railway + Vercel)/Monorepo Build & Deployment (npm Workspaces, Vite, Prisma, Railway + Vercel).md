---
kind: build_system
name: Monorepo Build & Deployment (npm Workspaces, Vite, Prisma, Railway + Vercel)
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
    - backend/prisma/schema.prisma
---

## System Overview

The project is a monorepo with separate `backend/` (Node.js/Express + TypeScript) and `frontend/` (React + Vite) subprojects. There is no shared workspace configuration; instead, the root `package.json` provides convenience scripts that `cd` into each subdirectory to invoke its own toolchain. The backend is deployed as a Node process on Railway using Nixpacks, while the frontend static assets are deployed to Vercel.

## Build Toolchain

- **Backend** — TypeScript compiled via `tsc` (target ES2020, module `NodeNext`, strict mode). Output lands in `backend/dist/`. Prisma client is generated before compilation (`prisma generate && tsc`). Runtime entry is `dist/index.js`.
- **Frontend** — Vite build (`vite build`) after type-checking via `tsc -b`. Output directory is `frontend/dist/`. Development uses `vite dev` with a proxy that forwards `/api` and `/uploads` requests to the configured backend target (`VITE_API_URL`, default `http://localhost:5000`).
- **Linting** — Frontend uses `oxlint` (`npm run lint`); no backend linter is configured.
- **Database migrations** — Prisma is used for schema management. Local development runs `prisma db push` (via `start:migrate`); production deployment also runs `prisma db push` at start time.

## Key Scripts

Root-level `package.json` exposes:
- `build` — installs backend deps then builds backend only.
- `build:backend` / `build:frontend` — per-subproject builds.
- `dev:backend` / `dev:frontend` — parallel local development.
- `install:all` — installs both backends.
- `seed` — runs `tsx src/scripts/seedAdmin.ts` and `seedPolicyTemplates.ts`.
- `start` — runs `prisma db push` then starts the backend.

Backend `package.json` scripts: `dev` (tsx watch), `build`, `start`, `start:migrate`, `prisma:*` helpers, `seed`.

Frontend `package.json` scripts: `dev`, `build` (type-check then vite build), `lint`, `preview`.

## Deployment Configuration

### Backend — Railway
`railway.toml` declares:
- Builder: `nixpacks`.
- Build command: `cd backend && npm install && npm run build`.
- Start command: `cd backend && npx prisma db push && node dist/index.js`.
- Restart policy: restart on failure, max 3 retries.

No Dockerfile is present; Railway's Nixpacks auto-detects the Node.js project from `backend/package.json`.

### Frontend — Vercel
`frontend/vercel.json` configures:
- Framework: `vite`.
- Build command: `npm run build`.
- Output directory: `dist`.
- SPA rewrites: all routes fall back to `/index.html`.
- Cache headers: long-lived immutable caching for `/assets/*`.

## Conventions & Constraints

1. **Per-subproject dependency management** — Each subproject has its own `package.json`, `node_modules`, and lockfile. The root package.json does not use npm workspaces; it only shells into subdirectories.
2. **TypeScript output location** — Backend compiles to `backend/dist`; frontend compiles to `frontend/dist`. Both deploy targets expect this layout.
3. **Prisma schema-driven DB** — Schema lives in `backend/prisma/schema.prisma`. Migrations are applied via `prisma db push` both locally (`start:migrate`) and at Railway startup; there is no explicit migration file generation step in CI.
4. **Environment variables** — Backend loads `.env` via `dotenv`; frontend reads `VITE_API_URL` at build time through Vite's `loadEnv`.
5. **No CI pipeline** — No GitHub Actions, GitLab CI, or other CI files were found. Builds are driven by platform-native hooks (Railway Nixpacks build, Vercel build).
6. **No Dockerfile** — Containerization is delegated entirely to Railway's Nixpacks builder.
7. **Dev proxy convention** — Frontend dev server proxies `/api` and `/uploads` to the backend target so the SPA can call the same origin during development.