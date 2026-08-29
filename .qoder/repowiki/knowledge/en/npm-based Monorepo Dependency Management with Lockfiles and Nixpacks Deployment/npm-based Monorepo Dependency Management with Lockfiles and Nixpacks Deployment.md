---
kind: dependency_management
name: npm-based Monorepo Dependency Management with Lockfiles and Nixpacks Deployment
category: dependency_management
scope:
    - '**'
source_files:
    - backend/package.json
    - frontend/package.json
    - package.json
    - backend/package-lock.json
    - frontend/package-lock.json
    - railway.toml
    - backend/.gitignore
    - frontend/.gitignore
---

## What system/approach is used

This repository uses **npm** as the package manager for a multi-package monorepo consisting of a Node.js/TypeScript backend (`backend/`) and a Vite/React frontend (`frontend/`). Each subproject declares its own `package.json` with explicit dependency versions pinned via caret (`^`) ranges, and each project maintains its own `package-lock.json` lockfile. There is no npm workspaces configuration at the root; instead, the root `package.json` provides convenience scripts that `cd` into each subdirectory to run install/build/start commands independently.

Deployment is handled by **Railway** using the **nixpacks** builder, which automatically detects the Node.js environment and runs `npm install && npm run build` in the `backend/` directory.

## Key files and packages

- `backend/package.json` — Backend dependencies: Express 5, Prisma 6, Zod 4, Google Generative AI SDK, bcryptjs, JSON Web Tokens, Multer, dotenv. Dev dependencies include TypeScript 7, tsx (for running `.ts` directly), nodemon, and type definitions for all runtime deps.
- `frontend/package.json` — Frontend dependencies: React 19, React Router DOM 7, Axios, Lucide icons, React Dropzone. Dev dependencies include Vite 8, Tailwind CSS v4 plugin, Oxlint, TypeScript ~6, and React type definitions.
- `package.json` (root) — Aggregator scripts: `install:all`, `dev:backend`, `dev:frontend`, `build:backend`, `build:frontend`, `seed`. No shared dependencies declared here.
- `backend/package-lock.json` / `frontend/package-lock.json` — Deterministic lockfiles per project.
- `railway.toml` — Deployment config using nixpacks builder; installs backend deps and starts the compiled server after pushing Prisma schema.
- `backend/.gitignore` / `frontend/.gitignore` — Both ignore `node_modules/`, `dist/`, `.env`, and logs. No vendored dependencies are checked in.

## Architecture and conventions

- **Per-project isolation**: The backend and frontend are fully independent npm projects with separate dependency trees, lockfiles, and build outputs. There is no shared `node_modules` hoisting or workspace setup.
- **Version pinning style**: All production dependencies use caret ranges (`^major.minor.patch`), allowing minor/patch updates but preventing major version bumps automatically. This balances stability with access to newer features.
- **No vendoring**: Dependencies are never vendored into the repo. `node_modules/` is gitignored everywhere, and the lockfiles are committed to ensure reproducible installs.
- **Runtime vs dev split**: Runtime-only libraries (Express, Prisma client, Zod, axios, etc.) go under `dependencies`; tooling (TypeScript, tsx, nodemon, Vite, oxlint, type definitions) goes under `devDependencies`.
- **Prisma codegen**: The backend's `build` script runs `prisma generate` before `tsc`, ensuring the generated Prisma Client types are available at compile time. The deployment start command also runs `npx prisma db push` to sync the schema.
- **TypeScript execution**: The backend uses `tsx watch` for development (direct `.ts` execution without precompilation) and compiles to `dist/` for production via `tsc`.
- **Frontend module system**: The frontend is configured as an ES module (`"type": "module"`) and uses Vite for bundling and dev server.

## Conventions and constraints

- **Lockfiles must be committed**: Both `backend/package-lock.json` and `frontend/package-lock.json` are present and tracked, enforcing deterministic dependency resolution across environments.
- **No private registries or scoped packages beyond public npm**: All dependencies are pulled from the public npm registry; there is no `.npmrc` file, no `registry` overrides, and no private package references observed.
- **Environment variables are externalized**: Secrets (database URL, JWT keys, API keys) are loaded via `dotenv` from `.env` files, which are gitignored. An `.env.example` is provided in both `backend/` and `frontend/` to document required variables.
- **Build pipeline is explicit**: The root `package.json` scripts delegate to subprojects rather than using a monorepo tool like Turborepo or Nx. CI/deployment relies on `railway.toml` to install and build only the backend (the frontend is presumably deployed separately, e.g., to Vercel given `vercel.json` in `frontend/`).
- **Dependency updates are manual**: There is no automated update tool (e.g., Dependabot, Renovate) detected in the repository. Version bumps are managed by editing `package.json` entries directly.