# Getting Started

<cite>
**Referenced Files in This Document**
- [backend/package.json](file://backend/package.json)
- [frontend/package.json](file://frontend/package.json)
- [backend/prisma/schema.prisma](file://backend/prisma/schema.prisma)
- [backend/src/index.ts](file://backend/src/index.ts)
- [backend/src/utils/gemini.ts](file://backend/src/utils/gemini.ts)
- [backend/src/utils/prisma.ts](file://backend/src/utils/prisma.ts)
- [backend/src/middleware/auth.ts](file://backend/src/middleware/auth.ts)
- [backend/src/routes/auth.ts](file://backend/src/routes/auth.ts)
- [frontend/vite.config.ts](file://frontend/vite.config.ts)
- [frontend/src/services/api.ts](file://frontend/src/services/api.ts)
</cite>

## Table of Contents
1. Introduction
2. Project Structure
3. Prerequisites
4. Environment Variables
5. Installation and Setup
6. Database Migration and Seeding
7. Running the Application
8. Verification Steps
9. Troubleshooting Guide
10. Conclusion

## Introduction
This guide helps you set up and run the Smart Vehicle Insurance Claim System locally. It covers prerequisites, environment configuration, installation steps for both backend and frontend, database migrations, and verification checks to ensure everything is working correctly.

## Project Structure
The repository is organized into two main parts:
- Backend (Express + TypeScript + Prisma): Provides REST APIs for authentication, vehicles, policies, claims, and AI-assisted services.
- Frontend (React + Vite + Tailwind): User interface for managing claims, vehicles, and policies with protected routes and API integration.

```mermaid
graph TB
subgraph "Frontend"
FE_VITE["Vite Dev Server<br/>port 5173"]
FE_API["Axios Client<br/>baseURL /api"]
end
subgraph "Backend"
BE_EXPRESS["Express App<br/>port 5000"]
BE_ROUTES["Routes<br/>/api/auth, /api/vehicles, /api/policies, /api/claims"]
BE_PRISMA["Prisma Client"]
BE_GEMINI["Google Gemini SDK"]
end
DB["PostgreSQL"]
FE_VITE --> FE_API
FE_API --> BE_EXPRESS
BE_EXPRESS --> BE_ROUTES
BE_ROUTES --> BE_PRISMA
BE_PRISMA --> DB
BE_ROUTES --> BE_GEMINI
```

**Diagram sources**
- [backend/src/index.ts:13-32](file://backend/src/index.ts#L13-L32)
- [frontend/vite.config.ts:8-18](file://frontend/vite.config.ts#L8-L18)
- [frontend/src/services/api.ts:3-8](file://frontend/src/services/api.ts#L3-L8)
- [backend/prisma/schema.prisma:5-8](file://backend/prisma/schema.prisma#L5-L8)
- [backend/src/utils/gemini.ts:6-10](file://backend/src/utils/gemini.ts#L6-L10)

**Section sources**
- [backend/src/index.ts:13-32](file://backend/src/index.ts#L13-L32)
- [frontend/vite.config.ts:8-18](file://frontend/vite.config.ts#L8-L18)
- [frontend/src/services/api.ts:3-8](file://frontend/src/services/api.ts#L3-L8)
- [backend/prisma/schema.prisma:5-8](file://backend/prisma/schema.prisma#L5-L8)

## Prerequisites
- Node.js: Use a recent LTS version compatible with the project’s tooling. The backend uses modern TypeScript and Express; the frontend uses Vite with React. Ensure your Node.js version supports ES modules and modern syntax used by the dependencies.
- PostgreSQL: A running PostgreSQL server accessible from your machine. You will need a database name, user, password, host, and port to configure the connection string.
- Google Gemini API: An API key for AI features. You will configure it via an environment variable.

Notes:
- The backend loads environment variables using dotenv at startup.
- The frontend proxies API requests to the backend during development.

**Section sources**
- [backend/package.json:18-29](file://backend/package.json#L18-L29)
- [frontend/package.json:12-29](file://frontend/package.json#L12-L29)
- [backend/src/index.ts:11-21](file://backend/src/index.ts#L11-L21)
- [frontend/vite.config.ts:8-18](file://frontend/vite.config.ts#L8-L18)
- [backend/src/utils/gemini.ts:6-10](file://backend/src/utils/gemini.ts#L6-L10)

## Environment Variables
Create a .env file in the backend directory with the following variables:

- DATABASE_URL: PostgreSQL connection string for Prisma. Example format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
- JWT_SECRET: Secret used to sign and verify JSON Web Tokens.
- GEMINI_API_KEY: Your Google Gemini API key for AI services.
- PORT: Backend server port (default 5000).
- CORS_ORIGIN: Allowed origin for CORS (default http://localhost:5173).
- UPLOAD_DIR: Directory path for uploaded files served statically.

Important:
- Do not commit .env to version control. The repository includes .gitignore entries that exclude .env and uploads.
- The backend reads these variables at runtime to configure the server, database, authentication, and AI services.

**Section sources**
- [backend/.gitignore:1-5](file://backend/.gitignore#L1-L5)
- [backend/src/index.ts:11-26](file://backend/src/index.ts#L11-L26)
- [backend/src/middleware/auth.ts:15-21](file://backend/src/middleware/auth.ts#L15-L21)
- [backend/src/routes/auth.ts:48-52](file://backend/src/routes/auth.ts#L48-L52)
- [backend/src/utils/gemini.ts:6-10](file://backend/src/utils/gemini.ts#L6-L10)
- [backend/prisma/schema.prisma:5-8](file://backend/prisma/schema.prisma#L5-L8)

## Installation and Setup

### Backend Setup
1. Navigate to the backend directory.
2. Install dependencies:
   - npm install
3. Generate Prisma client:
   - npm run prisma:generate
4. Run database migrations:
   - npm run prisma:migrate
5. Start the development server:
   - npm run dev

What happens:
- The Express app starts on the configured port (default 5000).
- CORS is enabled for the frontend origin.
- Routes are mounted under /api.
- Static uploads are served from the configured upload directory.

**Section sources**
- [backend/package.json:6-13](file://backend/package.json#L6-L13)
- [backend/src/index.ts:13-32](file://backend/src/index.ts#L13-L32)
- [backend/src/utils/prisma.ts:1-5](file://backend/src/utils/prisma.ts#L1-L5)

### Frontend Setup
1. Navigate to the frontend directory.
2. Install dependencies:
   - npm install
3. Start the development server:
   - npm run dev

What happens:
- Vite starts a dev server (default port 5173).
- Requests to /api and /uploads are proxied to the backend at http://localhost:5000.
- The UI communicates with the backend via Axios with base URL /api.

**Section sources**
- [frontend/package.json:6-10](file://frontend/package.json#L6-L10)
- [frontend/vite.config.ts:8-18](file://frontend/vite.config.ts#L8-L18)
- [frontend/src/services/api.ts:3-8](file://frontend/src/services/api.ts#L3-L8)

## Database Migration and Seeding
- Migrations:
  - Use npm run prisma:migrate to apply schema changes to your PostgreSQL database.
- Schema:
  - The Prisma schema defines models for users, vehicles, policies, claims, images, damage assessments, repair estimates, payouts, documents, and chat messages.
- Optional seeding:
  - If you need initial data, create seed scripts and run them after migrations.

Note:
- Ensure DATABASE_URL points to a valid PostgreSQL instance before running migrations.

**Section sources**
- [backend/package.json:10-13](file://backend/package.json#L10-L13)
- [backend/prisma/schema.prisma:10-201](file://backend/prisma/schema.prisma#L10-L201)

## Running the Application
Start both servers:
- Backend: npm run dev in the backend directory.
- Frontend: npm run dev in the frontend directory.

Access:
- Frontend: http://localhost:5173
- Backend health check: http://localhost:5000/api/health

Authentication flow overview:
- The frontend stores a token in localStorage and attaches it as a Bearer token to API requests.
- The backend verifies tokens using the configured JWT secret.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant FE as "Frontend (Vite)"
participant BE as "Backend (Express)"
participant AuthMW as "Auth Middleware"
participant DB as "PostgreSQL"
Browser->>FE : Open login page
FE->>BE : POST /api/auth/login {email, password}
BE->>DB : Find user by email
DB-->>BE : User record
BE->>BE : Verify password hash
BE->>BE : Sign JWT with JWT_SECRET
BE-->>FE : {user, token}
FE->>FE : Store token in localStorage
Browser->>FE : Navigate to protected route
FE->>BE : GET /api/... with Authorization : Bearer <token>
BE->>AuthMW : Verify token
AuthMW-->>BE : Next or 401
BE-->>FE : Protected data
```

**Diagram sources**
- [frontend/src/services/api.ts:10-17](file://frontend/src/services/api.ts#L10-L17)
- [backend/src/middleware/auth.ts:5-21](file://backend/src/middleware/auth.ts#L5-L21)
- [backend/src/routes/auth.ts:61-93](file://backend/src/routes/auth.ts#L61-L93)

## Verification Steps
- Health check:
  - Call http://localhost:5000/api/health and expect a success response indicating the service is running.
- Authentication:
  - Register or log in via the frontend. Confirm that a token is stored in localStorage and subsequent requests include the Authorization header.
- Data operations:
  - Create a vehicle, policy, or claim through the UI and verify persistence in the database.
- File uploads:
  - Upload images/documents and confirm they are served from the configured upload directory.
- AI features:
  - Trigger AI-assisted actions (e.g., damage assessment) and verify responses when GEMINI_API_KEY is configured.

If any step fails, consult the troubleshooting section below.

**Section sources**
- [backend/src/index.ts:34-37](file://backend/src/index.ts#L34-L37)
- [frontend/src/services/api.ts:10-17](file://frontend/src/services/api.ts#L10-L17)
- [backend/src/middleware/auth.ts:5-21](file://backend/src/middleware/auth.ts#L5-L21)

## Troubleshooting Guide

Common issues and resolutions:

- Port conflicts:
  - Symptom: Backend fails to start or frontend cannot connect.
  - Resolution: Change PORT in backend .env or adjust frontend proxy target in vite.config.ts to avoid conflicts.

- Database connectivity problems:
  - Symptom: Prisma migration or queries fail.
  - Resolution: Verify DATABASE_URL in backend .env, ensure PostgreSQL is running, and that credentials and network access are correct. Regenerate Prisma client if needed.

- CORS errors:
  - Symptom: Frontend requests blocked by browser.
  - Resolution: Set CORS_ORIGIN in backend .env to match the frontend origin (http://localhost:5173 by default).

- JWT authentication failures:
  - Symptom: 401 Unauthorized on protected endpoints.
  - Resolution: Ensure JWT_SECRET is set and consistent between registration/login and middleware verification. Confirm the token is present in localStorage and sent as Authorization: Bearer <token>.

- Google Gemini API errors:
  - Symptom: AI features return errors or empty responses.
  - Resolution: Set GEMINI_API_KEY in backend .env. Verify the key has access to the required model(s).

- Uploads not serving:
  - Symptom: Uploaded files return 404.
  - Resolution: Ensure UPLOAD_DIR exists and is writable. Confirm the static route serves files from this directory.

- Frontend proxy misconfiguration:
  - Symptom: API calls fail in development.
  - Resolution: Check vite.config.ts proxy settings for /api and /uploads pointing to http://localhost:5000.

**Section sources**
- [backend/src/index.ts:13-26](file://backend/src/index.ts#L13-L26)
- [backend/prisma/schema.prisma:5-8](file://backend/prisma/schema.prisma#L5-L8)
- [backend/src/middleware/auth.ts:5-21](file://backend/src/middleware/auth.ts#L5-L21)
- [backend/src/routes/auth.ts:48-52](file://backend/src/routes/auth.ts#L48-L52)
- [backend/src/utils/gemini.ts:6-10](file://backend/src/utils/gemini.ts#L6-L10)
- [frontend/vite.config.ts:8-18](file://frontend/vite.config.ts#L8-L18)

## Conclusion
You now have the necessary steps to set up, configure, and run the Smart Vehicle Insurance Claim System locally. Follow the environment setup, run migrations, start both servers, and verify functionality using the provided checks. Refer to the troubleshooting section if you encounter common setup issues.