---
kind: error_handling
name: Express Error Handling with Centralized AppError and Per-Route Try/Catch
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/index.ts
    - backend/src/middleware/auth.ts
    - backend/src/routes/claims.ts
    - backend/src/utils/gemini.ts
    - backend/src/services/claimAssistantService.ts
    - frontend/src/services/api.ts
---

## What system/approach is used

The backend (Node.js + Express) uses a **centralized error-handling middleware** pattern combined with **per-route try/catch blocks**. A custom `AppError` class carries an HTTP status code, and the `errorHandler` middleware at the end of the Express pipeline converts it into a JSON `{ error: string }` response. Routes that cannot handle an error locally respond with plain `res.status(...).json({ error })` responses directly; there is no global `try/catch` wrapper around route handlers in `index.ts`, so unhandled promise rejections are not caught by the Express error handler.

The frontend (React + Vite) uses a single **Axios instance** (`frontend/src/services/api.ts`) with request/response interceptors. The response interceptor clears auth state and redirects to `/login` on any 401 from the backend; all other errors are rejected up to the calling component/page, which handles them inline via `.catch()` or try/catch.

## Key files and packages

- `backend/src/middleware/errorHandler.ts` — defines `AppError` class and the Express `errorHandler(err, req, res, next)` middleware.
- `backend/src/index.ts` — mounts routes, registers the `errorHandler` as the final middleware, validates required env vars at startup, and seeds policy templates (with non-fatal catch).
- `backend/src/middleware/auth.ts` — returns 401 JSON for missing/invalid JWT tokens; does not throw.
- `backend/src/routes/*.ts` — every route handler wraps its body in `try { ... } catch (error) { console.error(...); res.status(500).json({ error: '...' }); }` and returns early with 400/404 for validation failures.
- `backend/src/utils/gemini.ts` — implements retryable-error detection (`isRetryable`) and model cascade fallback for Gemini API calls; throws raw `Error` when all models fail.
- `backend/src/services/claimAssistantService.ts` — throws plain `new Error('Claim not found')` for business-rule violations; relies on the caller's try/catch to convert to an HTTP response.
- `frontend/src/services/api.ts` — Axios instance with auth token injection and a 401 response interceptor that logs out and redirects.

## Architecture and conventions

1. **Custom error type**: `AppError extends Error` stores `statusCode` and has `name = 'AppError'`. It is intended to be thrown from anywhere in the request lifecycle so the central `errorHandler` can distinguish application errors from unexpected ones.
2. **Central error handler**: `app.use(errorHandler)` is registered after all routes. If `err instanceof AppError`, it responds with `err.statusCode` and `{ error: err.message }`; otherwise it responds with 500 and `{ error: 'Internal server error' }`. This is the only place where `console.error('Error:', err.message)` occurs for caught exceptions.
3. **Per-route local handling dominates**: In practice, routes do **not** throw `AppError`. Instead they use `try/catch` blocks and return early with `res.status(400|404).json({ error: '...' })` for client errors and `res.status(500).json({ error: 'Failed to ...' })` for unexpected errors. The `AppError` class exists but is not observed being used in the routes examined.
4. **Middleware short-circuits**: Auth middleware (`auth.ts`, `adminAuth.ts`, `garageAuth.ts`) immediately respond with 401 JSON when authentication fails; they never call `next()` with an error.
5. **Startup validation**: Missing required environment variables (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) cause `process.exit(1)` during boot — a hard failure before the server starts.
6. **External service resilience**: `gemini.ts` encapsulates retry logic with exponential backoff per model and cascades across multiple Gemini models. Non-retryable errors are rethrown immediately; after exhausting all models it throws a generic `Error('All Gemini models failed')`.
7. **Background tasks swallow errors**: When AI damage analysis runs asynchronously after claim submission, failures are caught with `.catch((err) => console.error(...))` so they do not bubble up to the HTTP response.
8. **Frontend 401 handling**: The Axios response interceptor strips the stored token and user data and navigates to `/login` whenever the backend returns 401, providing centralized logout-on-expiry behavior.

## Conventions and constraints

- Every route handler in `routes/` follows the same shape: `try { ... } catch (error) { console.error('<action> error:', error); res.status(500).json({ error: '<human message>' }); }`. Validation failures return 400 with a descriptive `{ error }` message; missing resources return 404.
- Errors returned to clients are always a JSON object with a single `error` string field — both route-local responses and the central `errorHandler` produce this shape.
- Business-rule violations inside services (e.g. `throw new Error('Claim not found')` in `claimAssistantService.ts`) are handled by the calling route's try/catch, which maps them to 404/400 responses — there is no shared domain error type yet.
- No `panic`/`recover` equivalent exists (this is JavaScript/TypeScript); instead, unhandled promise rejections are not caught by the Express error handler because routes do not wrap async handlers in `try/catch` at the top level — each handler must explicitly catch.
- The `AppError` class is defined centrally but appears unused in the routes under review; the convention currently favors explicit `res.status(...).json({ error })` over throwing `AppError`.
- Frontend components/pages are responsible for catching axios errors and surfacing them to the UI; the API layer itself only centralizes 401 handling.