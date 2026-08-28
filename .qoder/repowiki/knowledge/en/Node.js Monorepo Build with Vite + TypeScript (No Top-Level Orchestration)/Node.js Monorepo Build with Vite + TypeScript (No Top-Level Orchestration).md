---
kind: build_system
name: Node.js Monorepo Build with Vite + TypeScript (No Top-Level Orchestration)
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
    - .gitignore
---

## What system/approach is used

This repository is a flat Node.js workspace containing two independent npm packages — `backend` (Express + TypeScript) and `frontend` (React + Vite + TypeScript). There is no top-level build orchestration tool (no Makefile, no Dockerfile, no CI pipeline, no monorepo manager such as Turborepo/Nx/Lerna). Each package manages its own build lifecycle via `npm scripts` in its `package.json`, and the two sides are built independently.

- Backend: TypeScript compiled to plain JS by `tsc` (`"build": "tsc"`) into `dist/`; development uses `tsx watch src/index.ts` for hot-reload; runtime is `node dist/index.js`. Prisma codegen/migrations are exposed as separate scripts (`prisma:generate`, `prisma:migrate`, `prisma:push`, `prisma:studio`).
- Frontend: Type-checking via `tsc -b` (project references), then bundling via `vite build`; development via `vite dev`; linting via `oxlint` (`"lint": "oxlint"`); preview via `vite preview`.

There is no cross-package script at the repo root that builds both sides together; consumers must run `npm run build` inside each directory separately.

## Key files and packages

- `backend/package.json` — defines `dev`, `build`, `start`, and all Prisma-related scripts; declares Express, Prisma client, Zod, JWT, multer, Gemini SDK, etc.
- `backend/tsconfig.json` — compiles `src/**/*` to `./dist` with `target: ES2020`, `module: NodeNext`, strict mode, source maps, and declaration generation.
- `backend/prisma/schema.prisma` — data model driving Prisma migrations and client generation.
- `frontend/package.json` — defines `dev`, `build` (`tsc -b && vite build`), `lint`, `preview`; depends on React 19, Vite 8, Tailwind v4, axios, react-router-dom, lucide-react.
- `frontend/vite.config.ts` — registers `@vitejs/plugin-react` and `@tailwindcss/vite`; configures dev server proxy so `/api` and `/uploads` requests forward to `http://localhost:5000` (the backend's default port).
- `frontend/tsconfig.app.json` — app-side TS config with `noEmit: true`, `verbatimModuleSyntax`, `moduleDetection: force`, JSX `react-jsx`, and unused-variable checks.
- `frontend/tsconfig.node.json` — node-side TS config for `vite.config.ts` and other non-bundled TS files.
- `.gitignore` (repo root) — ignores `node_modules` and `dist`, keeping generated artifacts out of version control.

## Architecture and conventions

- **Per-package npm scripts**: Every build, dev, lint, and Prisma command lives in the respective `package.json` under `scripts`. There is no shared script library or shell wrapper.
- **TypeScript-first compilation**:
  - Backend emits real JavaScript (`outDir: ./dist`, `declaration: true`, `sourceMap: true`) consumed directly by `node`.
  - Frontend uses project-reference style (`tsc -b`) purely for type-checking; Vite performs the actual bundling and does not emit TS to disk (`noEmit: true` in app tsconfig).
- **Dev server proxy convention**: The frontend dev server proxies `/api` and `/uploads` to `http://localhost:5000`, which is the conventional backend listen port implied by the absence of an explicit env override. This couples the two packages during local development but keeps them decoupled for production.
- **Prisma integration**: The backend treats Prisma as a first-class build step — `prisma generate` must run before the client can be imported, and migration/push/studio commands are surfaced alongside normal npm scripts.
- **Linting**: Only the frontend has an explicit lint script (`oxlint`); the backend relies on TypeScript's strict compiler flags rather than a dedicated linter.

## Conventions and constraints

- **Build entry points**: Production backend runs `node dist/index.js` (declared as `main` in `backend/package.json`); production frontend is a static bundle emitted by `vite build` (default `dist/` output).
- **Strict TypeScript**: Both sides enable strict compiler options (`strict: true` on backend; `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` on frontend).
- **No top-level orchestration**: There is no Makefile, Dockerfile, GitHub Actions workflow, or root `package.json` script that builds both projects together. A full build requires running `npm install && npm run build` in both `backend/` and `frontend/` independently, plus `npm run prisma:generate` (and optionally `prisma:migrate` / `prisma:push`) in `backend/`.
- **Environment configuration**: The backend expects environment variables loaded via `dotenv` (`.env.example` exists); there is no build-time env substitution beyond what Vite/TS provide.
- **Artifacts are gitignored**: `node_modules` and `dist` are excluded from version control, so builds must be reproducible from `package-lock.json` files.