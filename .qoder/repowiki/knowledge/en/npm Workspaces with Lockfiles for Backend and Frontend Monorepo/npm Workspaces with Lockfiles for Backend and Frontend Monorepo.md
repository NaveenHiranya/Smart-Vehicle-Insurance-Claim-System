---
kind: dependency_management
name: npm Workspaces with Lockfiles for Backend and Frontend Monorepo
category: dependency_management
scope:
    - '**'
source_files:
    - backend/package.json
    - backend/package-lock.json
    - frontend/package.json
    - frontend/package-lock.json
    - backend/prisma/schema.prisma
---

## Dependency Management Approach

This repository is a Node.js monorepo containing two independent npm projects — a backend (`backend/`) built with Express/TypeScript and a frontend (`frontend/`) built with React/Vite. Each project manages its own dependency graph independently using **npm** (lockfileVersion 3) with `package-lock.json` files committed alongside each `package.json`. There is no shared workspace configuration, no vendoring of third-party packages, and no private registry configured.

### Package manifests

- **Backend** (`backend/package.json`, name `autoshield-ai-backend`, version `1.0.0`):
  - Runtime dependencies: `express ^5.2.1`, `@prisma/client ^6.19.3`, `@google/generative-ai ^0.24.1`, `bcryptjs ^3.0.3`, `cors ^2.8.6`, `dotenv ^17.4.2`, `jsonwebtoken ^9.0.3`, `multer ^2.2.0`, `uuid ^14.0.2`, `zod ^4.4.3`.
  - Dev dependencies: TypeScript `^7.0.2`, `tsx ^4.23.12` (for running `.ts` directly), `nodemon ^3.1.14`, `@types/*` type packages for runtime deps, and `prisma ^6.19.3` as a dev dependency (codegen tool).
  - Scripts include `dev` (via `tsx watch`), `build` (`tsc`), `start` (`node dist/index.js`), and Prisma commands (`prisma:generate`, `prisma:migrate`, `prisma:push`, `prisma:studio`).

- **Frontend** (`frontend/package.json`, name `frontend`, version `0.0.0`, marked `private: true`):
  - Runtime dependencies: `react ^19.2.8`, `react-dom ^19.2.8`, `react-router-dom ^7.18.2`, `axios ^1.20.0`, `lucide-react ^1.34.0`, `react-dropzone ^20.1.1`.
  - Dev dependencies: Vite `^8.2.2`, `@vitejs/plugin-react ^6.1.0`, `typescript ~6.0.2`, `oxlint ^1.79.0`, `tailwindcss ^4.3.3`, `@tailwindcss/vite ^4.3.3`, plus `@types/react`, `@types/react-dom`, `@types/node`.
  - Scripts: `dev` (`vite`), `build` (`tsc -b && vite build`), `lint` (`oxlint`), `preview` (`vite preview`).

### Versioning strategy

- Both projects use **caret ranges** (`^`) for all dependencies, allowing minor/patch updates to resolve automatically. The frontend pins TypeScript at `~6.0.2` (tilde) to avoid breaking changes in the compiler across builds, while the backend pins TypeScript at `^7.0.2`.
- All versions are locked by the committed `package-lock.json` files (lockfileVersion 3), ensuring deterministic installs across environments.
- No `engines` field constrains the Node.js version in either manifest; however, transitive dependencies (e.g., esbuild binaries) declare `node >= 18` or `>=22.12.0` requirements.

### Lockfiles and install reproducibility

- `backend/package-lock.json` and `frontend/package-lock.json` are present and committed, pinning every transitive dependency's exact version and integrity hash. This is the primary mechanism keeping the dependency tree stable.
- There is no `pnpm-lock.yaml`, `yarn.lock`, or `bun.lock`; npm is the sole package manager in use.

### Vendoring / private registries

- No `vendor/`, `lib/`, or other vendored directories exist. All third-party code is installed into per-project `node_modules/` directories (which are gitignored via each folder's `.gitignore`).
- No `.npmrc` file exists at the repo root or within either subproject, so there is no custom registry, token, or `GOOGLE_GENERATIVE_AI_API_KEY`-style environment-driven resolution beyond standard npm behavior.
- No `resolutions` or `overrides` fields appear in either `package.json`, meaning dependency conflicts are resolved by npm's default algorithm without manual intervention.

### Build-time vs runtime separation

- The backend separates concerns cleanly: runtime libraries live under `dependencies`, while build/tooling tools (`tsx`, `typescript`, `nodemon`, `@types/*`, `prisma`) live under `devDependencies`. Production deployments run `npm ci` + `npm run build` then execute `node dist/index.js`.
- The frontend similarly keeps UI frameworks (`react`, `react-dom`, `react-router-dom`, `axios`, `lucide-react`, `react-dropzone`) in `dependencies` and bundler/tooling (`vite`, `@vitejs/plugin-react`, `typescript`, `oxlint`, `tailwindcss`) in `devDependencies`.

### Shared types

- There is no cross-package dependency between `backend` and `frontend`. Instead, both projects define their own local `src/types/index.ts` files (backend and frontend each have a `types/` directory), duplicating shared domain shapes rather than sharing them through an npm workspace or internal package. This means dependency management does not need to coordinate shared library versions between the two sides.

### Conventions observed

- Every new dependency must be added to the appropriate `package.json` (`dependencies` vs `devDependencies`) and the corresponding `package-lock.json` must be committed to keep installs deterministic.
- Prisma schema evolution is handled through the `prisma` CLI scripts declared in `backend/package.json` (`prisma generate`, `prisma migrate dev`, `prisma db push`, `prisma studio`); the generated client (`@prisma/client`) is a runtime dependency while the `prisma` CLI itself is a dev dependency.
- The frontend uses OxLint (`oxlint`) instead of ESLint for linting, and Tailwind CSS v4 via the Vite plugin (`@tailwindcss/vite`) rather than the traditional PostCSS pipeline.

### Constraints enforced by the setup

- Because lockfiles are committed, any change to the dependency graph requires regenerating the lockfile (e.g., `npm install` / `npm ci`) and committing the updated `package-lock.json`; otherwise CI will fail on mismatched hashes.
- Since both projects use caret ranges, automated update tools (e.g., Dependabot, Renovate) can bump minor/patch versions freely, but major-version bumps require manual review due to potential breaking changes.
- The absence of a workspace config means each side must be installed and built independently; there is no single command that resolves both dependency trees simultaneously.