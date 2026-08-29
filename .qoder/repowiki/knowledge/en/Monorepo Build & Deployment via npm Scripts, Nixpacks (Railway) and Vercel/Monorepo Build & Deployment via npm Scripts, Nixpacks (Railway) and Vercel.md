---
kind: build_system
name: Monorepo Build & Deployment via npm Scripts, Nixpacks (Railway) and Vercel
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - frontend/package.json
    - railway.toml
    - frontend/vercel.json
    - backend/tsconfig.json
    - frontend/tsconfig.app.json
    - frontend/tsconfig.node.json
    - backend/prisma/schema.prisma
---

## What system/approach is used

The project is a TypeScript monorepo with two independently built services — a Node/Express backend (`backend/`) and a React+Vite frontend (`frontend/`). There is no shared Makefile or Dockerfile. Build orchestration is done through npm scripts at the repository root, while deployment targets are configured per service: **Railway** for the backend (using the `nixpacks` builder) and **Vercel** for the frontend.

There is no CI pipeline in this repository (no `.github/workflows`, no GitHub Actions, no Jenkins/GitLab CI files). Versioning is minimal: only top-level `package.json` declares `"version": "1.0.0"`; the backend also has its own `1.0.0` and the frontend uses `0.0.0`. No release automation or changelog tooling was found.

## Key files and packages

- `package.json` (root) — workspace entry point that wires together install, build, dev, seed, and start commands across both subprojects.
- `backend/package.json` — defines the backend build (`prisma generate && tsc`), development server (`tsx watch`), migration/start (`prisma db push && node dist/index.js`), Prisma CLI, seeding script, and runtime dependencies (Express 5, Prisma 6, Zod, JWT, Multer, Google Generative AI).
- `frontend/package.json` — defines Vite-based dev/build/preview/lint scripts; builds to `dist/` after running `tsc -b`.
- `railway.toml` — Railway deployment config: `builder = "nixpacks"`, build command installs backend deps and runs `npm run build`, deploy step pushes the Prisma schema and starts `node dist/index.js`.
- `frontend/vercel.json` — Vercel deployment config: framework `vite`, build output `dist`, SPA rewrites to `index.html`, immutable caching headers on `/assets/*`.
- `backend/tsconfig.json` / `frontend/tsconfig*.json` — TypeScript compilation targets (`dist/index.js` for backend, separate app/node configs for frontend).
- `backend/prisma/schema.prisma` — database schema consumed by Prisma during build/migrate steps.

## Architecture and conventions

### Monorepo script composition
The root `package.json` acts as a thin orchestrator:
- `npm run build` → `cd backend && npm install && npm run build` (installs backend deps then compiles TS + generates Prisma client).
- `npm run start` → `cd backend && npm run start:migrate` (runs `prisma db push` then starts the Express server).
- `npm run dev:backend` / `dev:frontend` — launch each side with hot reload (`tsx watch` for backend, `vite` for frontend).
- `npm run build:backend` / `build:frontend` — compile each side independently.
- `npm run install:all` — install both sides sequentially.
- `npm run seed` — run `tsx src/scripts/seedAdmin.ts` against the backend DB.

This convention means contributors always operate from the repo root; there are no standalone `npm ci`/`npm install` workflows inside subfolders except what the deployment platforms invoke.

### Backend build pipeline
1. `prisma generate` produces the typed Prisma client from `schema.prisma`.
2. `tsc` compiles `src/**/*.ts` into `dist/` (per `backend/package.json` `main: "dist/index.js"`).
3. Runtime is `node dist/index.js` (or `tsx watch src/index.ts` in dev).
4. Database migrations use `prisma db push` (development) rather than `prisma migrate` history; production deploy also runs `prisma db push` before starting.

### Frontend build pipeline
1. `tsc -b` performs a type-check build using the project references setup (`tsconfig.app.json`, `tsconfig.node.json`).
2. `vite build` bundles assets into `dist/`.
3. Vercel serves the static `dist/` folder as an SPA with rewrite rules.

### Deployment targets
- **Backend → Railway**: `railway.toml` tells Nixpacks to install backend deps, run `npm run build`, then execute `npx prisma db push && node dist/index.js` on deploy. Restart policy is `on_failure` with max 3 retries.
- **Frontend → Vercel**: `vercel.json` declares `framework: vite`, `installCommand: npm install`, `buildCommand: npm run build`, `outputDirectory: dist`, plus SPA routing rewrites and long-lived cache headers for `/assets/*`.

### Conventions observed
- Each subproject manages its own `node_modules`; there is no `pnpm`/`yarn`/`npm workspaces` configuration — sibling `npm install` calls are orchestrated manually via root scripts.
- Environment variables live in `.env` / `.env.example` per subproject; the root does not define env vars.
- The backend stores uploaded files under `backend/uploads/` (documents and images); these are not part of the build artifact.
- No linting is enforced at the root level; only the frontend defines an `oxlint` script.
- No tests or test runner scripts were found in any `package.json`.

### Constraints and enforcement
- The backend **must** have `prisma generate` run before `tsc` because generated types are imported at compile time — enforced by the `build` script ordering.
- The backend **must** run `prisma db push` before the server starts in both local `start:migrate` and the Railway deploy step — enforced by the script/command definitions.
- The frontend build requires TypeScript to succeed first (`tsc -b && vite build`); a type error will block the Vite bundle.
- Railway/Nixpacks expects the backend source tree rooted at the project directory it receives; the `buildCommand` explicitly `cd`s into `backend` before installing and building.
- Vercel expects a `dist/` output directory and SPA rewrites; deviating from `vercel.json` would break routing.

### Notable gaps
- No Dockerfile or docker-compose file exists; containerization is delegated entirely to Railway's Nixpacks builder.
- No CI/CD pipeline (GitHub Actions, etc.) is present; builds and deployments appear to be triggered manually or via platform integrations.
- No cross-compilation or multi-platform build logic is defined.
- Version numbers are not synchronized between root, backend, and frontend manifests.