---
kind: build_system
name: NPM Scripts-Based Monorepo Build (Vite + TypeScript/Prisma)
category: build_system
scope:
    - '**'
source_files:
    - backend/package.json
    - backend/tsconfig.json
    - backend/prisma/schema.prisma
    - frontend/package.json
    - frontend/vite.config.ts
    - frontend/tsconfig.app.json
    - frontend/tsconfig.node.json
---

## What system/approach is used

This repository is a **dual-package monorepo** with no shared build orchestration layer. Each subproject (`backend/`, `frontend/`) manages its own dependencies and build lifecycle via `npm` scripts declared in its `package.json`. There are no Makefiles, Dockerfiles, CI pipelines, or top-level build scripts — the project relies entirely on per-package NPM scripts plus Prisma CLI commands.

- **Backend**: Express + TypeScript compiled to plain JavaScript via `tsc`, then run with Node.js. Development uses `tsx watch` for hot-reload of `.ts` sources.
- **Frontend**: React + Vite SPA built with `vite build`; TypeScript is type-checked first via `tsc -b` (project references) before bundling.
- **Database schema & migrations**: Managed by Prisma (`prisma generate`, `prisma migrate dev`, `prisma db push`, `prisma studio`).

## Key files and packages

- `backend/package.json` — defines `dev` (`tsx watch src/index.ts`), `build` (`tsc`), `start` (`node dist/index.js`), and Prisma scripts (`prisma:generate`, `prisma:migrate`, `prisma:push`, `prisma:studio`).
- `backend/tsconfig.json` — compiles `src/**/*` to `dist/` with `target: ES2020`, `module: NodeNext`, strict mode enabled, declarations + source maps emitted.
- `backend/prisma/schema.prisma` — single source of truth for the SQLite database model; `@prisma/client` generated into `node_modules`.
- `frontend/package.json` — defines `dev` (`vite`), `build` (`tsc -b && vite build`), `lint` (`oxlint`), `preview` (`vite preview`).
- `frontend/vite.config.ts` — Vite config with React + Tailwind plugins and dev-server proxy forwarding `/api` and `/uploads` to `http://localhost:5000`.
- `frontend/tsconfig.app.json` / `tsconfig.node.json` — split TS configs for app and node build scripts (used by `tsc -b`).

## Architecture and conventions

1. **Per-package builds only.** There is no root `package.json` or npm workspaces; developers must `cd backend` and `cd frontend` separately to install/build each side.
2. **Backend output is static JS.** `tsc` emits compiled JS under `backend/dist/`; production entry is `node dist/index.js`. No runtime transpilation in production.
3. **Frontend uses a two-phase build.** `tsc -b` performs cross-project type-checking first, then `vite build` produces an optimized static bundle. This enforces that the build fails on type errors before bundling.
4. **Dev server proxies API calls.** The Vite dev server forwards `/api` and `/uploads` requests to the backend running on port 5000, so frontend and backend can be started independently during development.
5. **Prisma is invoked as npm scripts**, not directly. Migrations and client generation are exposed through `npm run prisma:*` scripts rather than raw `npx prisma ...` invocations.
6. **Linting is per-package.** The frontend uses `oxlint` via `npm run lint`; the backend has no lint script defined.

## Conventions and constraints

- **No containerization or CI**: No `Dockerfile`, `docker-compose.yml`, GitHub Actions workflows, or other CI/CD configuration files exist in the repository. Deployment is not automated here.
- **No cross-compilation or multi-target builds**: Both projects target Node.js (backend) and browser (frontend) exclusively; there are no platform-specific build variants.
- **Environment variables**: Backend expects a `.env` file (scaffolded by `.env.example`) loaded via `dotenv`; no build-time env injection is configured beyond this.
- **Versioning**: Backend package version is `1.0.0`; frontend package version is `0.0.0` (private). Version bumps are manual edits to `package.json` — no automated versioning tooling is present.
- **Strict TypeScript**: Backend enforces `strict: true` in `tsconfig.json`; frontend uses project references (`tsc -b`) to enforce type correctness across multiple TS configs.