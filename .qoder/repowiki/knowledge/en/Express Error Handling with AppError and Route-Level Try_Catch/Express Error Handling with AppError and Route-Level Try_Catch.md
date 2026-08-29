---
kind: error_handling
name: Express Error Handling with AppError and Route-Level Try/Catch
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/index.ts
    - backend/src/middleware/auth.ts
    - backend/src/routes/auth.ts
    - backend/src/routes/claims.ts
---

## What system/approach is used

The backend (Node.js/Express + TypeScript) uses a **hybrid error-handling approach**:

1. A custom `AppError` class in `backend/src/middleware/errorHandler.ts` extends `Error` and carries an HTTP `statusCode`. It is intended to be thrown from business logic so the global error handler can translate it into a structured JSON response.
2. The global Express error middleware (`errorHandler`) is registered last in `backend/src/index.ts` and responds with `{ error: message }` — either the `AppError` message at its status code, or a generic `500 Internal server error` for unhandled exceptions.
3. In practice, most route handlers **do not throw `AppError`**. Instead they use inline `try/catch` blocks that log via `console.error` and respond directly with `res.status(...).json({ error: '...' })`. This pattern is consistent across every route file (e.g. `routes/auth.ts`, `routes/claims.ts`).
4. Startup validation in `index.ts` exits the process with `process.exit(1)` when required environment variables (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) are missing — a deliberate fail-fast strategy rather than returning an error response.
5. Background tasks (e.g. `analyzeDamage(claimId).catch(...)`) swallow errors by logging them; they do not propagate to the request pipeline.
6. The frontend has no dedicated error-handling layer beyond per-request calls; errors surface as plain `{ error }` JSON responses parsed by the caller.

## Key files and packages

- `backend/src/middleware/errorHandler.ts` — defines `AppError` class and the global `errorHandler` Express middleware.
- `backend/src/index.ts` — registers routes, mounts the `errorHandler` middleware after all routes, performs startup env validation, and seeds policy templates with a fire-and-forget try/catch.
- `backend/src/middleware/auth.ts` — authentication middleware that returns `401 { error }` for missing/invalid tokens instead of throwing.
- `backend/src/routes/*.ts` — every route handler wraps its body in `try/catch`, logs with `console.error`, and returns a JSON `{ error }` response with an appropriate status code.
- `backend/src/services/*.ts` — service functions are called inside route try/catch blocks; their errors bubble up to the route-level catch.
- Frontend `frontend/src/services/api.ts`, `adminApi.ts`, `garageApi.ts` — thin API wrappers that forward whatever the backend returns; no centralized client-side error mapper was found.

## Architecture and conventions

- **Global error middleware exists but is underused.** `AppError` is defined and mounted, but none of the examined route files throw it. The global handler therefore only catches truly unhandled exceptions (e.g. uncaught promises, syntax errors).
- **Route-level try/catch is the dominant pattern.** Each endpoint handles its own success path and error path, choosing status codes manually:
  - `400` for validation failures (missing fields, invalid document type, claim already submitted, etc.).
  - `401` for auth failures (missing Bearer token, invalid/expired JWT).
  - `404` for not-found resources (user, vehicle, claim, garage, image, document).
  - `409` for conflicts (duplicate user email).
  - `500` for unexpected runtime errors caught by the route's try/catch.
  - `502` specifically for AI-related failures (damage analysis), indicating a third-party service hiccup.
  - `503` on the `/api/health` endpoint when the database is unreachable.
- **Structured error shape.** All error responses follow `{ error: string }`. Success responses return the domain object(s) directly.
- **No error codes or typed error payloads.** There is no enum of application error codes, no discriminated union of error types, and no `code` field in error responses — just human-readable messages.
- **Background operations are isolated.** Long-running work (AI damage analysis triggered on claim submit) runs outside the request lifecycle and swallows errors via `.catch(console.error)`, so failures do not affect the client response.
- **Startup failures are fatal.** Missing required env vars cause `process.exit(1)` during boot, preventing the server from running in a misconfigured state.

## Conventions and constraints

Observed conventions (descriptive):
- Every async route handler is wrapped in `try/catch`; the catch block always logs the error and returns `500 { error }`.
- Validation and precondition checks return early with `4xx` JSON errors before any I/O.
- Auth middleware short-circuits with `401 { error }` rather than calling `next()` with an error.
- External/AI service calls are handled with route-level try/catch plus specific status mapping (e.g. `502` for AI failures, `400` for missing images).
- File uploads rely on Multer; upload failures surface through the route's try/catch as `500`.
- The global `AppError` class is available for future use but is not currently thrown anywhere in the examined code.

Constraints enforced by the implementation:
- Unhandled exceptions in routes will be caught by the global `errorHandler` and returned as `500 { error: 'Internal server error' }`, hiding stack traces from clients.
- The server refuses to start without `JWT_SECRET`, `GEMINI_API_KEY`, and `DATABASE_URL` set in the environment.