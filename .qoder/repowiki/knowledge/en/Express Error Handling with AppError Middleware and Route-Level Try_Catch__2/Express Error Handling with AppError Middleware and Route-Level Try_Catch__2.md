---
kind: error_handling
name: Express Error Handling with AppError Middleware and Route-Level Try/Catch
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/index.ts
    - backend/src/routes/auth.ts
    - backend/src/routes/claims.ts
    - backend/src/services/claimAssistantService.ts
    - frontend/src/services/api.ts
---

## System Overview

The backend uses a simple Express.js error handling strategy built around a custom `AppError` class and a global error-handling middleware. There is no centralized error-type registry, no structured error codes, and no use of `throw/recover` patterns — errors are handled inline in each route handler.

## Key Files

- **`backend/src/middleware/errorHandler.ts`** — Defines the `AppError` class (extends `Error`, carries a numeric `statusCode`) and the global `errorHandler` Express middleware that logs the error and returns a JSON `{ error }` response. It distinguishes between `AppError` instances (returns the configured status code) and all other errors (returns 500).
- **`backend/src/index.ts`** — Mounts the `errorHandler` as the last middleware (`app.use(errorHandler)`), so it catches any unhandled errors from routes or other middleware. Also contains startup validation that calls `process.exit(1)` when required environment variables (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) are missing.
- **Route files under `backend/src/routes/`** — Each route handler wraps its logic in a `try/catch`. Validation failures return early with `res.status(4xx).json({ error: '...' })`; unexpected exceptions log via `console.error` and return `500` with a generic `{ error: 'Failed to ...' }` message.
- **`backend/src/services/claimAssistantService.ts`** — Services throw plain `Error` objects (e.g. `throw new Error('Claim not found')`); these bubble up to the route's `catch` block and are converted to a 500 response by the route-level handler.
- **`frontend/src/services/api.ts`** — An Axios instance with a response interceptor that intercepts `401` responses: clears stored token/user data and redirects to `/login`. Other errors are re-thrown for the calling component to handle.

## Architecture and Conventions

1. **Global error middleware**: The `errorHandler` is the single catch-all for unhandled errors. Any `AppError` thrown or passed to `next(err)` will be serialized as `{ error: err.message }` with the appropriate HTTP status.
2. **Route-level try/catch**: Every route handler in `routes/*.ts` uses an explicit `try/catch` block. This is the primary place where business errors are turned into HTTP responses — there is no shared controller layer that centralizes this pattern.
3. **No sentinel error types beyond `AppError`**: The codebase defines only one custom error type (`AppError`). Most domain-specific errors are expressed as plain `Error` strings thrown from services, which get caught by the route-level `catch` and returned as 500 responses. There is no mapping from Prisma errors or external service errors to specific client-facing messages.
4. **Consistent response shape**: All error responses use a uniform `{ error: string }` envelope, both from route handlers and from the global error middleware. Success responses are always plain JSON bodies (no wrapper object).
5. **Startup-time failure**: Missing required env vars cause the process to exit immediately with `process.exit(1)` and a descriptive console error — this is a fail-fast convention at application bootstrap.
6. **Frontend 401 handling**: A single Axios response interceptor handles authentication failures globally by clearing auth state and redirecting to login; individual components do not need to check for 401.
7. **Background task error isolation**: Long-running background work (e.g. `analyzeDamage(claimId).catch(...)`) attaches its own `.catch()` to prevent unhandled promise rejections from crashing the request handler.

## Constraints and Observed Rules

- Errors thrown inside route handlers must be caught by the enclosing `try/catch`; otherwise they fall through to the global `errorHandler`, which will respond with a 500 and a generic message.
- Business validation errors should return early with an appropriate 4xx status and a human-readable `{ error }` message rather than throwing.
- Unknown/unexpected errors are logged via `console.error` before returning 500 — no structured logging framework is used.
- Frontend components should rely on the Axios interceptor for 401 handling; manual 401 checks are not present elsewhere in the frontend API layer.
- There is no documented rule requiring `AppError` usage; in practice most routes bypass it and return responses directly from within the handler.