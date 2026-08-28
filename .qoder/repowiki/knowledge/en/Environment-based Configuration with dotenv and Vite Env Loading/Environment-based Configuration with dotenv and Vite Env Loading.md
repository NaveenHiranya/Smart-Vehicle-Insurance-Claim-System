---
kind: configuration_system
name: Environment-based Configuration with dotenv and Vite Env Loading
category: configuration_system
scope:
    - '**'
source_files:
    - backend/src/index.ts
    - backend/.env.example
    - backend/.env
    - backend/package.json
    - backend/railway.toml
    - frontend/vite.config.ts
    - frontend/.env.example
    - frontend/src/services/api.ts
---

## Overview

The project uses a simple, environment-variable-driven configuration system split between the Express backend (Node.js) and the Vite React frontend. There is no centralized config module or feature-flag framework — configuration is loaded at startup from `.env` files and build-time environment variables.

## Backend (Express)

- **Loader**: `dotenv` is imported and invoked in `backend/src/index.ts` via `dotenv.config()` before any other code runs.
- **Required env vars**: The server performs explicit startup validation against a hard-coded list `['JWT_SECRET', 'GEMINI_API_KEY', 'DATABASE_URL']`. If any are missing, it logs an error and calls `process.exit(1)`.
- **Optional env vars** (with defaults):
  - `PORT` — defaults to `5000`
  - `CORS_ORIGIN` — defaults to `http://localhost:5173`
  - `UPLOAD_DIR` — resolved via `path.resolve(process.env.UPLOAD_DIR || './uploads')` and served statically under `/uploads`
- **Runtime usage**: Values are read directly from `process.env` wherever needed (e.g., `process.env.CORS_ORIGIN`, `process.env.UPLOAD_DIR`). There is no typed config object; each consumer reads what it needs.
- **Prisma**: Database connection is driven entirely by `DATABASE_URL` in the Prisma schema/CLI; no separate DB config file exists.

## Frontend (Vite + React)

- **Loader**: Uses Vite's built-in `loadEnv` (via `import.meta.env`) — no runtime `.env` parsing library.
- **Build-time vs runtime**: `vite.config.ts` loads env via `loadEnv(mode, process.cwd(), '')` to configure the dev proxy target (`VITE_API_URL`, defaulting to `http://localhost:5000`).
- **Runtime base URL**: `frontend/src/services/api.ts` sets `baseURL` to `${import.meta.env.VITE_API_URL}/api` when `VITE_API_URL` is set, otherwise falls back to the relative `/api` path (relying on the Vite dev proxy).
- **Frontend-only env var**: Only `VITE_API_URL` is documented in `frontend/.env.example`; all other values must be hardcoded or injected at build time.

## Deployment & Environment Injection

- **Railway**: `backend/railway.toml` declares `builder = "nixpacks"`, a build command (`npm run build`), and a start command that runs Prisma migrations, seeds the admin user, then starts the server. It also defines `[environments.production] PORT = "5000"`, showing that Railway injects env vars into `process.env` at runtime.
- **Vercel**: `frontend/vercel.json` exists for frontend deployment; Vite's `VITE_*` prefixed env vars are baked into the static build by Vercel's build pipeline.
- **Local development**: `backend/.env` and `backend/.env.example` provide the local template; `frontend/.env.example` documents the single variable developers need to set if bypassing the dev proxy.

## Conventions Observed

1. **No shared config module** — both sides read `process.env` / `import.meta.env` directly at the point of use.
2. **Secrets live in `.env` only** — `JWT_SECRET` and `GEMINI_API_KEY` are treated as secrets and excluded from source control (`.gitignore` patterns apply).
3. **Startup fails fast** — missing required backend env vars cause immediate exit rather than silent fallback.
4. **Feature toggles do not exist** — there is no feature-flag system; behavior differences are driven solely by which env vars are present.
5. **Upload directory is configurable** — `UPLOAD_DIR` lets production deployments point uploads to an absolute path outside the container image.
6. **CORS origin is per-deployment** — `CORS_ORIGIN` is expected to be set to the deployed frontend URL in production.