---
kind: error_handling
name: 'Express Error Handling: Centralized AppError Middleware with Per-Route try/catch'
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/index.ts
    - backend/src/middleware/auth.ts
    - backend/src/middleware/adminAuth.ts
    - backend/src/routes/auth.ts
    - backend/src/routes/claims.ts
    - backend/src/routes/admin.ts
    - backend/src/services/claimAssistantService.ts
---

## System Overview

The backend uses a hybrid error-handling approach built on Express.js. A single global error-handling middleware (`backend/src/middleware/errorHandler.ts`) defines a custom `AppError` class and a centralized `errorHandler` function that is registered last in `index.ts`. However, the majority of routes do **not** throw `AppError` instances — instead, every route handler wraps its body in a `try/catch` block and returns JSON responses directly from within the route.

## Key Files and Packages

- `backend/src/middleware/errorHandler.ts` — Defines `AppError extends Error` (with `statusCode` property) and the global `errorHandler(err, req, res, next)` middleware. It logs via `console.error`, responds with `{ error: message }`, distinguishes `AppError` (uses its status code) from unknown errors (returns 500).
- `backend/src/index.ts` — Registers all routes under `/api/*`, then registers `app.use(errorHandler)` as the final middleware so unhandled exceptions bubble up to it.
- `backend/src/middleware/auth.ts` and `backend/src/middleware/adminAuth.ts` — Authentication/authorization middlewares that return `401` / `403` JSON responses directly; they do not throw or call `next(err)`.
- Route files (`routes/auth.ts`, `routes/claims.ts`, `routes/admin.ts`, `routes/vehicles.ts`, `routes/policies.ts`) — Each handler follows the same pattern: validate input → early-return `res.status(4xx).json({ error: ... })` for validation/business errors → wrap async work in `try/catch` → catch logs via `console.error` and returns `500 { error: '...' }`.
- `backend/src/services/*.ts` — Services like `claimAssistantService.ts` throw plain `Error` objects (e.g. `throw new Error('Claim not found')`) when business preconditions fail; these are caught by the calling route's `try/catch`.

## Architecture and Conventions

### Two parallel error paths exist:

1. **Central path (unused in practice):** The `AppError` class and `errorHandler` middleware form a clean, framework-style error pipeline. If any route called `throw new AppError(message, statusCode)`, the global handler would convert it into a typed JSON response. This pattern is defined but not adopted by route handlers.

2. **Per-route path (dominant pattern):** Every route handler:
   - Validates inputs and returns `400` / `404` / `409` JSON with an `error` field immediately.
   - Wralls async operations in `try/catch`.
   - Catches errors, logs them with a descriptive prefix (`console.error('Create claim error:', error)`), and returns `500 { error: 'Failed to create claim.' }`.
   - Uses a consistent response shape: `{ error: string }` for failures, plain data for success.

### Authentication errors bypass the global handler:
Both `authMiddleware` and `adminAuthMiddleware` respond directly with `401` / `403` JSON and never invoke `next(err)` or throw. This means JWT verification failures never reach `errorHandler`.

### Startup-time validation:
`index.ts` validates required environment variables (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) at process startup and exits with `process.exit(1)` if missing — a pre-request failure mode outside the HTTP error pipeline.

### Health endpoint:
The `/api/health` route catches Prisma connection failures and returns `503 { status: 'error', service: 'Flash Claim API', db: 'unreachable' }`, demonstrating a domain-specific error response shape distinct from the generic `{ error }` format.

## Conventions and Constraints Observed

- **Response envelope:** All API error responses use `{ error: string }`. Success responses return the data object directly (no wrapper).
- **HTTP status codes:** Routes consistently map semantic failures to standard codes — `400` for bad input, `401` for missing/invalid token, `403` for insufficient admin privileges, `404` for not-found resources, `409` for duplicate users, `500` for unexpected server errors, `503` for health-check DB failures.
- **No `throw` propagation in routes:** Handlers swallow exceptions locally rather than throwing to the global handler. The only `throw` statements observed are in services (e.g., `claimAssistantService.ts` throws `Error('Claim not found')`), which are then caught by the caller's `try/catch`.
- **No `statusCodes` mapping:** There is no central mapping of error types to HTTP status codes; each route decides the status inline.
- **No structured logging:** Errors are logged via `console.error` with a human-readable prefix; there is no structured logger or log-level configuration.
- **No `catch` re-throwing:** Catch blocks never re-throw after logging; they always produce a response, ensuring every request gets a response even on unexpected errors.
- **Background tasks:** Long-running AI analysis is launched with `.catch((err) => console.error(...))` so failures do not crash the request handler.
- **Frontend-side handling:** The frontend `services/api.ts` and `services/adminApi.ts` are expected to consume the `{ error }` response shape; no dedicated error classes exist on the client side beyond standard `fetch`/`axios` rejection handling.