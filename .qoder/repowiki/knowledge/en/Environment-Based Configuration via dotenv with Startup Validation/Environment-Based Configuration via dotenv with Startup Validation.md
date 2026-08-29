---
kind: configuration_system
name: Environment-Based Configuration via dotenv with Startup Validation
category: configuration_system
scope:
    - '**'
source_files:
    - backend/src/index.ts
    - backend/.env.example
    - backend/.env
    - backend/prisma/schema.prisma
    - frontend/vite.config.ts
    - frontend/.env.example
    - railway.toml
    - backend/package.json
---

## What system/approach is used

The application uses a plain `.env` file loaded at runtime by the `dotenv` package (v17.4.2) — there is no dedicated configuration module, config files (YAML/JSON/TOML), or feature-flag framework. The backend loads environment variables directly from `process.env`, and the frontend uses Vite's `loadEnv` to expose only `VITE_*` variables to the browser.

## Key files and packages

- **Backend entrypoint** — `backend/src/index.ts`: calls `dotenv.config()` at startup, validates required env vars, reads `PORT`, `CORS_ORIGIN`, `UPLOAD_DIR`, and passes them into middleware/routes.
- **Backend env template** — `backend/.env.example`: documents every supported variable (`DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `UPLOAD_DIR`, `PORT`, `CORS_ORIGIN`) with comments explaining defaults and production values.
- **Runtime env** — `backend/.env`: local development values (SQLite `file:./dev.db`, JWT secret, Gemini key, upload dir).
- **Prisma datasource** — `backend/prisma/schema.prisma`: reads `DATABASE_URL` via `env("DATABASE_URL")`; default provider is SQLite.
- **Frontend build config** — `frontend/vite.config.ts`: uses `loadEnv(mode, process.cwd(), '')` so that `VITE_API_URL` can be set per build mode; proxies `/api` and `/uploads` to the backend target during dev.
- **Frontend env template** — `frontend/.env.example`: documents `VITE_API_URL` (empty in dev so Vite proxy handles it; set to deployed backend origin in production).
- **Deployment config** — `railway.toml`: defines build/start commands and relies on Railway-provided environment variables (e.g. `DATABASE_URL`, `GEMINI_API_KEY`) being injected at deploy time.
- **Package scripts** — `backend/package.json`: `build` runs `prisma generate && tsc`; `start:migrate` runs `prisma db push` before starting; `seed` runs `tsx src/scripts/seedAdmin.ts`.

## Architecture and conventions

1. **Single source of truth per environment**: each deployment (local, staging, production) supplies its own `.env` (or platform secrets). There is no config hierarchy, merge, or override mechanism — `process.env` is read directly wherever needed.
2. **Startup validation enforces required secrets**: `backend/src/index.ts` declares `REQUIRED_ENV = ['JWT_SECRET', 'GEMINI_API_KEY', 'DATABASE_URL']` and exits with code 1 if any are missing, printing instructions to copy `.env.example`. This is the only hard enforcement layer for configuration.
3. **Defaults are provided inline**: optional settings fall back to sensible defaults in code (`PORT || 5000`, `CORS_ORIGIN || 'http://localhost:5173'`, `UPLOAD_DIR || './uploads'`).
4. **Prisma owns database configuration**: the connection string comes exclusively from `DATABASE_URL` in Prisma's schema; the app never constructs DB URLs itself.
5. **Frontend exposes only `VITE_*` variables**: Vite's `loadEnv` with an empty prefix filters out all other env vars, preventing accidental leakage of secrets into the browser bundle.
6. **Platform-managed secrets**: `railway.toml` starts the server with `node dist/index.js` after running `prisma db push`, expecting secrets to be injected as environment variables by Railway.

## Conventions and constraints

- **Required variables must be present at startup** — enforced by explicit check in `backend/src/index.ts`; the process aborts if `JWT_SECRET`, `GEMINI_API_KEY`, or `DATABASE_URL` are absent.
- **Database URL must be set via `DATABASE_URL`** — both Prisma (`schema.prisma`) and the app's health endpoint depend on it; switching providers requires changing this single env var.
- **Upload directory path is configurable** — `UPLOAD_DIR` controls where Multer writes files and where `express.static('/uploads')` serves them; absolute paths are recommended in production (per `.env.example` comment).
- **CORS origin is configurable per environment** — defaults to `http://localhost:5173` for local dev; production should set `CORS_ORIGIN` to the deployed frontend URL.
- **Frontend API base URL is environment-driven** — `VITE_API_URL` is read by `vite.config.ts` to configure the dev proxy target and is intended to be set to the deployed backend origin in production builds.
- **No feature flags or runtime toggles exist** — behavior is controlled solely through environment variables and Prisma schema changes; there is no dynamic feature flag system.