---
kind: error_handling
name: Express Error Handling via Centralized AppError Middleware and Per-Route try/catch
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/index.ts
    - backend/src/middleware/auth.ts
    - backend/src/routes/claims.ts
    - backend/src/routes/auth.ts
---

## 1. System / Approach

The backend uses a lightweight, Express-native error handling strategy built around two layers:

- A **central error-handling middleware** (`backend/src/middleware/errorHandler.ts`) that defines a custom `AppError` class (extending `Error`, carrying a numeric `statusCode`) and is registered last in the Express pipeline via `app.use(errorHandler)` in `backend/src/index.ts`. It logs the error to `console.error` and returns `{ error: message }` JSON — either the `AppError`'s status/message or a generic `500 Internal server error` for unhandled exceptions.
- **Per-route try/catch blocks** inside each route handler that catch thrown errors, log them with a context-specific prefix (e.g. `console.error('Create claim error:', error)`), and respond with an appropriate HTTP status and a human-readable `{ error: '...' }` body. Validation failures are handled inline with early `res.status(4xx).json({ error: ... })` returns before any async work.

There is no global `uncaughtException` / `unhandledRejection` listener, no structured logging framework, and no centralized error-code enumeration — errors are ad-hoc per route.

## 2. Key Files and Packages

| File | Role |
|---|---|
| `backend/src/middleware/errorHandler.ts` | Defines `AppError` class and the Express error middleware; only place where `instanceof AppError` is checked. |
| `backend/src/index.ts` | Registers routes, then registers `errorHandler` as the final middleware; also performs startup env validation (`process.exit(1)` if required vars missing) and wraps policy template seeding in try/catch so seeding failure does not block startup. |
| `backend/src/middleware/auth.ts` | Authentication middleware; returns `401 { error: 'Access denied...' }` or `401 { error: 'Invalid or expired token.' }` directly from the middleware. |
| `backend/src/routes/claims.ts` | Largest route file; demonstrates the dominant pattern: per-endpoint `try/catch`, early input validation returning `400`, resource-not-found checks returning `404`, business-rule guards returning `400`, and a catch-all fallback returning `500`. Also contains a special case for AI-related failures that maps unknown errors to `502 Bad Gateway`. |
| `backend/src/routes/auth.ts` | Shows the same pattern for auth endpoints (register/login/profile). |
| Other route files under `backend/src/routes/` | Follow the same per-handler try/catch + early return pattern. |

## 3. Architecture and Conventions

### Error types
- `AppError` is the only domain error type. It carries a `statusCode` (default 500) and a `message`. It is defined but **not used anywhere else in the codebase** — all handlers use direct `res.status(...).json({ error: ... })` calls instead of throwing `new AppError(...)`. This means `AppError` is currently unused infrastructure.

### Propagation model
- Errors do **not** bubble up through `next(err)`. Each route handler is self-contained: it catches its own async operations and responds immediately. The central `errorHandler` therefore only runs for truly unexpected cases (e.g. unhandled promise rejections outside a try/catch, or syntax/runtime crashes).
- Background tasks (e.g. `analyzeDamage(claimId).catch(...)`) swallow errors by logging them rather than propagating them to the caller.

### Response shape
- Every error response follows the shape `{ error: string }` — a single `error` field containing a user-facing message. Success responses are plain objects without an envelope.
- There is no standardized `code` / `details` / `stack` field on error responses; stack traces are never sent to clients.

### HTTP status conventions observed across routes
| Status | When used |
|---|---|
| `201 Created` | Successful creation (register, create claim, upload image/document). |
| `400 Bad Request` | Missing/invalid input fields, business-rule violations (e.g. claim already submitted, can only edit DRAFT claims, invalid document type, damage analysis must run first). |
| `401 Unauthorized` | Missing or malformed `Authorization` header, invalid/expired JWT. |
| `404 Not Found` | Resource not found (user, vehicle, claim, garage, document, image). |
| `409 Conflict` | Duplicate email during registration. |
| `500 Internal Server Error` | Catch-all for unexpected runtime/database errors. |
| `502 Bad Gateway` | Special-cased for AI service failures in the `/analyze` endpoint. |
| `503 Service Unavailable` | Health check when the database is unreachable. |

### Startup-time error handling
- Required environment variables (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) are validated at process start; missing ones cause `process.exit(1)` after printing a diagnostic message.
- Policy template seeding is wrapped in try/catch and logged on failure; it is intentionally non-blocking so the server still starts.

## 4. Conventions and Constraints

Observed conventions (descriptive):
- Every route handler is wrapped in `try { ... } catch (error) { console.error(...); res.status(500).json({ error: '...' }); }`.
- Input validation happens synchronously before any DB call and returns `400` with a descriptive message.
- Authorization/resource ownership is checked before mutation; missing resources return `404`.
- Business-state transitions are guarded (e.g. cannot submit a claim twice, cannot change garage after estimate, can only edit DRAFT claims) and return `400` with an explanatory message.
- External-service failures are mapped to meaningful statuses: AI-related failures → `502`; DB connectivity issues → `503` on health check; everything else → `500`.
- No `throw new AppError(...)` is used anywhere; the `AppError` class exists but is dead code relative to current usage.
- Error messages are user-facing strings embedded directly in route handlers — there is no shared error-message dictionary or i18n layer.
- Logs always include a context label (e.g. `'Create claim error:'`, `'Login error:'`) plus the raw error object, which aids debugging but leaks internal details into server logs (not client responses).

Constraints enforced by the implementation:
- The Express error handler is registered **after** all routes, so it only handles errors that escape route-level try/catch blocks.
- The `AppError` class requires a numeric `statusCode`; any future use would be forced to specify one.
- The health endpoint explicitly distinguishes reachable vs unreachable DB states using `503`.