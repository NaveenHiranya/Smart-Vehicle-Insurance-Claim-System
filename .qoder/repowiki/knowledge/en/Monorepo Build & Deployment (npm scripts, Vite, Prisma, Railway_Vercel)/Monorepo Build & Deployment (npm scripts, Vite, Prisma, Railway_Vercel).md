---
kind: build_system
name: Monorepo Build & Deployment (npm scripts, Vite, Prisma, Railway/Vercel)
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - backend/tsconfig.json
    - frontend/package.json
    - frontend/vite.config.ts
    - frontend/vercel.json
    - railway.toml
---

## What system/approach is used
This project is a TypeScript monorepo with two independent Node.js/Node-based applications — a backend (`backend/`) and a frontend (`frontend/`) — orchestrated from the repository root via npm workspaces-style `cd` invocations. The build pipeline relies on:
- **npm scripts** at the repo root to coordinate install/build/start across both packages.
- **TypeScript compilation** for the backend (`tsc`, target ES2020, output to `dist/`).
- **Vite** for the frontend build (outputs static assets to `frontend/dist/`).
- **Prisma** for database schema generation and migrations on the backend.
- **Railway** (nixpacks builder) for deploying the backend.
- **Vercel** (via `vercel.json`) for deploying the frontend as a SPA.
There are no Dockerfiles, Makefiles, or CI YAML files in the repository; deployment is configured through platform-specific config files rather than a centralized CI pipeline.

## Key files and packages
- `package.json` (root): top-level scripts that wrap per-package commands: `build`, `start`, `dev:backend`, `dev:frontend`, `build:backend`, `build:frontend`, `install:all`, `seed`.
- `backend/package.json`: defines `build` (`prisma generate && tsc`), `dev` (`tsx watch src/index.ts`), `start:migrate` (`prisma db push && node dist/index.js`), plus Prisma and seed scripts.
- `backend/tsconfig.json`: strict TS build targeting ES2020, emitting to `./dist` from `./src`, with source maps and declaration maps enabled.
- `frontend/package.json`: defines `build` (`tsc -b && vite build`), `dev` (`vite`), `lint` (`oxlint`).
- `frontend/vite.config.ts`: builds to `dist/`, disables sourcemaps in production, proxies `/api` and `/uploads` to the backend during dev using `VITE_API_URL`.
- `frontend/vercel.json`: declares `buildCommand = "npm run build"`, `outputDirectory = "dist"`, framework detection via `vite`, SPA rewrites, and immutable caching headers for `/assets/*`.
- `railway.toml`: uses `builder = "nixpacks"`, sets `buildCommand = "cd backend && npm install && npm run build"`, and `startCommand = "cd backend && npx prisma db push && node dist/index.js"` with restart-on-failure policy.

## Architecture and conventions
- **Per-package builds**: each subproject manages its own dependencies and build steps; the root package.json only shells out with `cd` into each directory. There is no npm workspaces configuration — coordination is manual.
- **Backend artifact**: compiled JS lives under `backend/dist/`; the runtime entry is `node dist/index.js`. Prisma client is generated before compilation via `prisma generate`.
- **Frontend artifact**: built static SPA under `frontend/dist/`; Vercel serves it with a catch-all rewrite to `index.html` for client-side routing.
- **Environment-driven build**: the frontend reads `VITE_API_URL` at build time via `loadEnv(mode, process.cwd(), '')` in `vite.config.ts` to determine the backend proxy target.
- **Database migration strategy**: development uses `prisma db push` (schema push); production deploy on Railway also runs `npx prisma db push` at startup, so there is no separate migration step — schema changes are applied on every start.
- **Dev vs prod tooling separation**: `tsx` + `nodemon`-style watch mode for backend dev (`tsx watch`), while production runs plain `node dist/index.js`. Frontend dev uses Vite's dev server; production uses `vite build`.

## Conventions and constraints
- **Build order is explicit in scripts**: the root `build` script installs and builds the backend first; the frontend has its own `build` script that runs `tsc -b` then `vite build`. There is no single command that builds both sides together from the root beyond running them individually.
- **Prisma must be generated before TypeScript compilation**: the backend `build` script runs `prisma generate && tsc`, enforcing this ordering.
- **Production start requires DB push**: both the root `start` script (`npm run start:migrate`) and Railway's `startCommand` invoke `prisma db push` before starting the server, making schema synchronization part of the runtime contract.
- **Frontend asset caching**: Vercel config enforces `Cache-Control: public, max-age=31536000, immutable` for all `/assets/*` responses, relying on hashed filenames produced by Vite.
- **SPA routing fallback**: Vercel rewrites all non-file routes to `/index.html`, so client-side routing is handled entirely in the browser.
- **No cross-compilation or containerization**: the project does not define Dockerfiles or multi-arch targets; deployment is delegated to Railway (nixpacks) and Vercel, which infer the environment from the presence of `package.json` and the provided config files.