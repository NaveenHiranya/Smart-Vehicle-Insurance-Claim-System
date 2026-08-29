---
kind: build_system
name: Node.js Monorepo Build & Deployment (Nixpacks/Railway + Vite/Vercel)
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - backend/tsconfig.json
    - backend/prisma/schema.prisma
    - railway.toml
    - frontend/package.json
    - frontend/vite.config.ts
    - frontend/vercel.json
---

## What system/approach is used

The project is a Node.js monorepo with two independently built and deployed services: a TypeScript/Express backend (`backend/`) and a React+Vite frontend (`frontend/`). There is no shared build orchestration tool (no Makefile, no Nx/Nest CLI, no Turborepo). Instead, each subproject declares its own `package.json` scripts, and the root `package.json` provides thin convenience wrappers that `cd` into each directory and invoke the local scripts. Production deployment uses platform-specific builders:

- **Backend**: Deployed to Railway via `railway.toml`, which configures Nixpacks as the builder, pins Node runtime version 22.17.0 (required by the `sharp` dependency), and runs `prisma db push` before starting.
- **Frontend**: Deployed to Vercel via `frontend/vercel.json`, which declares the Vite framework, rewrites all routes to `index.html` for SPA routing, and sets long-lived immutable cache headers on `/assets/*`.

There are no CI pipeline files (no `.github/workflows`, no `.gitlab-ci.yml`, no Jenkinsfile) — builds are driven entirely by npm scripts and the hosting platforms' native build steps.

## Key files and packages

- `package.json` (root): top-level scripts `build`, `start`, `dev:backend`, `dev:frontend`, `build:backend`, `build:frontend`, `install:all`, `seed` — all implemented as `cd <dir> && npm run ...` shims.
- `backend/package.json`: defines `dev` (`tsx watch src/index.ts`), `build` (`prisma generate && tsc`), `start` (`node dist/index.js`), `start:migrate` (`prisma db push && node dist/index.js`), plus Prisma and seed scripts. Declares `engines.node >= 20.9.0`.
- `backend/tsconfig.json`: compiles `src/**/*` to `./dist` with `target ES2020`, `module NodeNext`, strict mode enabled, emits declarations and source maps.
- `backend/prisma/schema.prisma` + `backend/prisma/dev.db`: Prisma schema and dev database; migrations are pushed at runtime rather than applied as a separate step in production.
- `railway.toml`: Nixpacks builder, `npm install && npm run build` as build command, `npx prisma db push && node dist/index.js` as start command, restart policy (on failure, max 3 retries), and pinned `NODE_VERSION` / `NIXPACKS_NODE_VERSION = 22.17.0`.
- `frontend/package.json`: `dev` (`vite`), `build` (`tsc -b && vite build`), `lint` (`oxlint`), `preview` (`vite preview`).
- `frontend/vite.config.ts`: React + Tailwind plugins, `outDir: 'dist'`, sourcemaps disabled in build, dev server proxies `/api` and `/uploads` to `VITE_API_URL` (default `http://localhost:5000`).
- `frontend/vercel.json`: `buildCommand: npm run build`, `outputDirectory: dist`, framework `vite`, SPA rewrite rule, immutable asset caching headers.
- `.nvmrc` (root): pins the Node version used by NVM across both services.

## Architecture and conventions

- **Per-service build pipelines**: Each service owns its own build definition. The backend compiles TypeScript to `dist/` via `tsc`; the frontend runs type-checking (`tsc -b`) then Vite's bundler to `dist/`. There is no cross-compilation or multi-target build.
- **Prisma codegen is part of the build**: The backend `build` script runs `prisma generate` before `tsc`, so generated client types are always present at compile time.
- **Database migration strategy**: Development uses `prisma migrate dev`; production uses `prisma db push` (schema diff-and-push, not versioned migrations) executed at container start via Railway's start command and the root `start` script (`npm run start:migrate`).
- **Environment-driven configuration**: Frontend reads `VITE_API_URL` from environment (via `loadEnv`) to target the backend during dev/prod; backend loads secrets via `dotenv` (`.env`/`.env.example`).
- **Platform-native deployment**: No custom Dockerfiles or shell scripts — Railway's Nixpacks auto-detects the Node app and runs the configured commands; Vercel auto-detects the Vite project from `vercel.json`.
- **Versioning**: Both `backend/package.json` and root `package.json` declare `version: 1.0.0`; there is no automated version bumping or changelog generation observed.

## Conventions and constraints

- **Node version constraint**: Backend `package.json` requires `node >= 20.9.0` (enforced by npm engines); Railway enforces this further by pinning `NODE_VERSION = 22.17.0` in `railway.toml` because the `sharp` image-processing dependency requires Node ≥ 20.9.
- **Build output location**: Both services emit to `dist/` — backend via `tsconfig.json` `outDir`, frontend via Vite default — which is consumed by both Railway and Vercel.
- **Dev vs prod entrypoints**: Development uses `tsx watch` (hot-reloading TypeScript) for the backend and `vite` dev server for the frontend; production runs the compiled JavaScript under `node dist/index.js`.
- **SPA routing**: Frontend relies on Vercel's rewrite rule (`source: /(.*) → destination: /index.html`) to handle client-side routes; the backend serves static uploads directly from the `uploads/` directory mounted at runtime.
- **Linting**: Frontend uses `oxlint` (configured via `frontend/.oxlintrc.json`); no lint step is wired into the build script, it must be invoked explicitly via `npm run lint`.
- **No test runner in build**: There are no test scripts in any `package.json`; tests, if any, are not part of the build/deploy pipeline.