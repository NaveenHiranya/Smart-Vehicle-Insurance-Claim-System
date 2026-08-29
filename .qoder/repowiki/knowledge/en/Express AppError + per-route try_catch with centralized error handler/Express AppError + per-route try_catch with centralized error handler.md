---
kind: error_handling
name: Express AppError + per-route try/catch with centralized error handler
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/index.ts
    - backend/src/middleware/auth.ts
    - backend/src/routes/claims.ts
    - backend/src/services/claimAssistantService.ts
    - frontend/src/services/api.ts
---

## Overview

The backend uses a lightweight, Express-centric error handling strategy built around a single custom `AppError` class and a global error-handling middleware. Business logic lives in route handlers that wrap each endpoint body in its own `try/catch`, returning JSON responses directly rather than throwing errors up the stack. The frontend centralizes HTTP error handling in an Axios interceptor for auth-related failures.

## Backend: Custom error type and global handler

- **Custom error type** — `backend/src/middleware/errorHandler.ts` defines `class AppError extends Error` with a `statusCode` property (defaulting to 500) and a fixed `name = 'AppError'`. This is the only application-specific error class in the codebase.
- **Global error middleware** — The same file exports `errorHandler(err, req, res, next)`, registered last in `backend/src/index.ts` via `app.use(errorHandler)`. It:
  - Logs `err.message` to `console.error`.
  - If `err instanceof AppError`, responds with `res.status(err.statusCode).json({ error: err.message })`.
  - Otherwise responds with `res.status(500).json({ error: 'Internal server error' })`.
- **Startup validation** — `index.ts` validates required env vars (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) at startup and exits with code 1 if any are missing, logging which ones are absent.

## Route-level error handling pattern

Every route in `backend/src/routes/claims.ts` (and similarly across other route files) follows the same shape:

```ts
router.post('/...', async (req, res) => {
  try {
    // business logic ...
    res.json(...);
  } catch (error) {
    console.error('<operation> error:', error);
    res.status(500).json({ error: '<human-friendly message>' });
  }
});
```

Key observations:
- Validation failures return explicit 4xx codes directly from the handler (e.g., 400 for missing fields, 403 for unverified vehicles, 404 for not found), never by throwing `AppError`.
- Unknown/unexpected errors are caught by the local `catch` block, logged, and mapped to a generic 500 response — they do **not** bubble to the global `errorHandler` unless thrown explicitly.
- One notable exception: the `/api/claims/:id/analyze` endpoint inspects the thrown error's message to distinguish preconditions (`images` keyword → 400) from AI-side failures (→ 502).
- Background work launched with `.catch()` (e.g., `analyzeDamage(claimId).catch(...)`) logs failures without surfacing them to the caller.

## Services layer

Services throw plain `Error` objects (e.g., `throw new Error('Claim not found')` in `claimAssistantService.ts`). These propagate into the calling route handler's `try/catch`, where they are caught and converted to a 500 response — so services rely on routes to translate exceptions into HTTP semantics.

## Authentication middleware

`backend/src/middleware/auth.ts` handles auth failures inline: missing or malformed `Authorization` headers and invalid/expired JWTs both respond with `res.status(401).json({ error: '...' })` and return early; valid tokens attach `userId` to the request and call `next()`.

## Frontend error handling

- A single Axios instance in `frontend/src/services/api.ts` adds the `Bearer` token to every request and intercepts responses.
- The response interceptor checks for `status === 401`: it clears local storage (`token`, `user`) and redirects to `/login`.
- Other error statuses are rejected as normal Promise rejections and must be handled per-call site in components/pages.

## Conventions and constraints observed

| Area | Convention / Rule | Evidence |
|---|---|---|
| Application errors | Use `new AppError(message, statusCode)` when you want the global handler to format the response uniformly. | `AppError` class exists in `errorHandler.ts`; no other usage found yet, but it is the designated typed error. |
| Route errors | Wrap each async handler in `try/catch`; log with `console.error('<op> error:', error)`; return `{ error: string }` JSON. | Consistent pattern across all endpoints in `routes/claims.ts`. |
| Validation errors | Return explicit 4xx status codes directly from the handler (400, 403, 404) rather than throwing. | Multiple examples in `claims.ts` (missing fields, unverified vehicle, not found). |
| Unexpected errors | Map to 500 with a user-facing message; detailed stack stays on the server side. | All route `catch` blocks follow this shape. |
| Auth failures | Respond 401 from `authMiddleware`; frontend interceptor auto-logs out and redirects on 401. | `auth.ts` + `api.ts` interceptor. |
| Startup failures | Missing required env vars cause `process.exit(1)` after logging which keys are missing. | `index.ts` startup block. |
| Background tasks | Errors are swallowed with `.catch(console.error)` so they do not fail the originating request. | `analyzeDamage(claimId).catch(...)` in submit handler. |

## Key files

- `backend/src/middleware/errorHandler.ts` — `AppError` class + global `errorHandler` middleware
- `backend/src/index.ts` — registers `errorHandler`, validates env, mounts routes
- `backend/src/middleware/auth.ts` — 401 handling for missing/invalid JWTs
- `backend/src/routes/claims.ts` — canonical example of per-route `try/catch` error patterns
- `backend/src/services/claimAssistantService.ts` — service-layer `throw new Error(...)` style
- `frontend/src/services/api.ts` — Axios interceptor handling 401 globally
