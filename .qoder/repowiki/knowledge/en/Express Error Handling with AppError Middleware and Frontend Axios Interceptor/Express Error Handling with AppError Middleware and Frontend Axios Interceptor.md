---
kind: error_handling
name: Express Error Handling with AppError Middleware and Frontend Axios Interceptor
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/index.ts
    - backend/src/middleware/adminAuth.ts
    - backend/src/routes/auth.ts
    - backend/src/services/claimAssistantService.ts
    - frontend/src/services/api.ts
---

## Overview

The codebase uses a two-tier error handling strategy: a centralized Express `errorHandler` middleware on the backend, and an Axios response interceptor on the frontend. Business errors are surfaced via a custom `AppError` class, while route handlers mostly return HTTP status codes directly rather than throwing.

## Backend (Express)

### Centralized error handler
- `backend/src/middleware/errorHandler.ts` defines a custom `AppError extends Error` with a `statusCode` property and a default of `500`. The `errorHandler` middleware is registered last in `backend/src/index.ts` (`app.use(errorHandler)`), so it catches unhandled errors from any route.
- When `err instanceof AppError`, the handler responds with `{ error: err.message }` at the stored `statusCode`. For all other errors it responds with `{ error: 'Internal server error' }` at 500.

### Route-level error patterns
- Most routes do **not** throw `AppError`; instead they validate input and respond directly with appropriate HTTP status codes:
  - `400` for missing fields (e.g. `/api/auth/register`, `/api/auth/login`).
  - `401` for invalid credentials or expired tokens (`adminAuth.ts`, `auth.ts`).
  - `403` for insufficient permissions (`adminAuth.ts` — "Admin access required.").
  - `404` for not-found resources (`/api/auth/profile`).
  - `409` for duplicate users (`/api/auth/register`).
  - `500` as a catch-all inside `try/catch` blocks around async operations (e.g. registration, login, profile fetch/update).
- A few services throw plain `Error` instances (e.g. `claimAssistantService.ts` throws `new Error('Claim not found')` when a claim is missing). These bubble up to the global `errorHandler`, which would map them to 500 unless wrapped in `AppError` by the caller.
- Startup validation in `index.ts` exits with `process.exit(1)` if required env vars (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) are missing, logging the missing keys.

### Health endpoint
- `/api/health` returns `200 { status: 'ok', db: 'connected' }` on success and `503 { status: 'error', db: 'unreachable' }` on failure — a deliberate non-500 signal for infrastructure checks.

## Frontend (React + Axios)

### Global 401 handling
- `frontend/src/services/api.ts` creates an axios instance that attaches the JWT from `localStorage` to every request and sets `Content-Type: application/json` (except for `FormData`).
- A response interceptor intercepts all responses; on `status === 401` it clears `token` and `user` from `localStorage` and redirects to `/login` via `window.location.href = '/login'`.

### Per-call error handling
- Pages handle errors inline using `.catch()` on promises or `try/catch` blocks. Typical patterns include:
  - Silent fallbacks: `.catch(() => setLoading(false))` for list fetches.
  - User-facing alerts: `.catch(() => alert('Failed to load garages.'))` or `alert('Analysis failed')`.
  - Displaying backend messages: `setError(err.response?.data?.error || 'Failed to add policy')` — reading the `error` field from the backend's JSON response body.
- There is no centralized toast/notification system; errors are surfaced through browser `alert()`, React state, or navigation.

## Conventions Observed

1. **Structured business errors**: Use `throw new AppError(message, statusCode)` from service/route layers so the global handler can serialize them uniformly. Currently only the middleware defines `AppError`; most routes bypass it and set status codes directly.
2. **Consistent error shape**: Backend responses use `{ error: string }` for both client and server errors, consumed by the frontend via `err.response.data.error`.
3. **Authentication failures are explicit**: 401 for missing/expired tokens, 403 for role violations — handled centrally by auth middleware and the frontend interceptor.
4. **Async errors are wrapped**: Routes wrap async logic in `try/catch` and log via `console.error` before returning 500.
5. **Frontend 401 is fatal**: Any 401 triggers logout and redirect; other errors are handled per-component with minimal user feedback.