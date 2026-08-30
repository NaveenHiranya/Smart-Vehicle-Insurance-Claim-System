---
kind: configuration_system
name: Environment-Based Configuration via dotenv with Startup Validation
category: configuration_system
scope:
    - '**'
source_files:
    - backend/.env.example
    - backend/src/index.ts
    - backend/railway.toml
    - railway.toml
    - frontend/.env.example
    - frontend/vite.config.ts
    - backend/src/utils/prisma.ts
    - backend/src/services/policyTemplateSeeder.ts
---

## What system/approach is used

The application uses a simple **environment-variable-driven configuration** approach powered by the `dotenv` package. There is no centralized config module, YAML/JSON config files, or feature-flag framework. All runtime settings are loaded from `.env` files (backend) and Vite's `loadEnv` (frontend), then consumed directly via `process.env`.

## Key files and packages

- `backend/.env.example` — template listing every required/optional environment variable for the Express server.
- `backend/src/index.ts` — loads `.env`, validates required variables at startup, and wires them into middleware and route setup.
- `backend/railway.toml` — defines Railway build/deploy configuration and pins Node/Nixpacks versions; also declares production env vars like `PORT`.
- `railway.toml` (root) — top-level Railway deployment config that delegates to `cd backend && npx prisma db push && node dist/index.js`.
- `frontend/.env.example` — documents `VITE_API_URL` for pointing the frontend at the deployed backend.
- `frontend/vite.config.ts` — uses `loadEnv(mode, process.cwd(), '')` to read `VITE_*` variables and configure dev proxy target.
- `backend/src/utils/prisma.ts` — instantiates PrismaClient using `DATABASE_URL` (Prisma reads it automatically from `process.env`).
- `backend/src/services/policyTemplateSeeder.ts` — seeds default policy templates on startup so fresh environments have baseline data.

## Architecture and conventions

### Backend (Express)
1. **Loading**: `dotenv.config()` is called at the top of `src/index.ts` before any other code runs.
2. **Required-var validation**: Immediately after loading, the app checks that `JWT_SECRET`, `GEMINI_API_KEY`, and `DATABASE_URL` exist in `process.env`. If any are missing, it prints an error and calls `process.exit(1)` — this is the only hard enforcement mechanism.
3. **Optional vars with defaults**: `PORT` falls back to `5000`; `CORS_ORIGIN` falls back to `http://localhost:5173`; `UPLOAD_DIR` falls back to `./uploads` (resolved via `path.resolve`).
4. **Database URL**: Uses SQLite (`file:./prisma/dev.db`) by default per `.env.example`, but supports a Postgres DSN string. Prisma reads `DATABASE_URL` automatically.
5. **Startup seeding**: On boot, `seedPolicyTemplates()` runs idempotently — it inserts four built-in policy plans only if they do not already exist, so production databases start usable without blocking on failure.
6. **Deployment bootstrap**: The root `railway.toml` runs `npx prisma db push` before starting the server, ensuring schema is applied even without migrations.

### Frontend (Vite + React)
1. **Build-time env**: Vite's `loadEnv` reads `VITE_*` variables from `.env[.mode]` files. Only variables prefixed with `VITE_` are baked into the client bundle.
2. **Dev proxy**: In development, `vite.config.ts` proxies `/api` and `/uploads` to `VITE_API_URL` (default `http://localhost:5000`), so the frontend does not need CORS during local dev.
3. **Production target**: In production, `VITE_API_URL` must be set to the deployed backend origin (no trailing slash); the frontend services (`api.ts`, `adminApi.ts`, `garageApi.ts`) use this base URL.

### Deployment configuration
- **Railway**: Two `railway.toml` files exist — one at the repo root (monorepo-style) and one under `backend/`. Both pin Node/Nixpacks to version `22.17.0` because the Sharp dependency requires Node ≥ 20.9.
- The root deploy command runs `cd backend && npx prisma db push && node dist/index.js`, while the backend-specific one additionally runs `npx tsx src/scripts/seedAdmin.ts` before starting the server.
- Secrets (database credentials, JWT secret, Gemini API key) are expected to be provided as Railway environment variables matching the names in `.env.example`.

## Conventions and constraints

- **No config files in source control**: `.env` is gitignored; only `.env.example` is committed as a reference.
- **All secrets live in environment variables**, never in code or config files. The startup validator enforces this for the three critical secrets.
- **Backend-only secrets**: JWT signing keys, Gemini API keys, and database URLs are backend concerns. The frontend only needs `VITE_API_URL`.
- **Idempotent seeding**: Policy templates and admin users are seeded on every startup/deploy; seeding failures are caught and logged but do not prevent the server from starting.
- **Single source of truth per setting**: Each setting is defined once — either in `.env.example` (as documentation), in `railway.toml` (for platform-level values like `PORT`), or in `vite.config.ts` (for build-time defaults).
- **No runtime config reloading**: Changes to environment variables require a redeploy/restart; there is no hot-reload of configuration.