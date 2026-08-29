---
kind: configuration_system
name: Environment-Based Configuration via dotenv and Vite Build-Time Env
category: configuration_system
scope:
    - '**'
source_files:
    - backend/.env.example
    - backend/src/index.ts
    - backend/railway.toml
    - frontend/.env.example
    - frontend/vite.config.ts
    - frontend/src/services/api.ts
    - railway.toml
---

## What system/approach is used

The application uses a simple environment-variable-based configuration system with no dedicated config library. The backend loads `.env` files at startup using the `dotenv` package, while the frontend relies on Vite's build-time environment variables (`import.meta.env`) loaded via `loadEnv`. Deployment configuration is declared in `railway.toml` files for both the root workspace and the backend service.

## Key files and packages

- **Backend**
  - `backend/.env.example` — template of all required/optional env vars
  - `backend/src/index.ts` — calls `dotenv.config()`, validates required vars, reads runtime settings (PORT, CORS_ORIGIN, UPLOAD_DIR)
  - `backend/railway.toml` — backend service deploy/startup config
  - `backend/prisma/schema.prisma` — database URL consumed from `DATABASE_URL`
- **Frontend**
  - `frontend/.env.example` — documents `VITE_API_URL`
  - `frontend/vite.config.ts` — loads env via `loadEnv(mode, process.cwd(), '')`, sets dev proxy target from `VITE_API_URL`
  - `frontend/src/services/api.ts` — resolves axios base URL from `import.meta.env.VITE_API_URL`, falling back to `/api` for dev proxy usage
- **Root**
  - `railway.toml` — workspace-level deploy config that builds and starts the backend

## Architecture and conventions

1. **Single source of truth per env var**: Every configurable value lives as an environment variable; there are no JSON/YAML/TOML config files read by the app at runtime.
2. **Startup validation**: `backend/src/index.ts` defines a `REQUIRED_ENV` tuple (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) and exits with code 1 if any are missing, printing instructions to copy `.env.example`.
3. **Optional fallbacks**: Non-critical settings use sensible defaults when absent:
   - `PORT` defaults to `5000`
   - `CORS_ORIGIN` defaults to `http://localhost:5173`
   - `UPLOAD_DIR` defaults to `./uploads`
4. **Prisma reads `DATABASE_URL` directly** from `process.env`; no explicit loading is needed because Prisma itself consumes it.
5. **Gemini API key** is consumed by AI services (e.g., `claimAssistantService.ts` → `utils/gemini.ts`) through `process.env.GEMINI_API_KEY`.
6. **Frontend build-time vs runtime split**:
   - `VITE_API_URL` is resolved at build time by Vite (`loadEnv`) and baked into the client bundle.
   - In development, when `VITE_API_URL` is empty, the Vite dev server proxies `/api` and `/uploads` to `http://localhost:5000`, so the frontend can call relative `/api` paths.
   - In production, setting `VITE_API_URL` to the deployed backend origin makes the built JS call the remote API directly.
7. **Deployment overrides**: `railway.toml` declares `PORT = "5000"` under `[environments.production]`, showing how platform env injection replaces local `.env` values.

## Conventions and constraints

- **Required env vars must be present before the server starts**; absence causes immediate `process.exit(1)` with a diagnostic listing the missing keys. This enforces that secrets like `JWT_SECRET` and `GEMINI_API_KEY` cannot be omitted in any deployment.
- **Secrets are never committed**: `.env` is gitignored; only `.env.example` is tracked as a template.
- **Database connection string format**: SQLite (`file:./prisma/dev.db`) is the default for local/Railway; hosted Postgres uses a `postgresql://` URL — the same `DATABASE_URL` variable switches between them.
- **Upload directory path**: `UPLOAD_DIR` should be set to an absolute path in production so static file serving works reliably outside the project tree.
- **CORS origin**: `CORS_ORIGIN` should point to the deployed frontend URL in production; the default allows localhost during development.
- **Frontend API target**: When `VITE_API_URL` is unset, the frontend expects a dev proxy; when set, it bypasses the proxy entirely. There is no runtime toggle — the value is fixed at build time.