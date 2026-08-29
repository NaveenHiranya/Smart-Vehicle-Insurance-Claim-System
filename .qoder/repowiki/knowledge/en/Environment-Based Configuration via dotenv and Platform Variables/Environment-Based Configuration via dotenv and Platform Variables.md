---
kind: configuration_system
name: Environment-Based Configuration via dotenv and Platform Variables
category: configuration_system
scope:
    - '**'
source_files:
    - backend/src/index.ts
    - backend/.env.example
    - backend/railway.toml
    - frontend/vite.config.ts
    - frontend/.env.example
    - frontend/vercel.json
    - backend/src/utils/prisma.ts
---

## Overview

The project uses a simple environment-variable-driven configuration system with no dedicated config library. Both the backend (Express/Node) and frontend (Vite/React) read settings from `.env` files at startup/build time, and platform-specific variables are injected by Railway (backend) and Vercel (frontend).

## Backend Configuration

- **Loading**: `dotenv.config()` is called in `backend/src/index.ts` before any other code runs.
- **Required variables** are validated at startup; if any of `JWT_SECRET`, `GEMINI_API_KEY`, or `DATABASE_URL` are missing, the process logs an error and exits with code 1. This enforces that secrets must be present in production.
- **Runtime values used**:
  - `PORT` — server listen port (default `5000`).
  - `CORS_ORIGIN` — CORS allowed origin (default `http://localhost:5173`).
  - `UPLOAD_DIR` — absolute path to the directory served under `/uploads` (default `./uploads`).
  - `DATABASE_URL` — passed through to Prisma (`backend/prisma/schema.prisma`) for SQLite or Postgres.
  - `JWT_SECRET` — used by JWT-based auth middleware.
  - `GEMINI_API_KEY` — used by AI services (`gemini.ts`).
- **Defaults**: Every variable has a sensible fallback via `process.env.X || default`, so the app can run locally without explicit env vars except the three required ones.
- **Secrets template**: `backend/.env.example` documents all variables with comments explaining their purpose and how to obtain values (e.g., generating a JWT secret with `openssl rand -hex 32`).

## Frontend Configuration

- **Loading**: Vite's `loadEnv(mode, process.cwd(), '')` in `vite.config.ts` loads `.env*` files matching the build mode.
- **Single runtime variable**: `VITE_API_URL` — the backend base URL. When empty, Vite's dev server proxies `/api` and `/uploads` to `http://localhost:5000`; in production it is set to the deployed backend origin.
- **Build-time injection**: Only variables prefixed with `VITE_` are embedded into the built client bundle, which is why only `VITE_API_URL` is needed in `frontend/.env.example`.
- **Vercel deployment**: `frontend/vercel.json` configures the build (`npm run build`), output directory (`dist`), SPA rewrites, and immutable caching headers for assets. Environment variables are expected to be provided via the Vercel dashboard.

## Platform / Deployment Configuration

- **Railway (backend)**: `backend/railway.toml` declares a nixpacks builder, sets `startCommand = "npx prisma db push && npx tsx src/scripts/seedAdmin.ts && node dist/index.js"`, restart policy (`on_failure`, max 3 retries), and pins `PORT=5000` for production. A root-level `railway.toml` mirrors this for monorepo-style deployments.
- **Prisma migrations**: The deploy command runs `prisma db push` on start, so schema changes are applied automatically rather than via migration files.
- **Admin seeding**: `seedAdmin.ts` is executed after the DB push to create initial admin users.

## Conventions Observed

1. All sensitive values (DB URL, JWT secret, API keys) live exclusively in environment variables — never in source code or checked-in `.env` files.
2. Required secrets are enforced at process startup with an explicit exit; optional settings use defaults.
3. The frontend exposes only `VITE_*` variables to the browser; everything else stays server-side.
4. Development uses local SQLite (`file:./prisma/dev.db`) while production targets hosted Postgres via the same `DATABASE_URL` format.
5. File uploads are served statically from a configurable directory resolved relative to the process working directory.