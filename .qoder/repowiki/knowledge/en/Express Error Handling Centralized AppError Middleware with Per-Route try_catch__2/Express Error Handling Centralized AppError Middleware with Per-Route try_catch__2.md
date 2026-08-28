---
kind: error_handling
name: 'Express Error Handling: Centralized AppError Middleware with Per-Route try/catch'
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/index.ts
    - backend/src/routes/auth.ts
    - backend/src/routes/claims.ts
    - backend/src/middleware/auth.ts
---

## What system/approach is used

The backend uses a two-tier error handling strategy built on Express:

1. **A centralized error-handling middleware** (`backend/src/middleware/errorHandler.ts`) that defines a custom `AppError` class and a single Express error handler registered at the end of the middleware chain in `backend/src/index.ts`. It distinguishes between application-level errors (instances of `AppError`) and unexpected/unhandled errors, returning structured JSON responses.
2. **Per-route try/catch blocks** inside every route handler in `backend/src/routes/*.ts`, which catch synchronous and asynchronous exceptions, log them via `console.error`, and respond with a uniform `{ error: string }` shape and an appropriate HTTP status code.

No third-party error library is used; the approach relies on plain JavaScript `Error`/`try/catch` plus Express's built-in error-middleware convention.

## Key files and packages

- `backend/src/middleware/errorHandler.ts` — defines `AppError` and the global `errorHandler` Express middleware.
- `backend/src/index.ts` — wires routes and registers `errorHandler` as the final middleware.
- `backend/src/routes/auth.ts`, `claims.ts`, `vehicles.ts`, `policies.ts`, `admin.ts` — all route handlers use try/catch blocks and return `{ error }` JSON responses.
- `backend/src/middleware/auth.ts` — returns 401 JSON for missing/invalid JWT tokens instead of throwing.
- `backend/src/types/index.ts` — shared TypeScript types (no error-specific types beyond `AuthRequest` / `JwtPayload`).

## Architecture and conventions

### Custom error type
`AppError extends Error` adds a `statusCode` property and sets `name = 'AppError'`. The global handler checks `err instanceof AppError`; if true it responds with `res.status(err.statusCode).json({ error: err.message })`, otherwise it falls through to a generic `500 { error: 'Internal server error' }` response.

### Global error handler placement
In `index.ts`, `app.use(errorHandler)` is placed **after** all route definitions. This means any uncaught exception thrown from a route will be caught by Express and forwarded to `errorHandler`, which logs it and returns a 500 JSON body.

### Route-level error handling pattern
Every route handler follows the same shape:
```ts
router.post('/...', async (req, res) => {
  try {
    // business logic
  } catch (error) {
    console.error('<operation> error:', error);
    res.status(500).json({ error: '<human-friendly message>' });
  }
});
```
Validation failures are handled inline before any DB call (e.g. missing fields → 400, duplicate email → 409, not found → 404, invalid state transition → 400).

### Authentication errors
`authMiddleware` does **not** throw; it directly calls `res.status(401).json({ error: ... })` and returns early when the token is missing or invalid. This bypasses the global error handler intentionally, because auth failures are expected client errors.

### Background task errors
Long-running AI tasks (e.g. `analyzeDamage` called after claim submission) are invoked without awaiting their promise and `.catch((err) => console.error(...))` is attached so failures do not crash the request handler.

### Frontend-side error handling
The frontend (`frontend/src/services/api.ts`, `frontend/src/services/adminApi.ts`) wraps fetch calls and surfaces errors to React components via standard `Response.ok` checks and `throw new Error(...)`, which React pages then display to users. There is no centralized Axios interceptor or global error toast in the provided code snippets.

## Conventions and constraints

- **All API error responses share the shape** `{ error: string }` — both route-level catches and the global handler return this envelope, so the frontend can parse a consistent format.
- **HTTP status codes are chosen per scenario**: 400 for validation/state errors, 401 for auth failures, 404 for missing resources, 409 for duplicates, 500 for unexpected server errors.
- **Application-level domain errors are not yet modeled with `AppError`**: although `AppError` exists, none of the current route handlers throw it — they return 4xx JSON directly. The class is therefore available for future use but not currently part of the control flow.
- **Unhandled exceptions are always converted to 500 JSON** via the global error handler; there is no panic/recover pattern and no stack trace leaked to clients.
- **Errors are logged with `console.error`** alongside a short operation label (e.g. `Create claim error:`), providing basic auditability without a structured logging framework.
- **Async background work swallows errors** rather than propagating them to the caller, keeping the primary request path resilient to downstream AI service failures.