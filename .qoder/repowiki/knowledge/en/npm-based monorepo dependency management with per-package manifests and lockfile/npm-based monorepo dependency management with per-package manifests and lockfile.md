---
kind: dependency_management
name: npm-based monorepo dependency management with per-package manifests and lockfiles
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - backend/package-lock.json
    - frontend/package.json
    - frontend/package-lock.json
    - railway.toml
    - backend/.gitignore
    - frontend/.gitignore
---

## What system/approach is used

The repository uses **npm** as the package manager for both the backend (Node.js/Express + TypeScript) and frontend (React + Vite) applications. There is no monorepo tool (no `pnpm workspace`, `yarn workspaces`, or `npm workspaces`); instead, each subproject (`backend/`, `frontend/`) maintains its own `package.json` and `package-lock.json`. A root `package.json` provides convenience scripts that invoke `npm install` and build commands inside each subdirectory.

There is no vendoring of third-party code — dependencies are installed from the public npm registry into `node_modules/` at runtime/build time. No private registries, `.npmrc`, or proxy configuration were found in the repository.

## Key files and packages

- `package.json` (root): defines top-level scripts (`install:all`, `build`, `start`, `dev:backend`, `dev:frontend`, `seed`) that delegate to the backend and frontend directories. This is the only orchestration point for installing dependencies across both apps.
- `backend/package.json`: declares runtime dependencies (`express`, `@prisma/client`, `jsonwebtoken`, `bcryptjs`, `multer`, `cors`, `dotenv`, `zod`, `@google/generative-ai`) and dev dependencies (`typescript`, `tsx`, `nodemon`, `@types/*`). The build script runs `prisma generate && tsc`; the start command uses `node dist/index.js` after migration via `prisma db push`.
- `frontend/package.json`: declares React 19, Vite, Tailwind CSS v4, `react-router-dom`, `axios`, `lucide-react`, `react-dropzone`, plus TypeScript and `oxlint` as dev dependencies. Build runs `tsc -b && vite build`.
- `backend/package-lock.json` and `frontend/package-lock.json`: lockfile versions are committed alongside their respective `package.json` files, pinning exact transitive dependency trees per application.
- `railway.toml`: deployment config instructs the Railway platform to run `cd backend && npm install && npm run build` during build and `cd backend && npx prisma db push && node dist/index.js` at startup, so production installs happen on the remote host rather than relying on a pre-built artifact.

## Architecture and conventions

- **Per-app isolation**: Each app owns its dependency graph independently. There is no shared dependency hoisting or cross-app package sharing; this avoids version conflicts between the backend's Express stack and the frontend's React/Vite stack.
- **Lockfiles are tracked**: Both `package-lock.json` files are present in the repo tree, indicating they are committed to version control. This pins reproducible installs across environments.
- **TypeScript-first tooling**: Dev dependencies include `typescript` and type definitions (`@types/*`) for all major runtime libraries, ensuring type safety across the dependency surface.
- **Prisma integration**: The backend uses Prisma as an ORM; `prisma generate` is part of the build step, and migrations are applied at runtime via `prisma db push` in both local `start:migrate` and the Railway deploy command.
- **No monorepo tooling**: The root `package.json` does not declare workspaces. Scripts simply `cd` into subdirectories and call `npm install` there, which means each app must be installed separately.

## Conventions and constraints

- Dependencies use caret (`^`) ranges in `dependencies` and `devDependencies`, allowing minor/patch updates within the same major version (e.g., `"express": "^5.2.1"`, `"react": "^19.2.8"`).
- `node_modules/` is ignored by `.gitignore` in both `backend/` and `frontend/`, so installed packages are never checked in.
- Production deployments do not rely on a pre-published npm package; the CI/deploy pipeline runs `npm install` directly against the public npm registry, so network access to `registry.npmjs.org` is required at deploy time.
- Environment-specific configuration is kept out of source control via `.env` (ignored) and documented through `.env.example` files in both subprojects.
- There is no evidence of automated dependency update tooling (e.g., Dependabot, Renovate) in the repository metadata examined.