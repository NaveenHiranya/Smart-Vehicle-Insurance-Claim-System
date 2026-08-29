---
kind: build_system
name: Node.js Monorepo Build & Deployment (Vite + Express/Prisma on Railway)
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - backend/tsconfig.json
    - backend/prisma/schema.prisma
    - frontend/package.json
    - frontend/vite.config.ts
    - railway.toml
    - frontend/vercel.json
---

## What system/approach is used

This repository is a Node.js monorepo with two sibling packages — `backend/` (Express + TypeScript + Prisma) and `frontend/` (React + Vite). There is no top-level package manager workspace; instead, the root `package.json` uses simple `cd`-based scripts to orchestrate per-package commands. The backend is compiled to plain JavaScript via `tsc` and run under Node; the frontend is built as static assets by Vite. Deployment targets are **Railway** for the backend (via `railway.toml`) and **Vercel** for the frontend (`frontend/vercel.json`). No Dockerfile or CI pipeline file was found in the repo.

## Key files and packages

- Root orchestrator: `package.json` — defines `build`, `start`, `dev:backend`, `dev:frontend`, `build:backend`, `build:frontend`, `install:all`, `seed` scripts that `cd` into each subdirectory and invoke its own npm scripts.
- Backend build: `backend/package.json` — `build` runs `prisma generate && tsc`; `dev` uses `tsx watch src/index.ts`; `start:migrate` runs `prisma db push` then `node dist/index.js`. Runtime pinned via `engines.node >= 20.9.0`.
- Backend compilation: `backend/tsconfig.json` — target ES2020, module `NodeNext`, output to `./dist`, source maps and declaration maps enabled, strict mode on.
- Frontend build: `frontend/package.json` — `build` runs `tsc -b && vite build`; dev server via `vite`; linting via `oxlint`.
- Frontend bundler config: `frontend/vite.config.ts` — React + Tailwind plugins, builds to `dist/`, disables sourcemaps in production, proxies `/api` and `/uploads` to `VITE_API_URL` (default `http://localhost:5000`) during dev.
- Backend deployment: `railway.toml` — Nixpacks builder, build command `cd backend && npm install && npm run build`, start command `cd backend && npx prisma db push && node dist/index.js`, restart policy `on_failure` with max retries 3, production environment pins `NODE_VERSION=22.17.0` and `NIXPACKS_NODE_VERSION=22.17.0` (required because `sharp` needs Node ≥ 20.9).
- Frontend deployment: `frontend/vercel.json` (present at repo root of the frontend directory) — Vercel configuration for serving the Vite-built static site.
- Database schema: `backend/prisma/schema.prisma` — Prisma schema used by both `prisma generate` and `prisma db push`.

## Architecture and conventions

- **Per-package toolchains**: Each subproject declares its own dependencies and scripts. The root only coordinates them; there is no shared build script beyond `cd` invocations.
- **Backend compile-and-run model**: Source lives in `src/`, compiled to `dist/` by `tsc`. The runtime entry is `dist/index.js`. Development uses `tsx` directly against `.ts` sources with hot reload (`tsx watch`). Production always runs the compiled JS.
- **Prisma codegen before TS compilation**: The backend `build` script explicitly runs `prisma generate` before `tsc`, ensuring generated client types are available to the TypeScript compiler.
- **Database migration strategy for development vs. deploy**: `npm run start:migrate` (used by root `start`) runs `prisma db push` at process start, which pushes schema changes from `schema.prisma` to the database. The Railway start command mirrors this behavior so deployments self-migrate.
- **Frontend env-driven API target**: The Vite dev server proxies `/api` and `/uploads` to a backend URL loaded from `VITE_API_URL` (env var), defaulting to `http://localhost:5000`. This lets the frontend and backend run locally on different ports without CORS issues.
- **Environment pinning**: The backend enforces Node ≥ 20.9 via `engines` in `package.json` and pins exactly `22.17.0` in Railway's `[environments.production]` block to satisfy the native `sharp` dependency.
- **No monorepo workspace**: Dependencies are installed separately per package (`install:all` runs `npm install` twice). There is no `pnpm workspaces`, `npm workspaces`, or Turborepo setup.

## Conventions and constraints

- **Build order**: When building the whole repo, the backend must be built first (or independently) because it generates Prisma client types consumed by TypeScript. The root `build` script does `cd backend && npm install && npm run build` but does not include the frontend build.
- **Runtime entrypoints**: Backend production always starts `node dist/index.js`; development starts `tsx watch src/index.ts`. Frontend production builds to `frontend/dist/` via Vite; development serves from memory.
- **Database migrations**: Schema evolution is driven by `schema.prisma` and applied with `prisma db push` (not `migrate` commands). This is invoked both in `npm run start:migrate` and in the Railway start command, so every process start ensures the DB matches the schema.
- **Node version constraint**: All environments must use Node ≥ 20.9 (enforced by `engines` and Railway's pinned `NODE_VERSION = "22.17.0"`) because of the `sharp` native dependency.
- **Dev proxy convention**: Frontend dev assumes the backend is reachable at `VITE_API_URL` (default `http://localhost:5000`) and proxies both `/api` and `/uploads` paths to it.
- **No containerization or CI**: There is no `Dockerfile`, `docker-compose.yml`, GitHub Actions workflow, or other CI configuration in the repository. Deployment relies entirely on Railway/Nixpacks for the backend and Vercel for the frontend.