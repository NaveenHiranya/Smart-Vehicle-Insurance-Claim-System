---
kind: error_handling
name: Express Error Handling with AppError Middleware and Route-Level Try/Catch
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/index.ts
    - backend/src/middleware/auth.ts
    - backend/src/middleware/adminAuth.ts
    - backend/src/middleware/garageAuth.ts
    - backend/src/middleware/upload.ts
    - backend/src/routes/claims.ts
---

## Overview

The backend (Express + TypeScript) uses a hybrid error-handling approach: a global Express error-handling middleware defines a custom `AppError` class, but the majority of routes handle errors locally via `try/catch` blocks that directly respond with JSON. Authentication middleware short-circuits with explicit status codes rather than throwing.

## Core Components

### Global Error Handler (`backend/src/middleware/errorHandler.ts`)
- Defines a custom `AppError` class extending `Error`, carrying a `statusCode` property (defaults to 500).
- The exported `errorHandler` middleware logs the error via `console.error`, then:
  - If the error is an `AppError`, responds with `res.status(err.statusCode).json({ error: err.message })`.
  - Otherwise responds with `res.status(500).json({ error: 'Internal server error' })`.
- Mounted as the last middleware in `backend/src/index.ts` via `app.use(errorHandler)`.

### Route-Level Error Handling (`backend/src/routes/claims.ts` and other route files)
- Every async route handler wraps its body in a `try/catch` block.
- Business validation errors return specific HTTP statuses directly from the route:
  - `400` for missing/invalid input (e.g., missing fields, invalid document type, claim not in DRAFT state).
  - `404` for not-found resources (vehicle, claim, image, document).
  - `201` for created resources.
  - `500` for unexpected failures, logged via `console.error('... error:', error)` before responding.
- No route throws `AppError`; instead, errors are caught and converted to JSON responses inline.

### Authentication Middleware Errors (`backend/src/middleware/auth.ts`, `adminAuth.ts`, `garageAuth.ts`)
- Auth middlewares do NOT throw; they immediately call `res.status(...).json({ error: ... })` and `return` when authentication fails:
  - Missing or malformed `Authorization` header → `401` with `'Access denied. No token provided.'` / `'No token provided.'`.
  - Invalid/expired JWT → `401` with `'Invalid or expired token.'`.
  - Insufficient role (admin/garage) → `403` with `'Admin access required.'` / `'Garage access required.'` / `'Garage account not found, not approved, or inactive.'`.
- Successful auth attaches `req.userId` (or garage id) and calls `next()`.

### File Upload Errors (`backend/src/middleware/upload.ts`)
- Multer file filter rejects non-image MIME types by calling `cb(new Error('Only JPEG, PNG, and WebP images are allowed'))` — this triggers Multer's built-in error path, which will be handled by the global `errorHandler` middleware (since it is registered after routes).
- File size limit is set to 10 MB per upload.

### Startup Validation (`backend/src/index.ts`)
- On startup, required env vars (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) are validated; missing variables cause `process.exit(1)` with an explanatory log.
- A `/api/health` endpoint returns `503` with `{ status: 'error', service: 'Flash Claim API', db: 'unreachable' }` if Prisma cannot connect.

## Architecture & Conventions Observed

1. **Global error handler exists but is underutilized.** `AppError` is defined and mounted, but no route currently throws it. All business errors are handled inline with direct `res.status().json()` calls. This means the `AppError` class is effectively unused in the current codebase.
2. **Consistent response shape.** All error responses use a `{ error: string }` JSON envelope, regardless of source (route catch blocks, auth middleware, health check).
3. **Structured logging on failure.** Every route-level `catch` block logs a descriptive message via `console.error('<operation> error:', error)` before returning a generic 500 response.
4. **Role-based authorization via middleware.** Admin and garage endpoints are protected by dedicated middlewares that enforce role checks before reaching the route handler.
5. **Input validation at the route layer.** Required fields and valid states are checked explicitly inside each handler, returning `400` with human-readable messages rather than using a shared validator library.
6. **File uploads are isolated.** Multer configuration lives in `middleware/upload.ts` and is applied per-route; upload errors surface through Multer's error mechanism.

## Constraints & Rules Enforced by Code

- Every async route must wrap its logic in `try/catch` and provide a `500` fallback response (observed consistently across all handlers in `routes/claims.ts`).
- Authentication must be performed via the provided middlewares (`authMiddleware`, `adminAuthMiddleware`, `garageAuthMiddleware`); manual JWT verification is not used elsewhere.
- Only JPEG, PNG, and WebP image MIME types are accepted for uploads; any other type is rejected by the multer file filter.
- Required environment variables (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) must be present at startup, or the process exits with code 1.
- The global error handler is the final catch-all; any unhandled exception in a route will result in a `500 { error: 'Internal server error' }` response.