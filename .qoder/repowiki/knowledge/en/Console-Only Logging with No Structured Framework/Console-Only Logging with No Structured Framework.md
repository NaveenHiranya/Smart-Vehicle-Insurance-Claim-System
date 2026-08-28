---
kind: logging_system
name: Console-Only Logging with No Structured Framework
category: logging_system
scope:
    - '**'
source_files:
    - backend/src/index.ts
    - backend/src/middleware/errorHandler.ts
    - backend/src/routes/admin.ts
    - backend/src/routes/auth.ts
    - backend/src/routes/claims.ts
    - frontend/src/pages/DashboardPage.tsx
---

## What system/approach is used

The repository has **no dedicated logging framework or library**. There are no imports of Winston, Pino, Bunyan, Morgan, `pino-http`, `express-winston`, or any other logger. All backend output goes through Node's built-in `console` methods (`console.log`, `console.error`). The frontend uses the browser's `console` (one instance of `console.error` in a React page). There is no log-level strategy, no structured log objects, no request correlation IDs, and no centralized sink configuration.

## Key files and packages

- `backend/src/index.ts` — startup validation prints missing env vars via `console.error('[startup] ...')`; server start message printed via `console.log(...)`.
- `backend/src/middleware/errorHandler.ts` — central Express error handler logs `console.error('Error:', err.message)` for every unhandled error before returning a JSON response.
- `backend/src/routes/*.ts` — each route file catches errors in try/catch blocks and calls `console.error('<context> error:', error)`. Examples: `admin.ts` (stats, users, claims, notes, documents), `auth.ts` (register, login, profile), `claims.ts` (create, list, get, update, background damage analysis).
- `frontend/src/pages/DashboardPage.tsx` — single `console.error('Failed to fetch dashboard data:', err)` call.

No utility module exists under `backend/src/utils/` for logging; only `gemini.ts` and `prisma.ts` exist there.

## Architecture and conventions

- **Ad-hoc per-route logging**: Every route wraps its body in try/catch and emits a `console.error` with a short human-readable context string followed by the caught error object. This is the de facto convention across all route handlers.
- **Centralized error handler**: The `errorHandler` middleware in `middleware/errorHandler.ts` is the single place that handles unexpected exceptions not caught by routes. It always logs at the `error` level and returns either an `AppError`-typed response or a generic 500 JSON.
- **Startup-only info logging**: The only `console.log` usage is the server listen message in `index.ts`; there is no request/response logging middleware (e.g. no Morgan), so HTTP traffic leaves no audit trail.
- **Frontend logging is minimal**: Only one `console.error` call exists in the entire frontend codebase, used when fetching dashboard data fails.

## Conventions and constraints

Observed patterns (descriptive):
- Backend error messages use the shape `console.error('<noun phrase> error:', <error>)`, e.g. `console.error('Admin stats error:', error)`, `console.error('Registration error:', error)`, `console.error('Background damage analysis failed:', err)`.
- Startup diagnostics are prefixed with `[startup]` inside the message string.
- Errors are never logged as structured JSON objects; the error object is passed as a second argument to `console.error`, relying on Node's default console formatting.
- There is no environment-driven log level toggle; all `console.error` calls run regardless of deployment mode.
- The `AppError` class in `errorHandler.ts` carries a numeric `statusCode` but does not carry any logging metadata beyond the message.

Enforced rules:
- None. The project has no lint rule, CI check, or config that enforces the use of a specific logger, forbids `console.*`, or requires structured fields. The absence of any logger dependency in `backend/package.json` means this is purely a convention-based approach.