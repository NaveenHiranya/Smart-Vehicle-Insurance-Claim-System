---
kind: configuration_system
name: Environment-Based Configuration via dotenv
category: configuration_system
scope:
    - '**'
source_files:
    - backend/.env.example
    - backend/src/index.ts
    - backend/src/utils/gemini.ts
    - backend/src/middleware/auth.ts
    - backend/package.json
    - frontend/vite.config.ts
    - frontend/src/services/api.ts
---

## What system/approach is used

The application uses a simple **`.env`-based configuration system** driven by the `dotenv` package. There is no centralized config module, YAML/TOML/JSON config files, or feature-flag framework. All runtime settings are loaded as environment variables at process startup.

## Key files and packages

- `backend/.env.example` — template listing every required environment variable with comments describing each one (database URL, JWT secret, Gemini API key, upload directory, server port, CORS origin).
- `backend/src/index.ts` — calls `dotenv.config()` at the top of the entrypoint, then reads `process.env.PORT`, `process.env.CORS_ORIGIN`, and `process.env.UPLOAD_DIR` to configure Express middleware, static file serving, and route mounting.
- `backend/src/utils/gemini.ts` — re-imports `dotenv.config()` and reads `process.env.GEMINI_API_KEY` to initialize the Google Generative AI client.
- `backend/src/middleware/auth.ts` — reads `process.env.JWT_SECRET` when verifying JSON Web Tokens.
- `frontend/vite.config.ts` — hardcodes the dev proxy target (`http://localhost:5000`) for `/api` and `/uploads`; no build-time env var injection is used.
- `frontend/src/services/api.ts` — sets the Axios base URL to `/api`, relying on Vite's dev proxy rather than an injected `VITE_*` variable.

## Architecture and conventions

1. **Single `.env` per backend instance.** The backend loads configuration once in `src/index.ts` via `dotenv.config()`. A parallel utility file (`utils/gemini.ts`) also calls `dotenv.config()`; this is redundant since `dotenv` is idempotent but indicates that individual modules do not share a single config loader.
2. **All secrets and service endpoints live in environment variables.** Database connection (`DATABASE_URL`), JWT signing key (`JWT_SECRET`), Gemini API key (`GEMINI_API_KEY`), upload path (`UPLOAD_DIR`), server port (`PORT`), and CORS origin (`CORS_ORIGIN`) are all externalized through `process.env`.
3. **Fallback defaults are provided inline.** Every `process.env.X` access is paired with a fallback literal (e.g. `process.env.PORT || 5000`, `process.env.CORS_ORIGIN || 'http://localhost:5173'`, `process.env.JWT_SECRET || ''`, `process.env.GEMINI_API_KEY || ''`). This means the app will start even if a variable is missing, though some features may fail silently.
4. **No typed configuration object.** There is no schema validation, config class, or shared constants file. Each consumer reads `process.env` directly where needed.
5. **Frontend configuration is baked into build/dev config.** The Vite dev server proxies `/api` and `/uploads` to `http://localhost:5000` directly in `vite.config.ts`. The production frontend has no equivalent env-var mechanism visible — it would need to be served from the same origin or configured separately.
6. **Prisma database URL is supplied via `DATABASE_URL`.** Prisma reads this standard variable automatically; the example points at a local SQLite file (`file:./dev.db`).

## Conventions and constraints

- **Every runtime setting must be documented in `backend/.env.example`.** The example file acts as the canonical list of required variables, with inline comments explaining purpose and how to obtain values (e.g., generating a JWT secret with `openssl rand -hex 32`, obtaining a Gemini API key from Google AI Studio).
- **Variables are consumed exclusively through `process.env`.** No other configuration loading pattern (config files, CLI flags, registry) is used anywhere in the codebase.
- **Missing variables resolve to safe defaults rather than throwing.** The code consistently uses `|| <default>` for every `process.env` read, so the application boots without explicit configuration — however, this also means misconfiguration can surface later as runtime errors (e.g., an empty JWT secret still allows token verification to proceed until a mismatch occurs).
- **Secrets are never committed.** `backend/.gitignore` excludes `*.env` files, and only the template `.env.example` is tracked.
- **Frontend does not use `import.meta.env` / `VITE_*` variables.** The API base URL is hardcoded to `/api` and the dev proxy is set in `vite.config.ts`; there is no build-time environment variable substitution for the frontend.