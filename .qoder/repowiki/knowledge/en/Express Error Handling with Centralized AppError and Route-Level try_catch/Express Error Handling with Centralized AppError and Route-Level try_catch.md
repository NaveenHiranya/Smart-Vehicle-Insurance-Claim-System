---
kind: error_handling
name: Express Error Handling with Centralized AppError and Route-Level try/catch
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/index.ts
    - backend/src/middleware/auth.ts
    - backend/src/middleware/adminAuth.ts
    - backend/src/middleware/upload.ts
    - backend/src/routes/claims.ts
    - frontend/src/services/api.ts
---

## Overview

The backend is an Express/TypeScript application that uses a hybrid error-handling approach: a single global `errorHandler` middleware catches unhandled errors, while most route handlers perform their own local `try/catch` blocks and respond directly with HTTP status codes. The frontend uses an Axios interceptor to handle authentication failures.

## Backend Error System

### Centralized Error Middleware
- **File**: `backend/src/middleware/errorHandler.ts`
- Defines a custom `AppError` class extending `Error` with a `statusCode` property (default 500).
- The `errorHandler` middleware checks if the caught error is an instance of `AppError`; if so, it responds with `err.statusCode` and `{ error: err.message }`. Otherwise, it returns a generic `500 Internal server error`.
- Registered as the last middleware in `backend/src/index.ts` via `app.use(errorHandler)`.

### Route-Level Error Handling Pattern
Every route handler follows the same pattern:
- Wrap async logic in `try/catch`.
- On validation/business-rule failures, respond immediately with `res.status(4xx).json({ error: '...' })` and `return` — no exceptions are thrown.
- On unexpected failures, log via `console.error(...)` and return `500 { error: 'Failed to ...' }`.
- Example patterns seen across `routes/claims.ts`, `routes/auth.ts`, `routes/admin.ts`, etc.: missing fields → 400, not found → 404, forbidden state → 403, database/network failure → 500.

### Authentication & Authorization Errors
- **`middleware/auth.ts`**: Missing or malformed Bearer token → 401 `{ error: 'Access denied. No token provided.' }`; invalid/expired JWT → 401 `{ error: 'Invalid or expired token.' }`.
- **`middleware/adminAuth.ts`**: Non-admin user attempting admin routes → 403 `{ error: 'Admin access required.' }`; same 401 handling for token issues.
- **`middleware/garageAuth.ts`**: Similar pattern for garage-role protection.

### Startup Validation
- `backend/src/index.ts` validates required environment variables (`JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) at startup and calls `process.exit(1)` if any are missing, logging which ones are absent.

### File Upload Errors
- **`middleware/upload.ts`** uses Multer with a file filter that rejects non-image MIME types by calling `cb(new Error('Only JPEG, PNG, and WebP images are allowed'))`.
- Enforces a 10MB file size limit per upload.
- Ensures `uploads/images` and `uploads/documents` directories exist on module load.

### AI Service Error Mapping
- In `routes/claims.ts`, the `/analyze` endpoint maps known precondition errors from the damage analysis service (e.g., missing images) to 400 responses, and all other AI-side failures to 402 Bad Gateway with a retryable message.

### Background Tasks
- Asynchronous background work (e.g., `analyzeDamage(claimId)` launched after claim submission) is attached via `.catch((err) => console.error(...))` so failures do not block the response path.

## Frontend Error Handling

- **Axios client**: `frontend/src/services/api.ts` creates an axios instance with automatic `Authorization: Bearer <token>` header injection from `localStorage`.
- **Global 401 interceptor**: Any 401 response clears `token` and `user` from localStorage and redirects to `/login`.
- **Per-call handling**: Pages catch rejected promises from API calls and display user-facing messages (e.g., form submission errors, fetch failures).

## Conventions Observed

1. **No thrown domain errors in routes**: Business logic errors are represented as early `res.status(4xx).json({ error: '...' })` returns rather than throwing `AppError`. The `AppError` class exists but does not appear to be used in route code, suggesting it is reserved for future use or unused.
2. **Uniform error response shape**: All JSON error responses use `{ error: string }`, making client-side parsing consistent.
3. **Centralized 500 fallback**: Uncaught exceptions bubble to the global `errorHandler`, which always returns 500 with `{ error: 'Internal server error' }` — no stack traces are leaked to clients.
4. **Structured logging**: Every catch block logs a descriptive prefix (e.g., `Create claim error:`, `Get claims error:`) before returning the generic 500 response.
5. **Startup fails fast**: Missing env vars cause immediate process termination rather than runtime failures later.
6. **Frontend auth persistence**: 401 responses trigger logout and redirect, keeping the frontend auth state in sync with the backend.