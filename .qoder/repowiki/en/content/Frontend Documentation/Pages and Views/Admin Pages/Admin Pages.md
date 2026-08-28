# Admin Pages

<cite>
**Referenced Files in This Document**
- [AdminDashboardPage.tsx](file://frontend/src/pages/admin/AdminDashboardPage.tsx)
- [AdminClaimsPage.tsx](file://frontend/src/pages/admin/AdminClaimsPage.tsx)
- [AdminClaimDetailPage.tsx](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx)
- [AdminUsersPage.tsx](file://frontend/src/pages/admin/AdminUsersPage.tsx)
- [AdminDocumentsPage.tsx](file://frontend/src/pages/admin/AdminDocumentsPage.tsx)
- [AdminLoginPage.tsx](file://frontend/src/pages/admin/AdminLoginPage.tsx)
- [adminApi.ts](file://frontend/src/services/adminApi.ts)
- [AdminProtectedRoute.tsx](file://frontend/src/components/AdminProtectedRoute.tsx)
- [admin.ts](file://backend/src/routes/admin.ts)
- [adminAuth.ts](file://backend/src/middleware/adminAuth.ts)
- [types/index.ts](file://frontend/src/types/index.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document provides comprehensive documentation for the administrative interface pages of the Smart Vehicle Insurance Claim System. It covers system analytics and monitoring, claim review and approval workflows, detailed claim inspection and decision-making, user management, document verification and management, and administrative authentication. The focus is on admin-specific features such as status management, filtering, search, and audit-ready actions (approve/reject with reasons).

## Project Structure
The admin UI is implemented as React components under the admin pages directory, communicating with a protected backend API via an Axios instance that injects bearer tokens and handles unauthorized responses by redirecting to the admin login. Backend routes enforce admin-only access using JWT-based middleware.

```mermaid
graph TB
subgraph "Frontend"
A["AdminLoginPage.tsx"]
B["AdminDashboardPage.tsx"]
C["AdminClaimsPage.tsx"]
D["AdminClaimDetailPage.tsx"]
E["AdminUsersPage.tsx"]
F["AdminDocumentsPage.tsx"]
G["adminApi.ts"]
H["AdminProtectedRoute.tsx"]
end
subgraph "Backend"
I["admin.ts"]
J["adminAuth.ts"]
end
A --> G
B --> G
C --> G
D --> G
E --> G
F --> G
G --> I
I --> J
H --> A
```

**Diagram sources**
- [AdminLoginPage.tsx:1-75](file://frontend/src/pages/admin/AdminLoginPage.tsx#L1-L75)
- [AdminDashboardPage.tsx:1-130](file://frontend/src/pages/admin/AdminDashboardPage.tsx#L1-L130)
- [AdminClaimsPage.tsx:1-128](file://frontend/src/pages/admin/AdminClaimsPage.tsx#L1-L128)
- [AdminClaimDetailPage.tsx:1-275](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L1-L275)
- [AdminUsersPage.tsx:1-83](file://frontend/src/pages/admin/AdminUsersPage.tsx#L1-L83)
- [AdminDocumentsPage.tsx:1-210](file://frontend/src/pages/admin/AdminDocumentsPage.tsx#L1-L210)
- [adminApi.ts:1-28](file://frontend/src/services/adminApi.ts#L1-L28)
- [admin.ts:1-187](file://backend/src/routes/admin.ts#L1-L187)
- [adminAuth.ts:1-27](file://backend/src/middleware/adminAuth.ts#L1-L27)
- [AdminProtectedRoute.tsx:1-8](file://frontend/src/components/AdminProtectedRoute.tsx#L1-L8)

**Section sources**
- [AdminLoginPage.tsx:1-75](file://frontend/src/pages/admin/AdminLoginPage.tsx#L1-L75)
- [adminApi.ts:1-28](file://frontend/src/services/adminApi.ts#L1-L28)
- [admin.ts:1-187](file://backend/src/routes/admin.ts#L1-L187)
- [adminAuth.ts:1-27](file://backend/src/middleware/adminAuth.ts#L1-L27)
- [AdminProtectedRoute.tsx:1-8](file://frontend/src/components/AdminProtectedRoute.tsx#L1-L8)

## Core Components
- AdminDashboardPage: Displays system overview metrics (total users, total claims, pending claims, documents awaiting), claim status breakdown, recent claims list, and quick links to key admin areas.
- AdminClaimsPage: Lists claims with search and status filters; supports per-row approve action and navigation to detail view.
- AdminClaimDetailPage: Provides full claim inspection including damage assessment, repair estimate, payout estimate, images, and documents; enables status changes and per-document approve/reject with optional reason.
- AdminUsersPage: Lists registered users with counts of vehicles and claims; expandable rows show additional details.
- AdminDocumentsPage: Central hub for reviewing uploaded documents with tabs for Pending, Issues Found, and All; supports approve and reject with reason input.
- AdminLoginPage: Authenticates administrators, validates admin privileges, stores token and user info, and redirects to dashboard.

**Section sources**
- [AdminDashboardPage.tsx:1-130](file://frontend/src/pages/admin/AdminDashboardPage.tsx#L1-L130)
- [AdminClaimsPage.tsx:1-128](file://frontend/src/pages/admin/AdminClaimsPage.tsx#L1-L128)
- [AdminClaimDetailPage.tsx:1-275](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L1-L275)
- [AdminUsersPage.tsx:1-83](file://frontend/src/pages/admin/AdminUsersPage.tsx#L1-L83)
- [AdminDocumentsPage.tsx:1-210](file://frontend/src/pages/admin/AdminDocumentsPage.tsx#L1-L210)
- [AdminLoginPage.tsx:1-75](file://frontend/src/pages/admin/AdminLoginPage.tsx#L1-L75)

## Architecture Overview
Administrative operations are secured via JWT-based middleware. The frontend uses a dedicated axios instance to call admin endpoints with Authorization headers. Unauthorized or forbidden responses trigger redirection to the admin login page.

```mermaid
sequenceDiagram
participant U as "Admin User"
participant L as "AdminLoginPage.tsx"
participant API as "adminApi.ts"
participant R as "admin.ts"
participant M as "adminAuth.ts"
U->>L : Enter credentials and submit
L->>API : POST /auth/login {email, password}
API-->>L : {user, token}
L->>L : Validate user.isAdmin
L->>L : Store token and user in localStorage
L->>U : Redirect to /admin/dashboard
U->>API : GET /api/admin/stats (with Bearer token)
API->>R : GET /api/admin/stats
R->>M : Verify JWT and isAdmin
M-->>R : Authorized
R-->>API : Stats payload
API-->>U : Dashboard stats
```

**Diagram sources**
- [AdminLoginPage.tsx:13-31](file://frontend/src/pages/admin/AdminLoginPage.tsx#L13-L31)
- [adminApi.ts:7-24](file://frontend/src/services/adminApi.ts#L7-L24)
- [admin.ts:12-26](file://backend/src/routes/admin.ts#L12-L26)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)

## Detailed Component Analysis

### AdminDashboardPage
- Purpose: Provide a high-level overview of system health and activity.
- Key behaviors:
  - Fetches stats and recent claims concurrently.
  - Computes totals and pending counts from server-provided breakdowns.
  - Displays status badges and quick links to manage users, claims, and documents.
- Data model usage: Relies on types for claim status and related entities.

```mermaid
flowchart TD
Start(["Load Dashboard"]) --> Fetch["Fetch stats and recent claims"]
Fetch --> Compute["Compute total and pending claims"]
Compute --> Render["Render stats, status breakdown, recent claims, quick links"]
Render --> End(["Idle"])
```

**Diagram sources**
- [AdminDashboardPage.tsx:17-30](file://frontend/src/pages/admin/AdminDashboardPage.tsx#L17-L30)
- [AdminDashboardPage.tsx:31-129](file://frontend/src/pages/admin/AdminDashboardPage.tsx#L31-L129)

**Section sources**
- [AdminDashboardPage.tsx:1-130](file://frontend/src/pages/admin/AdminDashboardPage.tsx#L1-L130)
- [types/index.ts:40-44](file://frontend/src/types/index.ts#L40-L44)

### AdminClaimsPage
- Purpose: List and filter claims; support quick approve and navigate to detail.
- Key behaviors:
  - Search by user/vehicle fields and filter by status.
  - Approve claim inline via PATCH to update status.
  - Shows image/document counts and severity badge when available.
- Data model usage: Uses claim status and severity types.

```mermaid
sequenceDiagram
participant P as "AdminClaimsPage.tsx"
participant API as "adminApi.ts"
participant R as "admin.ts"
P->>API : GET /api/admin/claims?status&search
API-->>P : Claims list
P->>API : PATCH /api/admin/claims/ : id/status {status : APPROVED}
API->>R : Update claim status
R-->>API : Updated claim
API-->>P : Success
P->>P : Refresh list
```

**Diagram sources**
- [AdminClaimsPage.tsx:23-41](file://frontend/src/pages/admin/AdminClaimsPage.tsx#L23-L41)
- [admin.ts:47-78](file://backend/src/routes/admin.ts#L47-L78)
- [admin.ts:105-123](file://backend/src/routes/admin.ts#L105-L123)

**Section sources**
- [AdminClaimsPage.tsx:1-128](file://frontend/src/pages/admin/AdminClaimsPage.tsx#L1-L128)
- [types/index.ts:40-44](file://frontend/src/types/index.ts#L40-L44)

### AdminClaimDetailPage
- Purpose: Inspect a single claim and make decisions (status changes, document approvals/rejections).
- Key behaviors:
  - Loads full claim data including images, assessments, estimates, payouts, and documents.
  - Quick actions to set status (Approve, Reject, Under Review, Completed).
  - Advanced status override via select control.
  - Per-document approve/reject with optional rejection reason.
- Data model usage: Leverages claim, damage assessment, repair estimate, insurance payout, and document types.

```mermaid
sequenceDiagram
participant D as "AdminClaimDetailPage.tsx"
participant API as "adminApi.ts"
participant R as "admin.ts"
D->>API : GET /api/admin/claims/ : id
API-->>D : Full claim object
D->>API : PATCH /api/admin/claims/ : id/status {status}
API->>R : Update claim status
R-->>API : Updated claim
API-->>D : Success
D->>API : PATCH /api/admin/documents/ : id/approve|reject {reason?}
API->>R : Update document verification
R-->>API : Updated document
API-->>D : Success
```

**Diagram sources**
- [AdminClaimDetailPage.tsx:29-74](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L29-L74)
- [admin.ts:80-103](file://backend/src/routes/admin.ts#L80-L103)
- [admin.ts:105-123](file://backend/src/routes/admin.ts#L105-L123)
- [admin.ts:151-184](file://backend/src/routes/admin.ts#L151-L184)

**Section sources**
- [AdminClaimDetailPage.tsx:1-275](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L1-L275)
- [types/index.ts:40-144](file://frontend/src/types/index.ts#L40-L144)

### AdminUsersPage
- Purpose: View registered users with summary metrics and expanded details.
- Key behaviors:
  - Fetches non-admin users with vehicle and claim counts.
  - Expandable rows reveal phone, address, and counts.
- Data model usage: Uses user and count aggregations.

```mermaid
flowchart TD
Load["GET /api/admin/users"] --> Show["Render users table"]
Show --> Expand{"Expand row?"}
Expand --> |Yes| Detail["Show phone, address, counts"]
Expand --> |No| Idle["Keep collapsed"]
```

**Diagram sources**
- [AdminUsersPage.tsx:10-79](file://frontend/src/pages/admin/AdminUsersPage.tsx#L10-L79)
- [admin.ts:28-45](file://backend/src/routes/admin.ts#L28-L45)

**Section sources**
- [AdminUsersPage.tsx:1-83](file://frontend/src/pages/admin/AdminUsersPage.tsx#L1-L83)
- [admin.ts:28-45](file://backend/src/routes/admin.ts#L28-L45)

### AdminDocumentsPage
- Purpose: Centralized document review workflow with filtering and actions.
- Key behaviors:
  - Tabbed filtering: Pending, Issues Found, All.
  - Inline approve or reject with optional reason input.
  - Links back to associated claim for context.
- Data model usage: Uses document verification statuses and claim/user/vehicle associations.

```mermaid
flowchart TD
Start(["Select tab"]) --> Filter["Filter docs by status"]
Filter --> Actions{"Action?"}
Actions --> |Approve| Approve["PATCH /documents/:id/approve"]
Actions --> |Reject| Reject["PATCH /documents/:id/reject {reason}"]
Approve --> Refresh["Refresh list"]
Reject --> Refresh
Refresh --> End(["Done"])
```

**Diagram sources**
- [AdminDocumentsPage.tsx:28-69](file://frontend/src/pages/admin/AdminDocumentsPage.tsx#L28-L69)
- [admin.ts:125-184](file://backend/src/routes/admin.ts#L125-L184)

**Section sources**
- [AdminDocumentsPage.tsx:1-210](file://frontend/src/pages/admin/AdminDocumentsPage.tsx#L1-L210)
- [admin.ts:125-184](file://backend/src/routes/admin.ts#L125-L184)

### AdminLoginPage
- Purpose: Authenticate administrators and gate access to admin routes.
- Key behaviors:
  - Submits credentials to login endpoint.
  - Validates admin role before storing token and navigating.
  - Displays errors for invalid credentials or insufficient privileges.
- Security note: Token storage is client-side; route protection relies on presence of token and backend enforcement.

```mermaid
sequenceDiagram
participant U as "Admin User"
participant L as "AdminLoginPage.tsx"
participant API as "adminApi.ts"
participant S as "Server"
U->>L : Submit email/password
L->>S : POST /auth/login
S-->>L : {user, token}
L->>L : Check user.isAdmin
alt Is admin
L->>L : Save token and user
L->>U : Navigate to /admin/dashboard
else Not admin
L->>U : Show error
end
```

**Diagram sources**
- [AdminLoginPage.tsx:13-31](file://frontend/src/pages/admin/AdminLoginPage.tsx#L13-L31)

**Section sources**
- [AdminLoginPage.tsx:1-75](file://frontend/src/pages/admin/AdminLoginPage.tsx#L1-L75)

## Dependency Analysis
- Frontend dependencies:
  - All admin pages depend on adminApi for authenticated requests.
  - AdminProtectedRoute guards admin routes based on token presence.
- Backend dependencies:
  - admin routes depend on adminAuth middleware to validate JWT and ensure admin role.
  - Routes use Prisma to read/write claims, users, and documents.

```mermaid
graph LR
AP["AdminPages"] --> AA["adminApi.ts"]
AA --> AR["admin.ts"]
AR --> AM["adminAuth.ts"]
AR --> DB["Prisma (DB)"]
```

**Diagram sources**
- [adminApi.ts:1-28](file://frontend/src/services/adminApi.ts#L1-L28)
- [admin.ts:1-187](file://backend/src/routes/admin.ts#L1-L187)
- [adminAuth.ts:1-27](file://backend/src/middleware/adminAuth.ts#L1-L27)

**Section sources**
- [adminApi.ts:1-28](file://frontend/src/services/adminApi.ts#L1-L28)
- [admin.ts:1-187](file://backend/src/routes/admin.ts#L1-L187)
- [adminAuth.ts:1-27](file://backend/src/middleware/adminAuth.ts#L1-L27)

## Performance Considerations
- Concurrent fetching: Dashboard fetches stats and recent claims in parallel to reduce load time.
- Filtering at source: Claims and documents use query parameters to minimize client-side processing.
- Selective includes: Backend queries include only necessary relations to reduce payload size.
- Optimizations to consider:
  - Pagination for large lists (claims, documents).
  - Debounced search input to reduce request frequency.
  - Caching frequently accessed stats with short TTL if appropriate.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Authentication issues:
  - If requests return 401/403, the adminApi interceptor clears the token and redirects to the login page. Ensure the token exists and is valid.
  - Confirm that the logged-in user has admin privileges; otherwise, the login flow denies access.
- Status updates fail:
  - Ensure the requested status is one of the allowed values enforced by the backend.
  - Check network errors and verify the claim ID exists.
- Document actions fail:
  - Approve/reject require valid document IDs; verify the document belongs to the current claim context.
  - Rejection requires a reason field; provide a meaningful message for auditability.
- Empty states:
  - No claims/documents/users may indicate missing data or overly restrictive filters; adjust filters or clear search.

**Section sources**
- [adminApi.ts:16-24](file://frontend/src/services/adminApi.ts#L16-L24)
- [admin.ts:105-123](file://backend/src/routes/admin.ts#L105-L123)
- [admin.ts:151-184](file://backend/src/routes/admin.ts#L151-L184)
- [AdminLoginPage.tsx:17-31](file://frontend/src/pages/admin/AdminLoginPage.tsx#L17-L31)

## Conclusion
The administrative interface provides a cohesive set of tools for monitoring system health, managing claims and users, and verifying documents. It emphasizes secure access, efficient data retrieval, and actionable workflows for approving or rejecting claims and documents. Future enhancements can include pagination, advanced reporting, bulk operations, and richer audit trails to further streamline administrative tasks.