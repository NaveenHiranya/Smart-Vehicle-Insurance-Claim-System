---
kind: configuration_system
name: Environment-Based Configuration with dotenv and Platform Overrides
category: configuration_system
scope:
    - '**'
source_files:
    - backend/.env.example
    - frontend/.env.example
    - backend/src/index.ts
    - backend/prisma/schema.prisma
    - backend/railway.toml
    - frontend/vite.config.ts
    - frontend/vercel.json
---

## Overview

The application uses a simple, environment-variable-driven configuration system centered on `dotenv` for the backend and Vite's `loadEnv` for the frontend. There is no centralized config module, feature flags, or runtime configuration API — all settings are loaded from `process.env` at startup.

## Backend Configuration

**Loading mechanism**: `backend/src/index.ts` calls `dotenv.config()` at the top of the file (line 17) before any other code runs, then performs mandatory validation of required variables.

**Required variables enforced at startup** (`backend/src/index.ts`, lines 20-26):
- `JWT_SECRET` — used by auth middleware for signing tokens
- `GEMINI_API_KEY` — passed to the AI services via `utils/gemini.ts`
- `DATABASE_URL` — consumed by Prisma (`prisma/schema.prisma` line 8: `url = env("DATABASE_URL")`)

If any of these are missing, the server logs an error and `process.exit(1)` — startup fails fast.

**Optional/defaults**:
- `PORT` — defaults to `5000` if not set
- `CORS_ORIGIN` — defaults to `http://localhost:5173`
- `UPLOAD_DIR` — defaults to `./uploads`, resolved via `path.resolve` and served statically under `/uploads`

**Prisma schema** (`backend/prisma/schema.prisma`) reads `DATABASE_URL` via `env()`. The default `.env.example` points at SQLite (`file:./prisma/dev.db`), but supports a Postgres DSN for hosted deployments.

**Platform overrides**:
- `railway.toml` sets `PORT=5000`, pins `NODE_VERSION=22.17.0`, and defines the deploy command that runs `prisma db push`, seeds admin users, then starts `dist/index.js`. Environment variables like `JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL` are expected to be provided as Railway secrets.
- `seedAdmin.ts` and `seedPolicyTemplates.ts` run at deploy time to bootstrap data.

**Secrets pattern**: Secrets live in `.env` (gitignored). A template is provided in `.env.example` documenting every variable and its purpose, including how to generate `JWT_SECRET` with `openssl rand -hex 32`.

## Frontend Configuration

**Loading mechanism**: `frontend/vite.config.ts` uses Vite's `loadEnv(mode, process.cwd(), '')` to load `.env*` files into `import.meta.env`. Only variables prefixed with `VITE_` are exposed to the browser bundle.

**Configured variable**:
- `VITE_API_URL` — target backend origin; defaults to `http://localhost:5000` when empty. Used to configure Vite's dev proxy (`/api` and `/uploads` routes proxied to the backend) and consumed at build time.

**Development vs production**:
- In development, the Vite dev server proxies `/api` and `/uploads` to the configured backend target, so `VITE_API_URL` can be left empty.
- In production (Vercel), `vercel.json` serves the built SPA with a catch-all rewrite to `index.html`; the frontend must call the deployed backend URL directly, which is set via `VITE_API_URL`.

## Conventions Observed

1. **No config objects or modules** — configuration values are read directly from `process.env` wherever needed (e.g., `process.env.PORT`, `process.env.CORS_ORIGIN`, `process.env.UPLOAD_DIR`).
2. **Startup validation** — critical backend secrets are validated once at boot; missing values abort the process rather than failing later.
3. **`.env.example` per package** — each subproject documents its required variables in a checked-in example file.
4. **Platform-specific deployment configs** — `railway.toml` for the backend, `vercel.json` for the frontend, both pin versions and define start commands.
5. **Prisma owns database connection** — `DATABASE_URL` is the single source of truth for DB connectivity, consumed by Prisma's generated client.
6. **Frontend env vars are Vite-prefixed** — only `VITE_*` variables are compiled into the client bundle.
7. **Defaults everywhere** — optional settings have sensible local defaults (port 5000, localhost CORS, SQLite file path) so the app runs out-of-the-box without configuration.