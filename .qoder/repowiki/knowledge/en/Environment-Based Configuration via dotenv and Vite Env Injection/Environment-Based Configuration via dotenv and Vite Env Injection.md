---
kind: configuration_system
name: Environment-Based Configuration via dotenv and Vite Env Injection
category: configuration_system
scope:
    - '**'
source_files:
    - backend/.env.example
    - backend/.env
    - backend/src/index.ts
    - backend/railway.toml
    - frontend/.env.example
    - frontend/vite.config.ts
    - frontend/src/services/api.ts
---

## Approach

The platform uses a simple, file-based configuration system driven by environment variables. The backend loads `.env` at startup with `dotenv`, while the frontend relies on Vite's built-in `loadEnv` to inject `VITE_*` variables at build time. There is no centralized config module, YAML/TOML config files (other than deployment manifests), or feature-flag framework — every runtime setting is an environment variable.

## Key Files

- **Backend**
  - `backend/.env.example` — canonical source of truth for all required/optional env vars (database URL, JWT secret, Gemini API key, upload directory, port, CORS origin).
  - `backend/.env` — local development values (gitignored in `.gitignore`).
  - `backend/src/index.ts` — calls `dotenv.config()` at process start, validates that `JWT_SECRET`, `GEMINI_API_KEY`, and `DATABASE_URL` are present, then reads `PORT`, `CORS_ORIGIN`, and `UPLOAD_DIR` from `process.env`.
  - `backend/railway.toml` — declares production build/start commands and sets `PORT=5000` under `[environments.production]`; database, secrets, and keys are expected to be supplied as Railway environment variables.
  - `backend/prisma/schema.prisma` + `backend/prisma/dev.db` — Prisma schema; `DATABASE_URL` points to SQLite (`file:./prisma/dev.db`) locally and to a hosted Postgres in production.

- **Frontend**
  - `frontend/.env.example` — documents `VITE_API_URL` (empty in dev so Vite proxy handles `/api` forwarding).
  - `frontend/vite.config.ts` — uses `loadEnv(mode, process.cwd(), '')` to read `VITE_API_URL` and configure both the dev server proxy (`/api` → target) and the build-time base URL.
  - `frontend/src/services/api.ts` — constructs the axios `baseURL` from `import.meta.env.VITE_API_URL` when set, otherwise falls back to relative `/api` (relying on the dev proxy).

## Architecture & Conventions

1. **Single source of env documentation**: `backend/.env.example` lists every variable with comments explaining purpose and format (e.g. how to generate `JWT_SECRET` with `openssl rand -hex 32`, how to switch `DATABASE_URL` from SQLite to Postgres). New settings should be added here first.

2. **Startup validation**: `backend/src/index.ts` enforces three *required* variables (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) by filtering `process.env` against a typed tuple and exiting with code 1 if any are missing. This is the only hard enforcement mechanism — optional variables like `PORT`, `CORS_ORIGIN`, `UPLOAD_DIR` fall back to defaults.

3. **Layering**:
   - Development: `dotenv` loads `backend/.env`; Vite proxies `/api` and `/uploads` to `http://localhost:5000` so the frontend needs no `VITE_API_URL`.
   - Production (Railway): `railway.toml` runs `npx prisma db push` and seeds admin/policy templates before starting `node dist/index.js`. All secrets are injected by the platform as environment variables; there is no `.env` file on disk.
   - Frontend production: `VITE_API_URL` must be set to the deployed backend origin (no trailing slash); Vite embeds it into the built JS bundle.

4. **Secrets handling**: Secrets live exclusively in environment variables (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`). No config files contain secrets. The `.env` file is ignored by git.

5. **No feature flags or dynamic reload**: Configuration is static per process lifetime. Changing a value requires restarting the server. There is no hot-reload of env vars, no config endpoint, and no runtime toggles.

6. **Prisma integration**: Database connection is configured solely through `DATABASE_URL` in the environment; Prisma connects directly without an intermediate config layer.

## Conventions & Constraints

- Every new runtime setting must be documented in `backend/.env.example` with a comment describing its purpose and default behavior.
- Required variables are enforced at startup via explicit checks in `src/index.ts`; adding a new required variable means updating both the `REQUIRED_ENV` tuple and the example file.
- Optional variables use `process.env.X || 'default'` pattern (e.g. `PORT`, `CORS_ORIGIN`, `UPLOAD_DIR`).
- Frontend-only variables must be prefixed with `VITE_` to be exposed by Vite's `loadEnv`.
- Deployment configuration lives in `railway.toml`; environment-specific values (like `PORT`) go under `[environments.production]` rather than in separate files.
- The `.env` file must never be committed — it is excluded by `.gitignore`.