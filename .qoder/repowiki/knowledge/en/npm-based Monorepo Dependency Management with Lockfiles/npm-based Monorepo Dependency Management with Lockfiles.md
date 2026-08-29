---
kind: dependency_management
name: npm-based Monorepo Dependency Management with Lockfiles
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - frontend/package.json
    - backend/package-lock.json
    - frontend/package-lock.json
    - backend/.gitignore
    - frontend/.gitignore
---

## System Overview

This repository uses **npm** as the package manager across a multi-package monorepo structure. The root `package.json` acts as an orchestration layer that delegates dependency installation and build tasks to the `backend/` and `frontend/` sub-projects, each of which maintains its own independent `package.json`, `package-lock.json`, and `node_modules/` directory.

## Key Files and Packages

- **Root orchestrator**: `package.json` — defines workspace-level scripts (`install:all`, `dev:backend`, `dev:frontend`, `build:backend`, `build:frontend`, `seed`) that `cd` into each subdirectory and invoke npm commands there. No shared dependencies are declared at the root level; it is marked `"private": true`.
- **Backend manifest**: `backend/package.json` — declares runtime dependencies (`express`, `@prisma/client`, `jsonwebtoken`, `bcryptjs`, `multer`, `cors`, `dotenv`, `zod`, `@google/generative-ai`) and dev dependencies (`typescript`, `tsx`, `nodemon`, Prisma CLI, and `@types/*` packages). Build script runs `prisma generate && tsc`; start script runs `prisma db push && node dist/index.js`.
- **Frontend manifest**: `frontend/package.json` — declares React 19, Vite, Tailwind CSS v4, Axios, React Router DOM, and related dev tooling (`oxlint`, `@vitejs/plugin-react`, TypeScript ~6.0.2). Uses ES modules (`"type": "module"`).
- **Lockfiles**: Both `backend/package-lock.json` and `frontend/package-lock.json` use lockfileVersion 3 and pin every transitive dependency with integrity hashes resolved from `https://registry.npmjs.org/`.
- **`.gitignore` files**: Both `backend/.gitignore` and `frontend/.gitignore` exclude `node_modules/`, `dist/`, `.env`, and `*.log`, confirming that `node_modules` is never committed.

## Architecture and Conventions

- **Per-subproject isolation**: Each subproject (backend, frontend) has its own dependency graph, version ranges, and lockfile. There is no shared workspace configuration (no `pnpm-workspace.yaml`, `lerna.json`, or npm workspaces setup); the root `package.json` simply shells out to each subproject via `cd` + `npm run ...`.
- **Version range strategy**: All dependencies in both manifests use caret (`^`) ranges (e.g., `"express": "^5.2.1"`, `"react": "^19.2.8"`), allowing minor/patch updates while blocking major bumps. The frontend pins TypeScript with a tilde (`"~6.0.2"`) for stricter patch-level locking.
- **Build-time code generation**: The backend's `build` script explicitly runs `prisma generate` before `tsc`, ensuring the generated Prisma client types are always regenerated from `prisma/schema.prisma` prior to compilation.
- **No vendoring**: `node_modules/` directories exist locally but are gitignored; there is no vendored copy of third-party packages checked into source control.
- **No private registry / auth**: All resolved URLs in the lockfiles point to `https://registry.npmjs.org/`. No `.npmrc` file exists in the repository, so no private registry, token, or `GOOGLE_APPLICATION_CREDENTIALS`-style authentication is configured at the dependency level.

## Conventions and Constraints

- **Lockfiles are committed**: Both `backend/package-lock.json` and `frontend/package-lock.json` are present in the repository, enforcing reproducible installs across environments.
- **Dependencies are not hoisted**: Because npm workspaces are not used, each subproject installs its own `node_modules/`; there is no shared dependency tree.
- **Runtime vs dev separation**: Dependencies are cleanly split between `dependencies` (runtime) and `devDependencies` (tooling, type definitions, dev servers) in both subprojects.
- **Prisma lifecycle**: The backend treats Prisma as both a runtime client (`@prisma/client`) and a dev/build tool (`prisma` CLI). Database migrations are applied at startup via `start:migrate` (`prisma db push`), rather than through a separate migration step — this is a deployment convention tied to the dependency usage pattern.
- **TypeScript versions diverge**: Backend uses TypeScript `^7.0.2` while frontend uses `~6.0.2`; they are installed independently per subproject, avoiding cross-project type conflicts.