---
kind: configuration_system
name: Environment-Based Configuration via dotenv and Vite Proxy
category: configuration_system
scope:
    - '**'
source_files:
    - backend/.env.example
    - backend/src/index.ts
    - backend/prisma/schema.prisma
    - backend/package.json
    - frontend/vite.config.ts
    - frontend/src/services/api.ts
---

## Overview

The Smart Vehicle Insurance Claim System uses a simple, file-based configuration approach centered on `.env` files loaded at runtime by the backend and build-time proxy settings for the frontend. There is no centralized configuration module, feature flags, or secrets manager — configuration values are read directly from `process.env` where needed.

## Backend (Express)

- **Loader**: The application calls `dotenv.config()` at the top of `backend/src/index.ts`, which loads variables from a `.env` file in the project root.
- **Source of truth**: `backend/.env.example` documents every required variable with defaults:
  - `DATABASE_URL` — PostgreSQL connection string consumed by Prisma (`prisma/schema.prisma` reads it via `url = env("DATABASE_URL")`).
  - `JWT_SECRET` — used by JWT token signing/verification in auth routes.
  - `GEMINI_API_KEY` — passed to the Google Gemini AI client in `backend/src/utils/gemini.ts`.
  - `UPLOAD_DIR` — resolved via `path.resolve(process.env.UPLOAD_DIR || './uploads')` and served as static `/uploads`.
  - `PORT` — server listen port, defaulting to `5000`.
  - `CORS_ORIGIN` — CORS allowed origin, defaulting to `http://localhost:5173`.
- **Access pattern**: Values are read inline wherever they are used (e.g., `process.env.PORT`, `process.env.CORS_ORIGIN`, `process.env.UPLOAD_DIR`) rather than being gathered into a single config object. Each consumer provides a fallback default when calling `process.env.X || 'default'`.
- **Prisma integration**: Database configuration is entirely driven by `DATABASE_URL` in `.env`; Prisma's `datasource db { url = env("DATABASE_URL") }` is the only DB config point.
- **No validation**: There is no schema validation of environment variables at startup; missing or malformed values surface as runtime errors (e.g., Prisma connection failure).

## Frontend (React + Vite)

- **Build-time proxy**: `frontend/vite.config.ts` defines a dev-server proxy that forwards `/api` and `/uploads` requests to `http://localhost:5000`. This eliminates the need for CORS during local development and means the SPA never needs to know the backend URL at runtime.
- **Runtime API base**: `frontend/src/services/api.ts` creates an axios instance with `baseURL: '/api'`, relying on the Vite dev proxy. No `VITE_*` environment variables are used anywhere in the frontend codebase.
- **No production env loading**: There is no `.env` file under `frontend/` and no use of `import.meta.env` or `process.env` in the frontend source. Production deployment would require configuring the reverse proxy or adjusting the vite build target externally.

## Conventions Observed

- All sensitive values (database URL, JWT secret, Gemini API key) live exclusively in `backend/.env` and are documented in `backend/.env.example`.
- Default values are provided inline at each usage site (`process.env.X || 'default'`) rather than in a central defaults file.
- Prisma schema is the single source of truth for database configuration; it references the same `DATABASE_URL` env var.
- The frontend avoids hardcoding backend URLs by using Vite's dev proxy and a relative `/api` base path.
- There is no configuration layering (no per-environment `.env.development` / `.env.production`), no config validation library, and no feature flag system.