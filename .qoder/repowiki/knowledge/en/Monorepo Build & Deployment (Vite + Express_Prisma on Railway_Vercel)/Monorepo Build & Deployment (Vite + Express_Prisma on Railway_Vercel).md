---
kind: build_system
name: Monorepo Build & Deployment (Vite + Express/Prisma on Railway/Vercel)
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - frontend/package.json
    - railway.toml
    - frontend/vercel.json
    - backend/prisma/schema.prisma
    - backend/tsconfig.json
    - frontend/tsconfig.app.json
---

## What system/approach is used

The project is a **Node.js monorepo** with two independent applications — a TypeScript/Express backend (`backend/`) and a Vite/React frontend (`frontend/`) — each managed by its own `package.json`. There are no Makefiles, Dockerfiles, or CI pipeline files in the repository; build orchestration is handled entirely through npm scripts at the workspace root and platform-specific deployment configs.

- **Backend**: compiled with **TypeScript** (`tsc`) via `prisma generate && tsc`, outputting to `dist/`; runtime uses `node dist/index.js`.
- **Frontend**: built with **Vite** (`vite build`) after type-checking via `tsc -b` (project references), producing static assets under `frontend/dist/`.
- **Database migrations/schema**: driven by **Prisma** (`prisma generate`, `prisma db push`, `prisma migrate dev`).
- **Deployment targets**:
  - Backend → **Railway** using `railway.toml` with `nixpacks` builder.
  - Frontend → **Vercel** using `vercel.json` with framework detection for Vite.

## Key files and packages

- `package.json` (workspace root): top-level scripts that delegate to subprojects (`build:backend`, `build:frontend`, `dev:backend`, `dev:frontend`, `install:all`, `seed`).
- `backend/package.json`: defines `build` (`prisma generate && tsc`), `start:migrate` (`prisma db push && node dist/index.js`), `dev` (`tsx watch src/index.ts`), and Prisma CLI scripts.
- `frontend/package.json`: defines `build` (`tsc -b && vite build`), `dev` (`vite`), `lint` (`oxlint`), `preview`.
- `railway.toml`: declares `builder = "nixpacks"`, `buildCommand = "cd backend && npm install && npm run build"`, and `startCommand = "cd backend && npx prisma db push && node dist/index.js"` with restart policy.
- `frontend/vercel.json`: sets `buildCommand`, `outputDirectory = "dist"`, `framework = "vite"`, SPA rewrites, and immutable caching headers for `/assets/*`.
- `backend/tsconfig.json` / `frontend/tsconfig*.json`: TypeScript compilation configuration per project.
- `backend/prisma/schema.prisma`: single source of truth for the database schema consumed by Prisma during build/start.

## Architecture and conventions

1. **Per-project npm scripts over shared tooling**: Each application owns its own build/dev lifecycle. The root `package.json` only provides convenience aliases that `cd` into the subdirectory and invoke the child script — there is no cross-cutting build pipeline.
2. **Prisma codegen is part of the build**: The backend `build` script runs `prisma generate` before `tsc`, ensuring generated client types are available to the TypeScript compiler.
3. **Dev vs. production entrypoints differ**: Development uses `tsx watch` (hot-reload) for the backend and `vite` for the frontend; production uses compiled JS (`node dist/index.js`) and Vite's optimized static build.
4. **Schema-first DB setup**: Production start (`railway.toml` `startCommand`) runs `npx prisma db push` at boot rather than relying on a migration file, pushing the current schema directly into the database.
5. **Separate deployment targets per app**: The backend is deployed as a Node service on Railway; the frontend is deployed as a static SPA on Vercel with an SPA rewrite rule so client-side routing works.
6. **No containerization**: There is no `Dockerfile`; deployment relies on platform builders (Railway's `nixpacks`, Vercel's framework detection).
7. **No CI/CD pipeline in repo**: No GitHub Actions, GitLab CI, or similar files exist; builds appear to be triggered manually or via the deployment platforms' own mechanisms.

## Conventions and constraints

- **Build order**: When building both sides from the root, scripts must be invoked separately (`npm run build:backend` and `npm run build:frontend`); there is no single `npm run build` that compiles both (the root `build` script only builds the backend).
- **Environment variables**: Both `backend/.env.example` and `frontend/.env.example` document required env vars; the backend reads them via `dotenv` at runtime.
- **Prisma schema is the source of truth**: Database changes are made by editing `backend/prisma/schema.prisma` and then running `prisma db push` (dev/prod) or `prisma migrate dev` (local dev); no separate SQL migration files are referenced in the build.
- **Frontend asset caching**: Vercel config enforces immutable caching (`Cache-Control: public, max-age=31536000, immutable`) for files under `/assets/*`.
- **Restart policy**: Railway restarts the backend up to 3 times on failure (`restartPolicyMaxRetries = 3`, `restartPolicyType = "on_failure"`).