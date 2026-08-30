---
kind: dependency_management
name: npm-based monorepo dependency management with per-workspace manifests and lockfiles
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - frontend/package.json
    - backend/package-lock.json
    - frontend/package-lock.json
    - railway.toml
    - backend/.nvmrc
    - backend/.gitignore
---

## What system/approach is used

The FastClaim platform uses **npm** as the package manager across a multi-package JavaScript/TypeScript monorepo. There is no root `package-lock.json`; instead, each workspace (`backend/`, `frontend/`) declares its own `package.json` and ships a corresponding `package-lock.json`. The repository also includes a top-level `package.json` that provides convenience scripts to orchestrate install/build/start across both workspaces.

Node.js version is pinned via `.nvmrc` (root file at `backend/.nvmrc` containing `22.17.0`). The deployment configuration on Railway explicitly pins `NODE_VERSION = "22.17.0"` and `NIXPACKS_NODE_VERSION = "22.17.0"` in `railway.toml`, noting that `sharp` requires Node ≥ 20.9.

## Key files and packages

- `backend/package.json` — Declares runtime dependencies for the Express API: `express`, `@prisma/client`, `prisma`, `@google/generative-ai`, `bcryptjs`, `jsonwebtoken`, `multer`, `sharp`, `zod`, `cors`, `dotenv`. Dev dependencies include TypeScript, `tsx`, `nodemon`, and type packages.
- `frontend/package.json` — Declares React 19, `react-router-dom`, `axios`, `react-dropzone`, `lucide-react`, plus Vite tooling, Tailwind CSS v4, Oxlint, and TypeScript.
- `package.json` (root) — Provides orchestrator scripts: `install:all`, `build`, `start`, `dev:backend`, `dev:frontend`, `build:backend`, `build:frontend`, `seed`.
- `backend/package-lock.json` / `frontend/package-lock.json` — Lockfiles pin exact transitive versions for reproducible installs.
- `railway.toml` — CI/CD build command runs `cd backend && npm install && npm run build`; deploy step runs `npx prisma db push && node dist/index.js`.
- `backend/.gitignore` — Excludes `node_modules/`, `dist/`, `.env`, `uploads/`, `*.log`, and `prisma/*.db`.
- `backend/.nvmrc` — Pins Node runtime to `22.17.0`.

## Architecture and conventions

- **Per-workspace manifests**: Each subproject maintains its own `package.json` and lockfile; there is no `workspaces` field or shared dependency hoisting. This keeps backend and frontend dependency sets isolated.
- **Version ranges use caret (`^`)**: All dependencies are declared with `^` (e.g. `express ^5.2.1`, `react ^19.2.8`), allowing minor/patch updates while keeping major-version compatibility. Types are similarly ranged (e.g. `@types/node ^26.4.0`).
- **No vendoring**: Dependencies are fetched from the public npm registry into `node_modules/` directories; nothing is committed under a `vendor/` folder.
- **Lockfiles are committed**: Both `backend/package-lock.json` and `frontend/package-lock.json` are tracked in version control, ensuring deterministic builds.
- **Build pipeline**: Development uses `tsx watch` for hot-reloading TypeScript source directly. Production builds compile TypeScript to `dist/` via `tsc`, then ship `dist/index.js` as the entry point.
- **Prisma integration**: Prisma is listed as both a dependency and dev dependency; migrations are applied at deploy time via `npx prisma db push` in the Railway start command rather than during build.
- **Environment-driven config**: Runtime secrets (DB URL, JWT secret, etc.) are loaded via `dotenv` from `.env` (which is gitignored); an `.env.example` is provided for reference.

## Conventions and constraints

- **Node version must be 22.17.0**: Enforced by `backend/.nvmrc` and mirrored in `railway.toml` (`NODE_VERSION`, `NIXPACKS_NODE_VERSION`). The comment in `railway.toml` explains this is required because `sharp` needs Node ≥ 20.9.
- **Dependencies are not locked to exact patch versions in manifests**: Caret ranges allow automatic minor/patch upgrades; exact versions are captured only in the lockfiles.
- **Install is workspace-scoped**: Scripts in the root `package.json` invoke `npm install` inside each workspace directory individually; there is no global `npm ci` or `npm install --frozen-lockfile` script, so reproducibility relies on developers running the workspace-specific commands.
- **Dev-only tooling is separated**: Build-time tools (`typescript`, `vite`, `oxlint`, `tsx`, `nodemon`) live under `devDependencies`; only runtime packages end up in production bundles.
- **Database schema lives alongside code**: Prisma schema (`backend/prisma/schema.prisma`) is versioned with the application and pushed at deploy time, tying database evolution to the same dependency lifecycle.