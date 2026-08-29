---
kind: dependency_management
name: Node.js Monorepo Dependency Management via npm with Lockfiles and NVM Pinning
category: dependency_management
scope:
    - '**'
source_files:
    - backend/package.json
    - frontend/package.json
    - backend/package-lock.json
    - frontend/package-lock.json
    - backend/.nvmrc
    - railway.toml
    - package.json
---

## System/Approach

This repository is a Node.js monorepo (backend + frontend) managed with **npm** as the package manager. Each workspace (`backend/`, `frontend/`) has its own `package.json` and `package-lock.json`, so dependencies are declared per subproject rather than centrally at the repo root. The root `package.json` only contains convenience scripts that `cd` into each subdirectory to run install/build/start commands — it does not declare any dependencies itself.

Dependency versions use **caret ranges** (`^x.y.z`) in both workspaces, allowing minor/patch updates within the major version. A `.nvmrc` file in `backend/` pins the development Node runtime to `22.17.0`, and `railway.toml` enforces the same `NODE_VERSION = "22.17.0"` for production builds/deployments, ensuring consistent environments across dev and CI.

## Key Files

- `backend/package.json` — declares backend runtime dependencies (`express`, `@prisma/client`, `jsonwebtoken`, `bcryptjs`, `multer`, `sharp`, `zod`, `@google/generative-ai`, `dotenv`) and dev dependencies (`typescript`, `tsx`, `nodemon`, Prisma tooling, `@types/*`).
- `frontend/package.json` — declares frontend runtime dependencies (`react`, `react-dom`, `react-router-dom`, `axios`, `react-dropzone`, `lucide-react`) and dev dependencies (`vite`, `@vitejs/plugin-react`, `tailwindcss`, `oxlint`, TypeScript).
- `backend/package-lock.json` / `frontend/package-lock.json` — lockfiles pin exact transitive dependency trees for reproducible installs.
- `backend/.nvmrc` — pins Node version `22.17.0` for local development.
- `railway.toml` — build/deploy config using Nixpacks; explicitly sets `NODE_VERSION = "22.17.0"` and `NIXPACKS_NODE_VERSION = "22.17.0"` because Sharp requires Node ≥ 20.9.
- Root `package.json` — provides umbrella scripts (`install:all`, `build`, `start`, `dev:backend`, `dev:frontend`, `seed`) that orchestrate per-workspace npm commands.

## Architecture and Conventions

- **Per-workspace manifests**: Backend and frontend maintain independent dependency graphs. There is no shared workspace or monorepo tool (e.g., npm workspaces, pnpm, Turborepo); coordination happens through root-level shell-style scripts.
- **Version pinning strategy**: Runtime deps use caret ranges (`^`) to allow safe minor/patch upgrades while keeping major versions stable. Dev deps also use caret ranges except `typescript` in the frontend which uses a tilde range (`~6.0.2`) for tighter patch control.
- **TypeScript toolchain**: Both workspaces compile TypeScript; the backend uses `tsx` for development hot-reload and `tsc` for production builds, while the frontend uses Vite's built-in TypeScript support.
- **Prisma integration**: The backend uses Prisma (`@prisma/client` + `prisma` CLI) with schema under `backend/prisma/schema.prisma`. Database migrations are applied at startup via `prisma db push` in the `start:migrate` script and in the Railway deploy command.
- **No vendoring**: Dependencies are installed from the public npm registry into `node_modules/`; there is no vendored copy of third-party code.
- **Private registries / auth**: No `.npmrc`, `package.json` `publishConfig`, or environment variables referencing private registries were found — all packages come from the public npm registry.

## Conventions and Constraints

- **Node version must be 22.17.0**: Enforced by `backend/.nvmrc` for local development and by `railway.toml` (`NODE_VERSION`, `NIXPACKS_NODE_VERSION`) for production deployments. This is required because `sharp` depends on native binaries compiled against this Node ABI.
- **Lockfiles are committed**: Both `backend/package-lock.json` and `frontend/package-lock.json` exist and should be kept in sync with `package.json` to guarantee deterministic installs.
- **Engine constraint**: `backend/package.json` declares `engines.node >= 20.9.0`, matching the Sharp requirement noted in `railway.toml`.
- **Build pipeline**: Production builds run `npm install && npm run build` inside `backend/` (as defined in `railway.toml`), then start the server with `node dist/index.js` after running `prisma db push`.
- **Development workflow**: Use `npm run dev:backend` (tsx watch) and `npm run dev:frontend` (Vite dev server) from the repo root; `npm run install:all` installs dependencies for both workspaces sequentially.