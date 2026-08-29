---
kind: error_handling
name: Express Error Handling via AppError Class and Global Middleware
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/index.ts
    - backend/src/middleware/auth.ts
    - backend/src/routes/claims.ts
    - backend/src/services/documentVerificationService.ts
    - frontend/src/services/api.ts
---

## Overview

The Flash Claim backend uses a simple, centralized error-handling approach built on Express's built-in error middleware pattern. There is no dedicated `errors/` directory or rich error-type hierarchy — instead, a single custom `AppError` class and one global `errorHandler` middleware handle all unhandled errors.

## Core Components

### Custom Error Type: `AppError`
Defined in `backend/src/middleware/errorHandler.ts`, the `AppError` class extends `Error` and carries a numeric `statusCode` (defaulting to 500). It sets `this.name = 'AppError'` so downstream code can distinguish it from plain `Error` instances.

### Global Error Handler Middleware
Also in `backend/src/middleware/errorHandler.ts`, the `errorHandler(err, req, res, next)` function:
- Logs the error message via `console.error`.
- If `err instanceof AppError`, responds with `res.status(err.statusCode).json({ error: err.message })`.
- Otherwise responds with `res.status(500).json({ error: 'Internal server error' })`.

This handler is registered last in `backend/src/index.ts` (`app.use(errorHandler)`) after all routes, which is the standard Express convention for catching thrown errors and unhandled rejections that bubble up through the stack.

### Route-Level Error Handling Pattern
Every route handler in `backend/src/routes/*.ts` follows a consistent try/catch pattern rather than throwing `AppError`. For example, in `claims.ts`:
```typescript
try {
  // ... business logic
} catch (error) {
  console.error('<operation> error:', error);
  res.status(500).json({ error: 'Failed to <operation>.' });
}
```
Each route also performs explicit validation checks and returns early with appropriate status codes (400 for bad input, 404 for not found, 401 for missing/expired JWT).

### Authentication Middleware Errors
In `backend/src/middleware/auth.ts`, the `authMiddleware` directly responds with 401 JSON when:
- No `Authorization` header or it does not start with `Bearer `.
- JWT verification fails (invalid or expired token).

Other auth-related middleware (`adminAuth.ts`, `garageAuth.ts`) follow the same pattern of returning 401/403 JSON responses inline.

### Service Layer Error Propagation
Services like `documentVerificationService.ts` throw plain `Error` objects (e.g., `throw new Error('Document not found')`, `throw new Error('Document file not found on disk')`). These propagate up to the calling route's try/catch block, where they are caught and converted into a generic 500 response. The service itself handles its own internal failures gracefully — for example, if Gemini's response cannot be parsed as JSON, it falls back to a default `{ status: 'UNREADABLE', ... }` result instead of throwing.

### Startup Validation
`backend/src/index.ts` validates required environment variables at startup (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) and exits with `process.exit(1)` if any are missing, logging a helpful message directing users to copy `.env.example`.

### Frontend Error Handling
The React frontend uses an Axios instance (`frontend/src/services/api.ts`) with two interceptors:
- **Request interceptor**: attaches `Authorization: Bearer <token>` from `localStorage`; auto-sets `Content-Type` unless sending `FormData`.
- **Response interceptor**: on 401 responses, clears stored auth state and redirects to `/login`.

Frontend pages handle API errors locally using try/catch around their fetch calls and display user-facing messages; there is no global toast or error boundary shown in the provided files.

## Conventions Observed

1. **No `AppError` usage in routes** — despite the existence of `AppError`, routes do not throw it; they return HTTP status codes directly. This means `AppError` is currently unused in the codebase.
2. **Uniform error response shape** — every error response is a JSON object with a single `error` string field (e.g., `{ error: 'Claim not found.' }`).
3. **Centralized logging** — all caught errors log via `console.error` before responding; no structured logger is used.
4. **Explicit 4xx vs 5xx distinction** — client/validation errors return 400/401/404; unexpected/internal errors return 500.
5. **No `catch` blocks swallow errors silently** — every catch logs before responding.
6. **Background tasks isolate failures** — async background work (e.g., `analyzeDamage(claimId).catch(...)`) catches and logs errors without affecting the response.
7. **Startup-time failure** — missing env vars cause immediate process exit rather than runtime crashes later.

## Constraints / Enforcement

- The global `errorHandler` is the only place where `AppError` would be recognized; since routes never throw it, this path is effectively dead code today.
- All routes must end with either a `res.json(...)` or `res.status(...).json(...)` call inside their try block; otherwise an uncaught exception will fall through to the global handler and return a generic 500.
- The frontend assumes the backend always returns `{ error: string }` on failure — changing this contract would break UI error handling across all pages.