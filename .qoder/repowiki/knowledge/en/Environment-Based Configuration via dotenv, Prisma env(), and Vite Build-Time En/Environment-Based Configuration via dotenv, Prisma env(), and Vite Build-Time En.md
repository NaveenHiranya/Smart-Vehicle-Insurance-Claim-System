---
kind: configuration_system
name: Environment-Based Configuration via dotenv, Prisma env(), and Vite Build-Time Env
category: configuration_system
scope:
    - '**'
source_files:
    - backend/.env.example
    - backend/.env
    - backend/src/index.ts
    - backend/prisma/schema.prisma
    - backend/railway.toml
    - frontend/.env.example
    - frontend/vite.config.ts
    - frontend/src/services/api.ts
    - frontend/vercel.json
---

## Overview

The application uses a simple environment-variable-driven configuration system with no dedicated config module. Configuration is loaded at startup from `.env` files (backend) and build-time `VITE_*` variables (frontend), with runtime validation of required keys.

## Backend (Express + Node)

- **Loader**: `dotenv.config()` is called in `backend/src/index.ts` before any route or service runs, so all `process.env.*` values are available throughout the process.
- **Required keys enforced at startup**: The app defines a `REQUIRED_ENV = ['JWT_SECRET', 'GEMINI_API_KEY', 'DATABASE_URL']` list and exits with code 1 if any are missing, printing which ones are absent. This is the only hard enforcement — optional keys like `PORT`, `CORS_ORIGIN`, `UPLOAD_DIR` fall back to defaults (`5000`, `http://localhost:5173`, `./uploads`).
- **Key variables** (from `backend/.env.example`):
  - `DATABASE_URL` — SQLite file path (`file:./prisma/dev.db`) or a Postgres URL for hosted DBs; consumed by Prisma.
  - `JWT_SECRET` — hex secret generated via `openssl rand -hex 32`.
  - `GEMINI_API_KEY` — Google Gemini AI key.
  - `UPLOAD_DIR` — absolute path recommended in production; served statically under `/uploads`.
  - `PORT` — server listen port.
  - `CORS_ORIGIN` — allowed origin for CORS.
- **Prisma integration**: `backend/prisma/schema.prisma` reads the database URL via `url = env("DATABASE_URL")`, so Prisma shares the same env source as the app.
- **Runtime behavior**: `UPLOAD_DIR` is resolved with `path.resolve(process.env.UPLOAD_DIR || './uploads')` and mounted as static assets. `CORS_ORIGIN` is passed directly into `cors({ origin })`. All other runtime values (e.g. `PORT`) are read inline where used.
- **No config object pattern**: There is no centralized config module; each consumer reads `process.env` directly.

## Frontend (Vite + React)

- **Build-time env**: `frontend/.env.example` documents `VITE_API_URL`. Vite exposes only variables prefixed with `VITE_` via `import.meta.env.VITE_API_URL`.
- **Base URL resolution**: `frontend/src/services/api.ts` sets `baseURL` to `${VITE_API_URL}/api` when the variable is set, otherwise falls back to `/api` so development uses the Vite dev server proxy.
- **Dev proxy**: `vite.config.ts` proxies `/api` and `/uploads` to `http://localhost:5000` (or whatever `VITE_API_URL` resolves to), so frontend developers do not need to configure CORS locally.
- **Production build**: `vercel.json` declares `framework: vite`, builds to `dist/`, rewrites all routes to `index.html` (SPA routing), and caches `/assets/*` with immutable headers. No runtime config loading on the client beyond `import.meta.env`.

## Deployment & Platform Config

- **Railway (backend)**: `backend/railway.toml` sets `startCommand = "npx prisma db push && npx tsx src/scripts/seedAdmin.ts && node dist/index.js"`, pins `NODE_VERSION = "22.17.0"`, and sets `PORT = "5000"` in the `[environments.production]` block. Database migrations and admin seeding run on deploy. Environment variables (e.g. `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`) are expected to be provided through Railway's environment UI.
- **Vercel (frontend)**: `vercel.json` drives the build and SPA rewrite; runtime env vars would be supplied via Vercel project settings and accessed through `import.meta.env.VITE_API_URL`.

## Conventions Observed

1. **All secrets live in `.env` files**; `.env.example` documents the shape without real secrets. The actual `.env` is gitignored.
2. **Required backend env vars are validated at process start** and cause an immediate exit if missing — this is the single place that enforces configuration completeness.
3. **Optional env vars have sensible defaults** rather than failing fast (e.g. `PORT=5000`, `CORS_ORIGIN=http://localhost:5173`, `UPLOAD_DIR=./uploads`).
4. **Database connection is configured exclusively via Prisma's `env()` function** in `schema.prisma`; the app never constructs a connection string itself.
5. **Frontend API base URL is a build-time constant**, not a runtime fetch — changing it requires rebuilding the frontend bundle.
6. **Development uses a Vite proxy** so the frontend does not need CORS configuration; production relies on setting `VITE_API_URL` to the deployed backend origin.