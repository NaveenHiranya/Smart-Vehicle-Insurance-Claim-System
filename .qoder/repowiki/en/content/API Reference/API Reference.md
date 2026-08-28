# API Reference

<cite>
**Referenced Files in This Document**
- [index.ts](file://backend/src/index.ts)
- [auth.ts](file://backend/src/routes/auth.ts)
- [vehicles.ts](file://backend/src/routes/vehicles.ts)
- [policies.ts](file://backend/src/routes/policies.ts)
- [claims.ts](file://backend/src/routes/claims.ts)
- [admin.ts](file://backend/src/routes/admin.ts)
- [auth.ts (middleware)](file://backend/src/middleware/auth.ts)
- [adminAuth.ts](file://backend/src/middleware/adminAuth.ts)
- [errorHandler.ts](file://backend/src/middleware/errorHandler.ts)
- [schema.prisma](file://backend/prisma/schema.prisma)
</cite>

## Table of Contents
1. Introduction
2. Project Structure
3. Core Components
4. Architecture Overview
5. Detailed Component Analysis
6. Dependency Analysis
7. Performance Considerations
8. Troubleshooting Guide
9. Conclusion
10. Appendices

## Introduction
This document provides comprehensive API reference documentation for the Smart Vehicle Insurance Claim System backend. It covers all RESTful endpoints grouped by domain: Authentication, Vehicles, Policies, Claims, and Administrative functions. For each endpoint, you will find HTTP methods, URL patterns, authentication requirements, request/response schemas, parameter specifications, error codes, and example payloads. It also includes guidance on pagination, filtering, rate limiting, versioning, and client implementation best practices.

## Project Structure
The backend is an Express application that mounts route modules under a common /api prefix. Middleware handles CORS, JSON parsing, static file serving for uploads, and centralized error handling. Routes are organized by feature with shared middleware for authentication and authorization.

```mermaid
graph TB
Client["Client"] --> API["Express App<br/>/api/*"]
API --> AuthRoutes["/api/auth/*"]
API --> VehicleRoutes["/api/vehicles/*"]
API --> PolicyRoutes["/api/policies/*"]
API --> ClaimRoutes["/api/claims/*"]
API --> AdminRoutes["/api/admin/*"]
AuthRoutes --> DB["Prisma + SQLite"]
VehicleRoutes --> DB
PolicyRoutes --> DB
ClaimRoutes --> DB
AdminRoutes --> DB
```

**Diagram sources**
- [index.ts:14-34](file://backend/src/index.ts#L14-L34)

**Section sources**
- [index.ts:14-49](file://backend/src/index.ts#L14-L49)

## Core Components
- Authentication: JWT-based user sessions with Bearer token in Authorization header.
- Authorization: Role-based access for admin routes requiring admin flag verification.
- Data Layer: Prisma ORM over SQLite with strongly typed models and relations.
- File Uploads: Multer-based image and document upload with static serving under /uploads.
- Error Handling: Centralized error handler returning consistent JSON errors.

**Section sources**
- [auth.ts (middleware):5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [schema.prisma:10-202](file://backend/prisma/schema.prisma#L10-L202)
- [errorHandler.ts:13-27](file://backend/src/middleware/errorHandler.ts#L13-L27)

## Architecture Overview
The API follows a layered architecture:
- Entry point configures middleware and mounts route groups.
- Route handlers validate inputs, enforce auth, interact with Prisma, and return JSON responses.
- Services encapsulate AI-driven logic (damage analysis, repair estimates, document verification, chat assistant).
- Static assets (uploaded files) are served from a configured directory.

```mermaid
sequenceDiagram
participant C as "Client"
participant E as "Express App"
participant R as "Route Handler"
participant M as "Middleware"
participant P as "Prisma"
C->>E : HTTP Request
E->>M : Apply CORS, JSON parse, Auth/Admin
M-->>E : Next or 401/403
E->>R : Dispatch to route
R->>P : Query/Mutation
P-->>R : Data
R-->>C : JSON Response
```

**Diagram sources**
- [index.ts:17-34](file://backend/src/index.ts#L17-L34)
- [auth.ts (middleware):5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)

## Detailed Component Analysis

### Authentication API
Base path: /api/auth

- POST /api/auth/register
  - Auth: None
  - Request body fields: email, password, firstName, lastName, phone (optional), address (optional)
  - Success response: user object (id, email, firstName, lastName, phone, address, createdAt), token (JWT)
  - Errors: 400 validation, 409 duplicate email, 500 server error
  - Notes: Password hashed; token expires in 7 days

- POST /api/auth/login
  - Auth: None
  - Request body fields: email, password
  - Success response: user object (includes isAdmin), token (JWT)
  - Errors: 400 missing fields, 401 invalid credentials, 500 server error

- GET /api/auth/profile
  - Auth: Required (Bearer token)
  - Response: user profile (id, email, firstName, lastName, phone, address, isAdmin, createdAt)
  - Errors: 401 unauthorized, 404 not found, 500 server error

- PUT /api/auth/profile
  - Auth: Required (Bearer token)
  - Request body fields: firstName, lastName, phone, address (all optional)
  - Response: updated user profile
  - Errors: 401 unauthorized, 500 server error

Authentication flow:
- Clients obtain a JWT via login or register.
- Include Authorization: Bearer <token> on protected endpoints.
- Token contains userId and email; validated by middleware.

Example request headers:
- Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Example success response (login):
- { user: { id, email, firstName, lastName, phone, address, isAdmin }, token }

Error response pattern:
- { error: "message" }

**Section sources**
- [auth.ts:11-105](file://backend/src/routes/auth.ts#L11-L105)
- [auth.ts:107-165](file://backend/src/routes/auth.ts#L107-L165)
- [auth.ts (middleware):5-22](file://backend/src/middleware/auth.ts#L5-L22)

### Vehicles API
Base path: /api/vehicles
- All endpoints require authentication (Bearer token).

- POST /api/vehicles/detect
  - Purpose: AI vehicle detection from uploaded image
  - Content-Type: multipart/form-data
  - Fields: image (file)
  - Success response: detection result object plus imagePath
  - Errors: 400 no image, 500 server error

- POST /api/vehicles
  - Request body fields: make, model, year (int), vin (optional), licensePlate, color, mileage (optional int), photos (JSON array string)
  - Success response: created vehicle
  - Errors: 400 validation, 500 server error

- GET /api/vehicles
  - Response: list of vehicles owned by authenticated user, ordered by creation date descending, includes claim counts

- GET /api/vehicles/:id
  - Response: single vehicle with related claims summary

- PUT /api/vehicles/:id
  - Request body fields: make, model, year, vin, licensePlate, color, mileage, photos (all optional)
  - Response: updated vehicle
  - Errors: 404 not found, 500 server error

- DELETE /api/vehicles/:id
  - Response: { message: "Vehicle deleted successfully." }
  - Errors: 404 not found, 500 server error

Notes:
- Images are stored under /uploads/images and served statically.
- Photos field is stored as a JSON string array.

**Section sources**
- [vehicles.ts:15-32](file://backend/src/routes/vehicles.ts#L15-L32)
- [vehicles.ts:34-63](file://backend/src/routes/vehicles.ts#L34-L63)
- [vehicles.ts:65-81](file://backend/src/routes/vehicles.ts#L65-L81)
- [vehicles.ts:83-111](file://backend/src/routes/vehicles.ts#L83-L111)
- [vehicles.ts:113-146](file://backend/src/routes/vehicles.ts#L113-L146)
- [vehicles.ts:148-166](file://backend/src/routes/vehicles.ts#L148-L166)

### Policies API
Base path: /api/policies
- All endpoints require authentication (Bearer token).

- POST /api/policies
  - Request body fields: providerName, policyNumber, coverageType, deductible (float), premiumAmount (float), startDate (ISO datetime), endDate (ISO datetime)
  - Success response: created policy
  - Errors: 400 validation, 500 server error

- GET /api/policies
  - Response: list of policies owned by authenticated user, ordered by creation date descending

- GET /api/policies/:id
  - Response: single policy owned by authenticated user
  - Errors: 404 not found, 500 server error

- PUT /api/policies/:id
  - Request body fields: providerName, policyNumber, coverageType, deductible, premiumAmount, startDate, endDate (all optional)
  - Response: updated policy
  - Errors: 404 not found, 500 server error

- DELETE /api/policies/:id
  - Response: { message: "Policy deleted successfully." }
  - Errors: 404 not found, 500 server error

**Section sources**
- [policies.ts:12-40](file://backend/src/routes/policies.ts#L12-L40)
- [policies.ts:42-55](file://backend/src/routes/policies.ts#L42-L55)
- [policies.ts:57-74](file://backend/src/routes/policies.ts#L57-L74)
- [policies.ts:76-108](file://backend/src/routes/policies.ts#L76-L108)
- [policies.ts:110-128](file://backend/src/routes/policies.ts#L110-L128)

### Claims API
Base path: /api/claims
- All endpoints require authentication (Bearer token).

- POST /api/claims
  - Request body fields: vehicleId, incidentDate (ISO datetime), incidentLocation, incidentDescription, policyId (optional), weatherConditions (optional), hasPoliceReport (optional boolean)
  - Validation: vehicleId, incidentDate, incidentLocation, incidentDescription required
  - Success response: created claim
  - Errors: 400 validation, 404 vehicle not found, 500 server error

- GET /api/claims
  - Query params: status (filter by claim status)
  - Response: list of claims owned by authenticated user with vehicle summary, damage assessment severity, and counts of images/documents

- GET /api/claims/:id
  - Response: full claim detail including vehicle, policy, images, damageAssessment, repairEstimate, insurancePayout, documents, and chat messages

- PUT /api/claims/:id
  - Allowed only when claim status is DRAFT
  - Request body fields: incidentDate, incidentLocation, incidentDescription, weatherConditions, hasPoliceReport, policyId (all optional)
  - Errors: 400 if not DRAFT, 404 not found, 500 server error

- POST /api/claims/:id/submit
  - Validates claim exists, is DRAFT, and has at least one image
  - Updates status to SUBMITTED and triggers background AI damage analysis
  - Response: updated claim

- POST /api/claims/:id/images
  - Content-Type: multipart/form-data
  - Fields: images (array of files, up to 10), imageType (FULL_VEHICLE or DAMAGE_CLOSEUP), label (optional)
  - Success response: created images
  - Errors: 400 no images, 404 not found, 500 server error

- DELETE /api/claims/:id/images/:imageId
  - Deletes image record and physical file
  - Response: { message: "Image deleted successfully." }
  - Errors: 404 not found, 500 server error

- POST /api/claims/:id/analyze
  - Triggers AI damage analysis for the claim
  - Response: damage assessment result

- POST /api/claims/:id/estimate
  - Requires prior damage analysis
  - Response: repair estimate with items, totals, and estimated days

- POST /api/claims/:id/documents
  - Content-Type: multipart/form-data
  - Fields: document (file), documentType (LICENSE, REGISTRATION, ACCIDENT_REPORT, REPAIR_ESTIMATE)
  - Success response: created document
  - Errors: 400 invalid type or missing file, 404 not found, 500 server error

- GET /api/claims/:id/documents
  - Response: list of documents for the claim, ordered by upload date descending

- POST /api/claims/:id/documents/:docId/verify
  - Runs document verification service
  - Response: verification result

- GET /api/claims/:id/chat
  - Response: chat messages for the claim, ordered by creation date ascending

- POST /api/claims/:id/chat
  - Request body field: message (string)
  - Response: assistant response

Notes:
- Status transitions enforced at submission time.
- Background processing used for AI tasks; clients should poll or rely on webhooks if implemented later.

**Section sources**
- [claims.ts:20-57](file://backend/src/routes/claims.ts#L20-L57)
- [claims.ts:59-83](file://backend/src/routes/claims.ts#L59-L83)
- [claims.ts:85-112](file://backend/src/routes/claims.ts#L85-L112)
- [claims.ts:114-150](file://backend/src/routes/claims.ts#L114-L150)
- [claims.ts:152-193](file://backend/src/routes/claims.ts#L152-L193)
- [claims.ts:195-233](file://backend/src/routes/claims.ts#L195-L233)
- [claims.ts:235-268](file://backend/src/routes/claims.ts#L235-L268)
- [claims.ts:270-288](file://backend/src/routes/claims.ts#L270-L288)
- [claims.ts:290-314](file://backend/src/routes/claims.ts#L290-L314)
- [claims.ts:316-353](file://backend/src/routes/claims.ts#L316-L353)
- [claims.ts:355-377](file://backend/src/routes/claims.ts#L355-L377)
- [claims.ts:379-397](file://backend/src/routes/claims.ts#L379-L397)
- [claims.ts:399-421](file://backend/src/routes/claims.ts#L399-L421)
- [claims.ts:423-447](file://backend/src/routes/claims.ts#L423-L447)

### Administrative API
Base path: /api/admin
- All endpoints require admin authentication (Bearer token with admin role).

- GET /api/admin/stats
  - Response: userCount, claimsByStatus (map), docCount, pendingDocs

- GET /api/admin/users
  - Response: list of non-admin users with counts of vehicles and claims

- GET /api/admin/claims
  - Query params: status (filter), search (fuzzy match across user names/email and vehicle make/model)
  - Response: claims with user and vehicle summaries, counts of images/documents

- GET /api/admin/claims/:id
  - Response: full claim detail including all related entities

- PATCH /api/admin/claims/:id/status
  - Request body field: status (DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, COMPLETED)
  - Response: updated claim

- GET /api/admin/documents
  - Query param: status (PENDING, VERIFIED, ISSUES_FOUND, UNREADABLE, ALL)
  - Response: documents with associated claim and user info

- PATCH /api/admin/documents/:id/approve
  - Sets verification status to VERIFIED and records approval metadata
  - Response: updated document

- PATCH /api/admin/documents/:id/reject
  - Request body field: reason (optional)
  - Sets verification status to ISSUES_FOUND and records rejection metadata
  - Response: updated document

**Section sources**
- [admin.ts:11-26](file://backend/src/routes/admin.ts#L11-L26)
- [admin.ts:28-45](file://backend/src/routes/admin.ts#L28-L45)
- [admin.ts:47-78](file://backend/src/routes/admin.ts#L47-L78)
- [admin.ts:80-103](file://backend/src/routes/admin.ts#L80-L103)
- [admin.ts:105-123](file://backend/src/routes/admin.ts#L105-L123)
- [admin.ts:125-149](file://backend/src/routes/admin.ts#L125-L149)
- [admin.ts:151-166](file://backend/src/routes/admin.ts#L151-L166)
- [admin.ts:168-184](file://backend/src/routes/admin.ts#L168-L184)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)

## Dependency Analysis
- Route modules depend on Prisma client for data operations.
- Authentication middleware depends on JWT library and environment secret.
- Admin middleware additionally queries User to verify admin flag.
- Claims routes integrate multiple services for AI features (damage analysis, repair estimate, document verification, chat assistant).
- Static file serving serves uploaded content under /uploads.

```mermaid
graph LR
A["routes/auth.ts"] --> M1["middleware/auth.ts"]
B["routes/vehicles.ts"] --> M1
C["routes/policies.ts"] --> M1
D["routes/claims.ts"] --> M1
E["routes/admin.ts"] --> M2["middleware/adminAuth.ts"]
D --> S1["services/damageAnalysisService.ts"]
D --> S2["services/repairEstimateService.ts"]
D --> S3["services/documentVerificationService.ts"]
D --> S4["services/claimAssistantService.ts"]
A & B & C & D & E --> P["utils/prisma.ts"]
```

**Diagram sources**
- [index.ts:30-34](file://backend/src/index.ts#L30-L34)
- [auth.ts (middleware):5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)

**Section sources**
- [index.ts:30-34](file://backend/src/index.ts#L30-L34)
- [auth.ts (middleware):5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)

## Performance Considerations
- Pagination: Not currently implemented. For large datasets (e.g., claims, policies), consider adding query parameters like page and limit to reduce payload sizes and improve performance.
- Filtering: Some endpoints support filtering (claims by status, admin claims by status/search, admin documents by verification status). Expand filters where useful.
- Rate Limiting: No built-in rate limiting. Implement middleware (e.g., express-rate-limit) to protect against abuse and ensure fair usage.
- File Uploads: Enforce size limits and allowed MIME types to prevent abuse and storage exhaustion.
- Database Queries: Use selective field projection and indexes where appropriate to optimize read-heavy endpoints.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- 401 Unauthorized: Missing or invalid Authorization header. Ensure Bearer token format and validity. Check JWT secret configuration.
- 403 Forbidden: Admin-only endpoint accessed without admin privileges. Verify user role.
- 400 Bad Request: Missing or invalid fields. Validate request bodies according to endpoint specs.
- 404 Not Found: Resource does not exist or belongs to another user. Confirm IDs and ownership checks.
- 500 Internal Server Error: Unexpected server-side failure. Check logs and environment variables (DATABASE_URL, JWT_SECRET, UPLOAD_DIR, CORS_ORIGIN).

Error response shape:
- { error: "message" }

Health check:
- GET /api/health returns { status: "ok", service: "AutoShield AI API" }.

**Section sources**
- [auth.ts (middleware):5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [errorHandler.ts:13-27](file://backend/src/middleware/errorHandler.ts#L13-L27)
- [index.ts:36-39](file://backend/src/index.ts#L36-L39)

## Conclusion
This API provides a robust foundation for managing vehicles, policies, and insurance claims with AI-assisted workflows and administrative oversight. Follow the authentication and authorization rules, adhere to request schemas, and implement client-side retries and error handling for resilient integrations. Adopt pagination and rate limiting as your scale grows.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Authentication Requirements Summary
- Public endpoints: /api/auth/register, /api/auth/login
- Protected endpoints: /api/vehicles/*, /api/policies/*, /api/claims/*
- Admin endpoints: /api/admin/* require admin role

Include Authorization: Bearer <token> for protected routes.

**Section sources**
- [auth.ts (middleware):5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)

### Data Models Overview
Key entities and relationships:
- User owns Vehicles, Policies, Claims
- Claim links to Vehicle and optional Policy
- Claim has many Images and Documents
- DamageAssessment and RepairEstimate are linked to Claim
- ChatMessage threads per Claim

**Section sources**
- [schema.prisma:10-202](file://backend/prisma/schema.prisma#L10-L202)

### Versioning Strategy and Deprecation Policy
- Current versioning: Path-based v1 not present; base paths are stable (/api/*).
- Recommended approach: Introduce versioned routes (e.g., /api/v1/*) when breaking changes occur.
- Deprecation policy: Communicate deprecation timelines via release notes and response headers; maintain backward compatibility during transition periods.

[No sources needed since this section provides general guidance]

### Client Implementation Guidelines
- Use HTTPS and set CORS origin appropriately on the server side.
- Store tokens securely and refresh as needed.
- Handle errors gracefully using the standardized error response shape.
- For file uploads, use multipart/form-data and respect field names and limits.
- Implement retry logic with exponential backoff for transient errors.

[No sources needed since this section provides general guidance]