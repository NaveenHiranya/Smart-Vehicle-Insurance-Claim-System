---
kind: configuration_system
name: Environment-Based Configuration via dotenv and Vite loadEnv
category: configuration_system
scope:
    - '**'
source_files:
    - backend/.env.example
    - backend/src/index.ts
    - backend/src/utils/gemini.ts
    - backend/src/scripts/seedAdmin.ts
    - backend/package.json
    - railway.toml
    - frontend/.env.example
    - frontend/vite.config.ts
    - frontend/src/services/api.ts
    - frontend/src/services/adminApi.ts
---

## What system/approach is used

The application uses a simple environment-variable-driven configuration system with no dedicated config library. The backend loads `.env` files at runtime using the `dotenv` npm package, while the frontend relies on Vite's built-in `loadEnv` to expose variables prefixed with `VITE_` into the browser bundle.

## Key files and packages

- **Backend**
  - `backend/.env.example` — canonical list of all required/optional environment variables (database URL, JWT secret, Gemini API key, upload directory, port, CORS origin).
  - `backend/src/index.ts` — calls `dotenv.config()` at startup, validates that `JWT_SECRET`, `GEMINI_API_KEY`, and `DATABASE_URL` are present (exits with code 1 if any are missing), then reads `PORT`, `CORS_ORIGIN`, and `UPLOAD_DIR`.
  - `backend/src/utils/gemini.ts` — also calls `dotenv.config()` and reads `GEMINI_API_KEY` for Google Generative AI.
  - `backend/src/scripts/seedAdmin.ts` — calls `dotenv.config()` so seeding scripts can access env vars.
  - `backend/package.json` — declares `dotenv` as a dependency; build/start scripts assume `.env` is available in the working directory.
  - `railway.toml` — deployment configuration for Railway: builds the backend, runs `prisma db push`, then starts `node dist/index.js`. No explicit env var definitions here; values are expected to be provided by Railway's environment UI.

- **Frontend**
  - `frontend/.env.example` — documents `VITE_API_URL` (empty in development; set to the deployed backend origin in production).
  - `frontend/vite.config.ts` — uses `loadEnv(mode, process.cwd(), '')` to read `VITE_API_URL` and configure both the dev server proxy target and the production base URL.
  - `frontend/src/services/api.ts` — constructs the axios base URL from `import.meta.env.VITE_API_URL`; falls back to `/api` when the variable is empty (relying on the Vite dev proxy).
  - `frontend/src/services/adminApi.ts` — same pattern for admin endpoints (`/api/admin`).

## Architecture and conventions

1. **Single source of truth per environment**: Each module reads directly from `process.env` / `import.meta.env` rather than going through a central config object. There is no typed config module or schema validation beyond the startup check in `src/index.ts`.
2. **Startup validation**: On boot, `src/index.ts` enforces that `JWT_SECRET`, `GEMINI_API_KEY`, and `DATABASE_URL` are set; otherwise it logs a message instructing the developer to copy `backend/.env.example` and exits immediately. This is the only hard enforcement of required configuration.
3. **Defaults everywhere**: Every optional setting has an inline default fallback:
   - `PORT` defaults to `5000`
   - `CORS_ORIGIN` defaults to `http://localhost:5173`
   - `UPLOAD_DIR` defaults to `./uploads`
   - Frontend `BASE` falls back to relative `/api` paths when `VITE_API_URL` is unset.
4. **No feature flags or layered configs**: There are no separate dev/prod/staging config files, no YAML/TOML config loaders, and no runtime toggles. Environment variables are the sole mechanism.
5. **Secrets vs public config**: Secrets (`JWT_SECRET`, `GEMINI_API_KEY`) live in backend env vars only. Public client-facing settings (`VITE_API_URL`) are exposed to the browser via Vite's `VITE_` prefix convention.
6. **Deployment integration**: `railway.toml` delegates configuration to the hosting platform's environment variable store; the app itself does not reference any platform-specific config file.

## Conventions and constraints

- All backend configuration keys are documented in `backend/.env.example` and must be copied to `backend/.env` before first run; missing required keys cause immediate process termination.
- Optional settings may be omitted and will resolve to the hardcoded defaults shown above.
- Frontend-only configuration must use the `VITE_` prefix to be compiled into the bundle; non-prefixed variables are ignored by Vite's `loadEnv`.
- The `dotenv` package is loaded multiple times (in `index.ts`, `gemini.ts`, `seedAdmin.ts`); this is safe but redundant — loading once at process start would suffice.
- There is no schema validation, type checking, or centralized registry for environment variables; adding a new setting requires editing every place it is referenced plus updating `.env.example`.