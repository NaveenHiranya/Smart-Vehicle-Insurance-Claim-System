---
kind: configuration_system
name: Environment-Based Configuration via dotenv and Vite Env Injection
category: configuration_system
scope:
    - '**'
source_files:
    - backend/.env.example
    - frontend/.env.example
    - backend/src/index.ts
    - backend/prisma/schema.prisma
    - backend/railway.toml
    - railway.toml
    - frontend/vite.config.ts
---

## Overview

The Flash Claim application uses a simple, environment-variable-driven configuration system with no centralized config module. Both the backend (Node/Express) and frontend (Vite/React) load configuration exclusively from `.env` files at startup/build time.

## Backend Configuration

- **Loader**: `backend/src/index.ts` calls `dotenv.config()` at process start to populate `process.env`.
- **Required variables enforced at startup**: The app defines a `REQUIRED_ENV` constant (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) and exits with code 1 if any are missing, printing an error that instructs copying `backend/.env.example`.
- **Optional runtime defaults**: `PORT` defaults to `5000`; `CORS_ORIGIN` defaults to `http://localhost:5173`; `UPLOAD_DIR` defaults to `./uploads`.
- **Database URL**: `prisma/schema.prisma` reads `DATABASE_URL` via Prisma's `env("DATABASE_URL")`. The default in `.env.example` is a local SQLite file (`file:./prisma/dev.db`); production uses a hosted Postgres URI.
- **Secrets / external services**: `JWT_SECRET` (generated via `openssl rand -hex 32` per the example), `GEMINI_API_KEY` for Google Gemini AI, and `CORS_ORIGIN` for cross-origin requests.
- **File storage path**: `UPLOAD_DIR` controls where uploaded images/documents are served from; it is resolved via `path.resolve(process.env.UPLOAD_DIR || './uploads')` and mounted as `/uploads` static assets.

## Frontend Configuration

- **Loader**: `frontend/vite.config.ts` uses Vite's `loadEnv(mode, process.cwd(), '')` to read `.env` (and `.env.[mode]`) files. Only variables prefixed with `VITE_` are exposed to the browser bundle.
- **Single env var**: `VITE_API_URL` — left empty in development so Vite's dev server proxies `/api` and `/uploads` to `http://localhost:5000`; set to the deployed backend origin in production builds.
- **Proxy behavior**: During development, Vite proxies both `/api` and `/uploads` to the configured backend target with `changeOrigin: true`, so the frontend does not need CORS during local dev.

## Deployment & Environment Overrides

- **Railway (root `railway.toml`)**: Uses Nixpacks builder, runs `cd backend && npm install && npm run build`, then starts with `cd backend && npx prisma db push && node dist/index.js`. Production Node version pinned to `22.17.0` (required by the `sharp` native dependency).
- **Railway (backend `railway.toml`)**: A variant that additionally runs `npx tsx src/scripts/seedAdmin.ts` after `prisma db push` to seed admin accounts on deploy.
- **Prisma migrations**: Deployments use `prisma db push` (schema push, not migrations) against whatever `DATABASE_URL` is provided by the platform.

## Conventions Observed

1. **No typed config object** — configuration values are consumed directly from `process.env` (backend) or `import.meta.env` via Vite's env loader (frontend). There is no shared config schema or validation layer beyond the startup check of three required keys.
2. **`.env.example` as contract** — each subproject ships a `.env.example` documenting every supported variable with comments explaining purpose and format (e.g., how to generate `JWT_SECRET`, how to switch `DATABASE_URL` from SQLite to Postgres).
3. **Per-environment overrides** — Vite supports `.env.development`, `.env.production`, etc. via `loadEnv(mode, ...)`, enabling different `VITE_API_URL` per build mode.
4. **Platform-provided secrets** — Railway injects `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, etc. as environment variables at runtime; they are never committed to source control.
5. **Startup failure on missing secrets** — the backend deliberately crashes on boot if required env vars are absent, preventing silent misconfiguration.
6. **Default-safe optional settings** — non-secret options like `PORT`, `CORS_ORIGIN`, and `UPLOAD_DIR` have sensible local-development defaults so the app can start without explicit configuration.