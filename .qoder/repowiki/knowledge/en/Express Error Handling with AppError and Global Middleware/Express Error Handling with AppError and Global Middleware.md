---
kind: error_handling
name: Express Error Handling with AppError and Global Middleware
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/middleware/errorHandler.ts
    - backend/src/index.ts
    - backend/src/routes/auth.ts
    - backend/src/routes/claims.ts
    - frontend/src/services/api.ts
    - frontend/src/components/ProtectedRoute.tsx
---

## Overview

The Smart Vehicle Insurance Claim System uses a straightforward Express.js error handling strategy centered around a custom `AppError` class and a single global error-handling middleware. The backend centralizes error response formatting, while the frontend handles HTTP-level errors via an Axios interceptor.

## Backend (Express)

### Custom Error Type
- `backend/src/middleware/errorHandler.ts` defines a single application error class:
  ```ts
  export class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number = 500) { ... }
  }
  ```
- It carries a numeric `statusCode` (defaulting to 500) and is named `AppError` for easy `instanceof` checks.

### Global Error Middleware
- The same file exports an Express error-handling middleware (`errorHandler`) registered as the final middleware in `backend/src/index.ts` via `app.use(errorHandler)`.
- Behavior:
  - If `err instanceof AppError`, respond with `res.status(err.statusCode).json({ error: err.message })`.
  - Otherwise, respond with `res.status(500).json({ error: 'Internal server error' })`.
  - All errors are logged to stdout via `console.error('Error:', err.message)`.

### Route-Level Error Handling Pattern
- Every route handler in `backend/src/routes/*.ts` wraps its body in a `try/catch` block.
- Business validation errors return explicit status codes directly from the route (e.g., 400 for missing fields, 401 for invalid credentials, 404 for not found, 409 for duplicates).
- Unexpected errors are caught by the local `catch` block, logged with a descriptive prefix (e.g., `console.error('Registration error:', error)`), and converted to a generic 500 response with `{ error: '...' }`.
- This pattern means `AppError` is defined but **not currently thrown** anywhere in the routes — routes handle errors inline instead of propagating them via `throw new AppError(...)`.

### Background Task Errors
- In `backend/src/routes/claims.ts`, background work (e.g., AI damage analysis launched after claim submission) is handled with `.catch((err) => console.error('Background damage analysis failed:', err))`, preventing unhandled promise rejections without affecting the response.

## Frontend (React + Vite)

### Axios Interceptor-Based Handling
- `frontend/src/services/api.ts` creates a single Axios instance with `baseURL: '/api'`.
- A request interceptor attaches a Bearer token from `localStorage` when present.
- A response interceptor intercepts all responses:
  - On `401 Unauthorized`: clears `token` and `user` from `localStorage` and redirects to `/login` via `window.location.href = '/login'`.
  - All other errors are re-thrown (`return Promise.reject(error)`) so calling components can handle them locally if needed.

### Component-Level Handling
- `frontend/src/components/ProtectedRoute.tsx` handles auth state loading and redirects unauthenticated users to `/login` using React Router's `<Navigate>`.
- No global React error boundary or toast/notification system was observed; individual pages would need to catch rejected promises from API calls.

## Conventions Observed

1. **Centralized error response shape**: Both backend routes and the global error middleware consistently return JSON objects with an `error` key containing a human-readable message.
2. **Explicit HTTP status codes per business rule**: Routes return 400/401/404/409 for known client/server conditions rather than throwing exceptions.
3. **Global fallback for unexpected errors**: Any uncaught exception bubbles to the `errorHandler` middleware, which always responds with 500 and a generic message.
4. **Frontend 401 auto-logout**: The Axios response interceptor treats any 401 as a session expiry event and forces re-authentication.
5. **No centralized error codes or typed error enums**: There is no shared enum of error codes (e.g., `ERR_INVALID_INPUT`, `ERR_NOT_FOUND`); each route returns ad-hoc strings.
6. **No `AppError` usage in routes**: Despite being defined, `AppError` is never thrown in the current codebase — routes use direct `res.status(...).json(...)` returns instead.
7. **No try/catch on the frontend side for API calls**: The Axios interceptor only handles 401; callers must handle other errors themselves.