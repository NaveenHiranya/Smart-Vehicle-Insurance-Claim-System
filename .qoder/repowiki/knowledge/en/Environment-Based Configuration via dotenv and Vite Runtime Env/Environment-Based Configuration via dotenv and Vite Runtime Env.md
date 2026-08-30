---
kind: configuration_system
name: Environment-Based Configuration via dotenv and Vite Runtime Env
category: configuration_system
scope:
    - '**'
source_files:
    - backend/.env.example
    - backend/src/index.ts
    - backend/package.json
    - frontend/.env.example
    - frontend/src/services/api.ts
    - frontend/vite.config.ts
    - railway.toml
---

## What system/approach is used

The FastClaim platform uses a plain `.env`-based configuration strategy with no dedicated config library. The backend loads environment variables at startup using the `dotenv` package (v17), while the frontend relies on Vite's built-in `import.meta.env` / `loadEnv` mechanism for build-time and runtime configuration. There are no YAML/JSON/TOML application config files, no feature-flag framework, and no centralized config module — every service reads its own values directly from `process.env` or `import.meta.env`.

## Key files and packages

- **Backend env template**: `backend/.env.example` — documents all required and optional variables (`DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `UPLOAD_DIR`, `PORT`, `CORS_ORIGIN`).
- **Backend startup validation**: `backend/src/index.ts` — calls `dotenv.config()` then enforces a whitelist of required variables (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) and exits with code 1 if any are missing.
- **Frontend env template**: `frontend/.env.example` — documents `VITE_API_URL`, the only variable consumed by the SPA.
- **Frontend API client**: `frontend/src/services/api.ts` — resolves the base URL from `import.meta.env.VITE_API_URL`; falls back to `/api` when the variable is absent (relying on Vite dev proxy).
- **Vite config**: `frontend/vite.config.ts` — uses `loadEnv(mode, process.cwd(), '')` so that `VITE_*` variables are available; defines a dev proxy forwarding `/api` and `/uploads` to the configured backend target.
- **Deployment config**: `railway.toml` — sets Nixpacks builder, Node version pinning (`22.17.0`), start command (`prisma db push && node dist/index.js`), and restart policy. This is where production env vars would be injected by Railway.
- **Prisma schema location**: `backend/prisma/schema.prisma` — database connection string is supplied entirely through `DATABASE_URL` in the environment.

## Architecture and conventions

1. **Single source of truth per environment**: Each deployment supplies a flat set of environment variables. There is no hierarchy (no `.env.local` overrides documented), no config file merging beyond what `dotenv` does, and no distinction between secret and non-secret variables in code.

2. **Startup-time validation**: The backend explicitly enumerates required keys in `index.ts`:
   ```ts
   const REQUIRED_ENV = ['JWT_SECRET', 'GEMINI_API_KEY', 'DATABASE_URL'] as const;
   const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
   if (missing.length) { /* log + process.exit(1) */ }
   ```
   Missing secrets cause an immediate fatal exit before the server starts, preventing partially-configured deployments.

3. **Optional variables have defaults**: Non-critical settings use sensible fallbacks at the point of use:
   - `PORT` defaults to `5000`.
   - `CORS_ORIGIN` defaults to `http://localhost:5173`.
   - `UPLOAD_DIR` defaults to `./uploads` (resolved via `path.resolve`).
   - Frontend `BASE` falls back to `/api` when `VITE_API_URL` is not set.

4. **Environment-specific behavior without separate config files**:
   - Development: `VITE_API_URL` is empty; Vite's dev server proxies `/api` and `/uploads` to `http://localhost:5000`.
   - Production: Set `VITE_API_URL` to the deployed backend origin; the SPA then calls the remote API directly.
   - Database: SQLite (`file:./prisma/dev.db`) for local/Railway dev; swap `DATABASE_URL` to a Postgres DSN for hosted DBs.

5. **Secrets handling**: Secrets (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) are treated as environment variables only — never committed to the repo (`.gitignore` excludes `.env`). They are expected to be provided by the hosting platform (Railway injects them at deploy time). No encryption, rotation, or secret manager integration exists in code.

6. **Build-time vs runtime separation**: The frontend uses Vite's `loadEnv` which exposes only variables prefixed with `VITE_` at build time. Backend configuration is purely runtime (`dotenv.config()` runs when `dist/index.js` starts).

## Conventions and constraints

- **Convention**: Every new external dependency (AI provider, storage, email, etc.) should be added as an environment variable with a documented default or a required-entry check in `REQUIRED_ENV`, mirroring the existing pattern in `backend/src/index.ts`.
- **Constraint**: The backend will not start unless `JWT_SECRET`, `GEMINI_API_KEY`, and `DATABASE_URL` are present — this is enforced programmatically at process startup.
- **Constraint**: Only variables prefixed with `VITE_` are exposed to the frontend bundle; other env vars are intentionally inaccessible from the browser (enforced by Vite's `loadEnv`).
- **Constraint**: File uploads are served statically from the directory specified by `UPLOAD_DIR`; changing it requires updating both the env var and ensuring the web server can serve that path.
- **Deployment convention**: New environments are created by setting the same set of env vars on the hosting platform (Railway); there is no per-environment config file branching.