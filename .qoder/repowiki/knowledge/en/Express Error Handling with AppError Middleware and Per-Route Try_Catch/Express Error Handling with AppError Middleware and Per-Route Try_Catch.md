---
kind: error_handling
name: Express Error Handling with AppError Middleware and Per-Route Try/Catch
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/middleware/auth.ts
    - backend/src/routes/claims.ts
    - backend/src/routes/auth.ts
    - backend/src/index.ts
    - frontend/src/services/api.ts
---

## System Overview

The backend uses a lightweight, convention-based error handling approach built around Express.js middleware and per-route try/catch blocks. There is no centralized error type library or structured error code system — errors are handled inline at the route layer.

## Core Components

### Custom `AppError` class (`backend/src/middleware/errorHandler.ts`)
A minimal `AppError extends Error` subclass carries a numeric `statusCode` (defaulting to 500) and a message. It is the only custom error type defined in the codebase.

### Global error handler middleware (`backend/src/middleware/errorHandler.ts`)
Registered last in `index.ts` via `app.use(errorHandler)`, it:
- Logs the error message via `console.error`.
- If `err instanceof AppError`, responds with `res.status(err.statusCode).json({ error: err.message })`.
- Otherwise responds with a generic `{ error: 'Internal server error' }` at 500.

This means any unhandled exception that bubbles up from routes will be caught and returned as a uniform JSON object.

### Route-level error handling (dominant pattern)
Every route handler wraps its body in `try { ... } catch (error) { ... }` and returns explicit HTTP status codes directly from the controller:
- **400** for validation failures (e.g. missing fields, invalid document types, draft-only edits).
- **401** for authentication failures (in `auth.ts` login/profile flows and `middleware/auth.ts` JWT verification).
- **403** for authorization/business-rule violations (e.g. vehicle not verified before claim filing).
- **404** for not-found resources (vehicle, claim, document, garage).
- **409** for conflicts (duplicate email registration).
- **500** for unexpected failures inside the try block (Prisma/DB errors, file I/O).
- **502** specifically for AI service failures in `/api/claims/:id/analyze` when damage analysis fails.

Each catch block logs a contextual message via `console.error('<action> error:', error)` and returns a user-facing `{ error: '<message>' }` JSON body.

### Startup-time validation (`backend/src/index.ts`)
At process start, required environment variables (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) are validated; missing ones cause `process.exit(1)` after logging which keys are absent. This is a pre-request failure path that prevents the server from starting in an invalid state.

### Frontend error handling (`frontend/src/services/api.ts`)
An Axios instance handles client-side errors:
- A request interceptor attaches the `Authorization: Bearer <token>` header from `localStorage`.
- A response interceptor intercepts all responses; on `status === 401` it clears local auth state and redirects to `/login`. Other errors are re-thrown for the calling component to handle.

Frontend components themselves do not appear to implement global toast/notification error UI in the scanned files — they rely on the API interceptor for auth-related redirection and presumably handle business errors locally where needed.

## Architecture & Conventions

- **No thrown domain errors**: Routes rarely `throw new AppError(...)`. Instead, they return early with `res.status(...).json({ error: ... })` inside the try block. The `AppError` class exists but is not observed being used in the routes examined.
- **Uniform error envelope**: All error responses use `{ error: string }` as the JSON shape, making client parsing straightforward.
- **No async error wrapper**: There is no express-async-handler or similar wrapper; each route explicitly catches async errors.
- **Background task errors are swallowed**: Background work (e.g. `analyzeDamage(claimId).catch(...)`) logs failures without propagating them to the caller, so the primary request succeeds even if side effects fail.
- **Health endpoint self-checks**: `/api/health` returns 503 with `{ db: 'unreachable' }` when Prisma cannot connect, rather than letting the error bubble.

## Constraints Observed

- Every route handler must wrap async logic in try/catch and log via `console.error` — this is the de facto enforcement mechanism since there is no linter rule visible in the repo.
- Business-rule violations must return appropriate 4xx status codes from the route; there is no shared error-code enum, so status semantics are enforced by developer discipline.
- Uncaught exceptions are guaranteed to be normalized to `{ error: 'Internal server error' }` at 500 by the global handler, preventing raw stack traces from leaking to clients.