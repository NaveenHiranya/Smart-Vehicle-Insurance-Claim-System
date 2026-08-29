# Authentication & Authorization

<cite>
**Referenced Files in This Document**
- [auth.ts](file://backend/src/middleware/auth.ts)
- [adminAuth.ts](file://backend/src/middleware/adminAuth.ts)
- [garageAuth.ts](file://backend/src/middleware/garageAuth.ts)
- [errorHandler.ts](file://backend/src/middleware/errorHandler.ts)
- [index.ts](file://backend/src/types/index.ts)
- [auth.ts](file://backend/src/routes/auth.ts)
- [admin.ts](file://backend/src/routes/admin.ts)
- [garageAuth.ts](file://backend/src/routes/garageAuth.ts)
- [garage.ts](file://backend/src/routes/garage.ts)
- [schema.prisma](file://backend/prisma/schema.prisma)
- [api.ts](file://frontend/src/services/api.ts)
- [garageApi.ts](file://frontend/src/services/garageApi.ts)
- [AuthContext.tsx](file://frontend/src/context/AuthContext.tsx)
- [ProtectedRoute.tsx](file://frontend/src/components/ProtectedRoute.tsx)
- [AdminProtectedRoute.tsx](file://frontend/src/components/AdminProtectedRoute.tsx)
- [GarageProtectedRoute.tsx](file://frontend/src/components/GarageProtectedRoute.tsx)
- [LoginPage.tsx](file://frontend/src/pages/LoginPage.tsx)
- [AdminLoginPage.tsx](file://frontend/src/pages/admin/AdminLoginPage.tsx)
- [GarageLoginPage.tsx](file://frontend/src/pages/garage/GarageLoginPage.tsx)
- [GarageRegisterPage.tsx](file://frontend/src/pages/garage/GarageRegisterPage.tsx)
- [RegisterPage.tsx](file://frontend/src/pages/RegisterPage.tsx)
- [ProfilePage.tsx](file://frontend/src/pages/ProfilePage.tsx)
- [AdminUsersPage.tsx](file://frontend/src/pages/admin/AdminUsersPage.tsx)
- [GarageLayout.tsx](file://frontend/src/components/GarageLayout.tsx)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive documentation for garage-specific JWT authentication system
- Updated architecture diagrams to include garage authentication flow
- Added new sections covering garage registration, login, and profile management
- Enhanced middleware chain documentation to include garage authentication
- Updated protected routes section to cover garage-specific endpoints
- Added garage-specific session management and error handling
- **Updated** Enhanced authentication system with Sri Lankan National Identity Card (NIC) validation supporting both old format (9 digits + V/X suffix) and new format (12 digits)
- **Updated** Expanded user profile fields including license type, annual fee, join date, and latest policy information

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
10. [Appendices](#appendices)

## Introduction
This document explains the JWT-based authentication and authorization system for the application, including the newly added garage-specific authentication system. It covers token generation, validation, role-based access control (user vs admin vs garage), middleware chain, session management on both frontend and backend, error handling, and security best practices. The system now supports three distinct user roles: regular users, administrators, and garage service providers, each with their own authentication flows and protected endpoints. The authentication system includes enhanced Sri Lankan National Identity Card (NIC) validation and comprehensive user profile management with insurance-related fields.

## Project Structure
The authentication system spans backend routes, middleware, types, database schema, as well as frontend services, context, and route guards. The system now includes separate authentication flows for users, admins, and garages, with enhanced user profile management capabilities.

```mermaid
graph TB
subgraph "Frontend"
A["AuthContext.tsx"]
B["api.ts"]
C["garageApi.ts"]
D["ProtectedRoute.tsx"]
E["AdminProtectedRoute.tsx"]
F["GarageProtectedRoute.tsx"]
G["LoginPage.tsx"]
H["AdminLoginPage.tsx"]
I["GarageLoginPage.tsx"]
J["GarageRegisterPage.tsx"]
K["GarageLayout.tsx"]
L["RegisterPage.tsx"]
M["ProfilePage.tsx"]
N["AdminUsersPage.tsx"]
end
subgraph "Backend"
O["routes/auth.ts"]
P["routes/admin.ts"]
Q["routes/garageAuth.ts"]
R["routes/garage.ts"]
S["middleware/auth.ts"]
T["middleware/adminAuth.ts"]
U["middleware/garageAuth.ts"]
V["types/index.ts"]
W["prisma/schema.prisma"]
end
G --> A
H --> A
I --> C
J --> C
A --> B
A --> C
B --> O
B --> P
C --> Q
C --> R
O --> S
P --> T
Q --> U
R --> U
S --> V
T --> V
U --> V
O --> W
P --> W
Q --> W
R --> W
L --> A
M --> A
N --> P
```

**Diagram sources**
- [AuthContext.tsx:17-66](file://frontend/src/context/AuthContext.tsx#L17-L66)
- [api.ts:3-33](file://frontend/src/services/api.ts#L3-L33)
- [garageApi.ts:1-31](file://frontend/src/services/garageApi.ts#L1-L31)
- [auth.ts:10-182](file://backend/src/routes/auth.ts#L10-L182)
- [admin.ts:1-412](file://backend/src/routes/admin.ts#L1-L412)
- [garageAuth.ts:1-136](file://backend/src/routes/garageAuth.ts#L1-L136)
- [garage.ts:1-136](file://backend/src/routes/garage.ts#L1-L136)
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)
- [index.ts:3-10](file://backend/src/types/index.ts#L3-L10)
- [schema.prisma:10-30](file://backend/prisma/schema.prisma#L10-L30)

**Section sources**
- [AuthContext.tsx:17-66](file://frontend/src/context/AuthContext.tsx#L17-L66)
- [api.ts:3-33](file://frontend/src/services/api.ts#L3-L33)
- [garageApi.ts:1-31](file://frontend/src/services/garageApi.ts#L1-L31)
- [auth.ts:10-182](file://backend/src/routes/auth.ts#L10-L182)
- [admin.ts:1-412](file://backend/src/routes/admin.ts#L1-L412)
- [garageAuth.ts:1-136](file://backend/src/routes/garageAuth.ts#L1-L136)
- [garage.ts:1-136](file://backend/src/routes/garage.ts#L1-L136)
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)
- [index.ts:3-10](file://backend/src/types/index.ts#L3-L10)
- [schema.prisma:10-30](file://backend/prisma/schema.prisma#L10-L30)

## Core Components
- **JWT token lifecycle**:
  - Generation on register and login with fixed expiration windows for all user types.
  - Validation via middleware that extracts and verifies tokens from the Authorization header.
  - Separate token structures for different user roles (user, admin, garage).
- **Role-based access control**:
  - User-level protection via auth middleware.
  - Admin-only protection via admin middleware that checks user role in the database.
  - Garage-specific protection via garage middleware that validates garage status and approval.
- **Enhanced User Profile Management**:
  - Sri Lankan NIC validation supporting both old format (9 digits + V/X suffix) and new format (12 digits).
  - Expanded profile fields including license type, annual fee, join date, and latest policy information.
  - Admin-controlled profile updates for insurance-related fields.
- **Frontend session management**:
  - Token storage in localStorage with separate keys for each user type.
  - Axios interceptors attach appropriate tokens to requests.
  - Route guards enforce authenticated navigation for each portal.

Key responsibilities by file:
- **Backend routes**:
  - User routes: Register/login create users and issue tokens; profile endpoints are protected with enhanced data retrieval.
  - Admin routes: Guarded at the router level with admin middleware.
  - Garage routes: Complete authentication flow with registration, login, and profile management.
- **Middleware**:
  - Auth middleware validates user tokens and attaches userId to the request.
  - Admin middleware validates tokens and ensures the user has admin privileges.
  - Garage middleware validates garage tokens and checks account approval status.
- **Types**:
  - Typed request extensions and JWT payload shapes used across middleware and routes.
- **Database**:
  - Models include role flags (isAdmin for users, isApproved/isActive for garages) used for access checks.
  - Enhanced User model with NIC, licenseType, annualFee, joinedAt fields for insurance company records.

**Section sources**
- [auth.ts:10-182](file://backend/src/routes/auth.ts#L10-L182)
- [admin.ts:1-412](file://backend/src/routes/admin.ts#L1-L412)
- [garageAuth.ts:1-136](file://backend/src/routes/garageAuth.ts#L1-L136)
- [garage.ts:1-136](file://backend/src/routes/garage.ts#L1-L136)
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)
- [index.ts:3-10](file://backend/src/types/index.ts#L3-L10)
- [schema.prisma:10-30](file://backend/prisma/schema.prisma#L10-L30)

## Architecture Overview
The flow begins with clients authenticating against the appropriate backend endpoint based on their role. On success, the server returns a role-specific JWT which the client stores and attaches to subsequent requests. Protected routes validate the token and enforce role-based access before allowing access. The system now includes enhanced user profile management with NIC validation and insurance-related fields.

```mermaid
sequenceDiagram
participant FE_User as "User Frontend"
participant FE_Garage as "Garage Frontend"
participant API as "Express Server"
participant AUTH as "Auth Middleware"
participant ADM as "Admin Middleware"
participant GARAGE as "Garage Middleware"
participant DB as "Database"
FE_User->>API : POST /api/auth/register (with NIC validation)
API->>DB : Create or find user with enhanced profile
DB-->>API : User record
API-->>FE_User : { user, token }
FE_Garage->>API : POST /api/garage/auth/register or /api/garage/auth/login
API->>DB : Create or find garage
DB-->>API : Garage record
API-->>FE_Garage : { garage, token }
FE_User->>API : GET /api/auth/profile (Bearer token)
API->>AUTH : Verify user token
AUTH-->>API : req.userId set
API->>DB : Fetch user with enhanced profile fields
DB-->>API : User with NIC, licenseType, annualFee, joinedAt
API-->>FE_User : Enhanced profile data
FE_Garage->>API : GET /api/garage/claims (Bearer token)
API->>GARAGE : Verify garage token + check approval
GARAGE->>DB : Find garage by id
DB-->>GARAGE : Garage with isApproved flag
GARAGE-->>API : Allow or deny
API-->>FE_Garage : Claims data or error
```

**Diagram sources**
- [auth.ts:10-182](file://backend/src/routes/auth.ts#L10-L182)
- [admin.ts:1-412](file://backend/src/routes/admin.ts#L1-L412)
- [garageAuth.ts:1-136](file://backend/src/routes/garageAuth.ts#L1-L136)
- [garage.ts:1-136](file://backend/src/routes/garage.ts#L1-L136)
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)
- [schema.prisma:10-30](file://backend/prisma/schema.prisma#L10-L30)

## Detailed Component Analysis

### Enhanced NIC Validation and User Registration
- **Sri Lankan NIC Format Support**: 
  - Old format: 9 digits followed by V or X suffix (e.g., 852345678V)
  - New format: 12 digits (e.g., 199852345678)
  - Backend validation using regex pattern `/^\d{9}[vVxX]$|^\d{12}$/`
  - Frontend validation with HTML5 pattern attribute
- **Registration Flow**: 
  - Validates NIC format during user registration
  - Normalizes NIC to uppercase for consistency
  - Creates user with enhanced profile fields
- **Error Handling**: Returns specific error messages for invalid NIC formats

```mermaid
flowchart TD
Start(["User Registration"]) --> ValidateNIC{"Valid NIC format?"}
ValidateNIC --> |No| Error400["Return 400: Invalid NIC format"]
ValidateNIC --> |Yes| CheckExisting{"Email exists?"}
CheckExisting --> |Yes| Error409["Return 409: Email already exists"]
CheckExisting --> |No| CreateUser["Create user with NIC validation"]
CreateUser --> NormalizeNIC["Normalize NIC to uppercase"]
NormalizeNIC --> GenerateToken["Generate JWT token"]
GenerateToken --> ReturnSuccess["Return user data and token"]
```

**Updated** Added comprehensive NIC validation supporting both old and new Sri Lankan ID formats

**Diagram sources**
- [auth.ts:20-24](file://backend/src/routes/auth.ts#L20-L24)
- [auth.ts:34-43](file://backend/src/routes/auth.ts#L34-L43)
- [RegisterPage.tsx:81-87](file://frontend/src/pages/RegisterPage.tsx#L81-L87)

**Section sources**
- [auth.ts:20-24](file://backend/src/routes/auth.ts#L20-L24)
- [auth.ts:34-43](file://backend/src/routes/auth.ts#L34-L43)
- [RegisterPage.tsx:81-87](file://frontend/src/pages/RegisterPage.tsx#L81-L87)

### Enhanced User Profile Management
- **Expanded Profile Fields**:
  - `nic`: National Identity Card number for user identification
  - `licenseType`: Driving license class (A, B, B1, C, etc.)
  - `annualFee`: Annual insurance fee in Sri Lankan Rupees (LKR)
  - `joinedAt`: Date when user joined the insurance company
  - Latest policy information retrieved automatically
- **Profile Retrieval**: Enhanced GET /api/auth/profile endpoint returns all insurance-related fields
- **Admin Management**: Administrators can update user profiles including NIC, license type, annual fees, and join dates
- **User Display**: Profile page shows insurance details managed by the insurance company

```mermaid
sequenceDiagram
participant AdminUI as "Admin Interface"
participant AdminAPI as "Admin API"
participant DB as "Database"
Note over AdminUI,DB : Admin Updates User Profile
AdminUI->>AdminAPI : PATCH /api/admin/users/ : id (NIC, licenseType, annualFee, joinedAt)
AdminAPI->>DB : Update user with enhanced fields
DB-->>AdminAPI : Updated user record
AdminAPI-->>AdminUI : Success response
Note over AdminUI,DB : User Profile Display
AdminUI->>AdminAPI : GET /api/auth/profile
AdminAPI->>DB : Fetch user with latest policy
DB-->>AdminAPI : User with NIC, licenseType, annualFee, joinedAt, policies
AdminAPI-->>AdminUI : Enhanced profile data
```

**New Section** Comprehensive documentation of enhanced user profile management with insurance-related fields

**Diagram sources**
- [auth.ts:115-148](file://backend/src/routes/auth.ts#L115-L148)
- [AdminUsersPage.tsx:321-350](file://frontend/src/pages/admin/AdminUsersPage.tsx#L321-L350)
- [ProfilePage.tsx:45-99](file://frontend/src/pages/ProfilePage.tsx#L45-L99)
- [schema.prisma:18-23](file://backend/prisma/schema.prisma#L18-L23)

**Section sources**
- [auth.ts:115-148](file://backend/src/routes/auth.ts#L115-L148)
- [AdminUsersPage.tsx:321-350](file://frontend/src/pages/admin/AdminUsersPage.tsx#L321-L350)
- [ProfilePage.tsx:45-99](file://frontend/src/pages/ProfilePage.tsx#L45-L99)
- [schema.prisma:18-23](file://backend/prisma/schema.prisma#L18-L23)

### Token Generation and Storage
- **User tokens**: Generated on registration and login with fixed expiration period and user identifiers in payload.
- **Admin tokens**: Same structure as user tokens but with admin privileges checked during middleware execution.
- **Garage tokens**: Generated with garageId and role 'garage', stored separately in localStorage as 'garageToken'.
- **Frontend storage**: Each user type maintains separate token storage and automatic attachment via Axios interceptors.
- **Error handling**: On 401 responses, respective frontends clear local state and redirect to appropriate login pages.

```mermaid
flowchart TD
Start(["Login/Register"]) --> GenerateToken["Generate JWT with expiration"]
GenerateToken --> StoreToken["Store token in localStorage"]
StoreToken --> AttachHeader["Attach Authorization header on requests"]
AttachHeader --> Handle401{"Response 401?"}
Handle401 --> |Yes| ClearState["Clear token and redirect to login"]
Handle401 --> |No| Continue["Proceed with request"]
```

**Updated** Added support for garage-specific token storage and handling

**Diagram sources**
- [auth.ts:56-62](file://backend/src/routes/auth.ts#L56-L62)
- [auth.ts:91-108](file://backend/src/routes/auth.ts#L91-L108)
- [garageAuth.ts:90-104](file://backend/src/routes/garageAuth.ts#L90-L104)
- [api.ts:7-33](file://frontend/src/services/api.ts#L7-L33)
- [garageApi.ts:7-14](file://frontend/src/services/garageApi.ts#L7-L14)
- [AuthContext.tsx:38-66](file://frontend/src/context/AuthContext.tsx#L38-L66)

**Section sources**
- [auth.ts:56-62](file://backend/src/routes/auth.ts#L56-L62)
- [auth.ts:91-108](file://backend/src/routes/auth.ts#L91-L108)
- [garageAuth.ts:90-104](file://backend/src/routes/garageAuth.ts#L90-L104)
- [api.ts:7-33](file://frontend/src/services/api.ts#L7-L33)
- [garageApi.ts:7-14](file://frontend/src/services/garageApi.ts#L7-L14)
- [AuthContext.tsx:38-66](file://frontend/src/context/AuthContext.tsx#L38-L66)

### Token Validation and Middleware Chain
- **Auth middleware**: Validates user tokens and sets req.userId for downstream handlers.
- **Admin middleware**: Validates tokens and queries database to ensure user has admin privileges.
- **Garage middleware**: Validates garage tokens, checks role is 'garage', verifies account approval and active status.
- **Sequential validation**: Each middleware performs specific role-based checks before granting access.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Router as "Express Router"
participant AuthMW as "authMiddleware"
participant AdminMW as "adminAuthMiddleware"
participant GarageMW as "garageAuthMiddleware"
participant Handler as "Route Handler"
Client->>Router : Request with Authorization header
Router->>AuthMW : Validate user token
AuthMW-->>Router : Next or 401
alt Admin route
Router->>AdminMW : Check isAdmin
AdminMW-->>Router : Next or 403
else Garage route
Router->>GarageMW : Check garage role + approval
GarageMW-->>Router : Next or 403
end
Router->>Handler : Execute handler with req.userId
Handler-->>Client : Response
```

**Updated** Added garage middleware to the authentication chain

**Diagram sources**
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)
- [admin.ts:1-7](file://backend/src/routes/admin.ts#L1-L7)
- [garage.ts:7-7](file://backend/src/routes/garage.ts#L7-L7)

**Section sources**
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)
- [admin.ts:1-7](file://backend/src/routes/admin.ts#L1-L7)
- [garage.ts:7-7](file://backend/src/routes/garage.ts#L7-L7)

### Role-Based Access Control (User vs Admin vs Garage)
- **User role**: Any authenticated user can access protected user endpoints (e.g., profile).
- **Admin role**: Admin-only routes are mounted under a router that applies admin middleware globally.
- **Garage role**: Garage routes require valid garage tokens with approved and active status.
- **Hierarchical permissions**: Users < Garages < Admins in terms of system access.

```mermaid
classDiagram
class User {
+string id
+string email
+boolean isAdmin
+string nic
+string licenseType
+float annualFee
+DateTime joinedAt
}
class Garage {
+string id
+string email
+boolean isApproved
+boolean isActive
}
class AuthRequest {
+string? userId
}
class AuthMiddleware {
+verifyToken()
+attachUserId()
}
class AdminMiddleware {
+verifyToken()
+checkIsAdmin()
}
class GarageMiddleware {
+verifyToken()
+checkGarageRole()
+checkApprovalStatus()
}
AuthMiddleware --> AuthRequest : "mutates"
AdminMiddleware --> User : "queries isAdmin"
GarageMiddleware --> Garage : "queries isApproved, isActive"
```

**Updated** Added Garage class and GarageMiddleware to the role hierarchy, enhanced User class with insurance fields

**Diagram sources**
- [schema.prisma:10-30](file://backend/prisma/schema.prisma#L10-L30)
- [index.ts:3-10](file://backend/src/types/index.ts#L3-L10)
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)

**Section sources**
- [schema.prisma:10-30](file://backend/prisma/schema.prisma#L10-L30)
- [index.ts:3-10](file://backend/src/types/index.ts#L3-L10)
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)

### Protected Routes and Examples
- **User-protected routes**: Profile retrieval and update require valid user tokens.
- **Admin-protected routes**: Stats, users, claims, documents endpoints require admin privileges.
- **Garage-protected routes**: Claims listing, claim details, and estimate submission require garage authentication.
- **Multi-layer protection**: Some endpoints may have additional business logic beyond basic authentication.

```mermaid
flowchart TD
Req["Incoming Request"] --> HasToken{"Has Bearer token?"}
HasToken --> |No| Deny401["Return 401 Unauthorized"]
HasToken --> |Yes| IsAdminRoute{"Admin route?"}
IsAdminRoute --> |Yes| CheckAdminRole["Check isAdmin in DB"]
CheckAdminRole --> |True| AllowAdmin["Allow admin access"]
CheckAdminRole --> |False| Deny403["Return 403 Forbidden"]
IsAdminRoute --> |No| IsGarageRoute{"Garage route?"}
IsGarageRoute --> |Yes| CheckGarageRole["Check garage role + approval"]
CheckGarageRole --> |True| AllowGarage["Allow garage access"]
CheckGarageRole --> |False| Deny403
IsGarageRoute --> |No| AllowUser["Allow user access"]
```

**Updated** Added garage route protection to the access control flow

**Diagram sources**
- [auth.ts:115-182](file://backend/src/routes/auth.ts#L115-L182)
- [admin.ts:1-412](file://backend/src/routes/admin.ts#L1-L412)
- [garageAuth.ts:111-133](file://backend/src/routes/garageAuth.ts#L111-L133)
- [garage.ts:11-136](file://backend/src/routes/garage.ts#L11-L136)
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)

**Section sources**
- [auth.ts:115-182](file://backend/src/routes/auth.ts#L115-L182)
- [admin.ts:1-412](file://backend/src/routes/admin.ts#L1-L412)
- [garageAuth.ts:111-133](file://backend/src/routes/garageAuth.ts#L111-L133)
- [garage.ts:11-136](file://backend/src/routes/garage.ts#L11-L136)
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)

### Garage Authentication Flow
- **Registration**: Creates garage accounts with pending approval status, requiring admin approval before login.
- **Login**: Validates credentials, checks approval and active status, generates 7-day JWT tokens.
- **Profile Management**: Protected endpoints for retrieving garage information and managing account details.
- **Business Logic**: Garage-specific endpoints for claim management and estimate submission.

```mermaid
sequenceDiagram
participant GarageUI as "Garage UI"
participant GarageAPI as "Garage API"
participant GarageMW as "Garage Middleware"
participant DB as "Database"
Note over GarageUI,DB : Registration Flow
GarageUI->>GarageAPI : POST /api/garage/auth/register
GarageAPI->>DB : Create garage (isApproved : false)
DB-->>GarageAPI : Garage record
GarageAPI-->>GarageUI : Success message (pending approval)
Note over GarageUI,DB : Login Flow
GarageUI->>GarageAPI : POST /api/garage/auth/login
GarageAPI->>DB : Find garage + check approval
DB-->>GarageAPI : Garage record
alt Approved & Active
GarageAPI->>GarageAPI : Generate JWT token
GarageAPI-->>GarageUI : { garage, token }
else Not Approved
GarageAPI-->>GarageUI : 403 Pending approval
end
Note over GarageUI,DB : Protected Access
GarageUI->>GarageAPI : GET /api/garage/claims (with token)
GarageAPI->>GarageMW : Validate token + check approval
GarageMW->>DB : Verify garage status
DB-->>GarageMW : Garage info
GarageMW-->>GarageAPI : Allow access
GarageAPI-->>GarageUI : Claims data
```

**New Section** Comprehensive documentation of the complete garage authentication workflow

**Diagram sources**
- [garageAuth.ts:11-56](file://backend/src/routes/garageAuth.ts#L11-L56)
- [garageAuth.ts:58-109](file://backend/src/routes/garageAuth.ts#L58-L109)
- [garageAuth.ts:111-133](file://backend/src/routes/garageAuth.ts#L111-L133)
- [garage.ts:11-136](file://backend/src/routes/garage.ts#L11-L136)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)

**Section sources**
- [garageAuth.ts:11-56](file://backend/src/routes/garageAuth.ts#L11-L56)
- [garageAuth.ts:58-109](file://backend/src/routes/garageAuth.ts#L58-L109)
- [garageAuth.ts:111-133](file://backend/src/routes/garageAuth.ts#L111-L133)
- [garage.ts:11-136](file://backend/src/routes/garage.ts#L11-L136)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)

### Session Management (Frontend)
- **User sessions**: Tokens stored in localStorage and restored on app start with Axios interceptor.
- **Garage sessions**: Separate token storage ('garageToken') with dedicated API client and interceptors.
- **Admin sessions**: Standard user session management with admin role verification.
- **Error handling**: Each frontend handles 401/403 responses by clearing relevant tokens and redirecting to appropriate login pages.

```mermaid
sequenceDiagram
participant UserUI as "User UI"
participant GarageUI as "Garage UI"
participant UserCtx as "User Context"
participant GarageApi as "Garage API Client"
participant Api as "User API Client"
Note over UserUI,GarageUI : User Authentication
UserUI->>UserCtx : login/register
UserCtx->>Api : POST /api/auth/login or /api/auth/register
Api-->>UserCtx : { user, token }
UserCtx->>UserCtx : Save token to localStorage
Note over GarageUI,GarageApi : Garage Authentication
GarageUI->>GarageApi : POST /api/garage/auth/login
GarageApi-->>GarageUI : { garage, token }
GarageUI->>GarageUI : Save garageToken to localStorage
Note over UserUI,GarageUI : Protected Requests
UserUI->>Api : Subsequent requests (auto-attach token)
GarageUI->>GarageApi : Subsequent requests (auto-attach garageToken)
Api-->>UserUI : 401? -> clear user token & redirect
GarageApi-->>GarageUI : 401? -> clear garage token & redirect
```

**Updated** Added garage session management alongside existing user session handling

**Diagram sources**
- [AuthContext.tsx:17-66](file://frontend/src/context/AuthContext.tsx#L17-66)
- [api.ts:7-33](file://frontend/src/services/api.ts#L7-L33)
- [garageApi.ts:7-28](file://frontend/src/services/garageApi.ts#L7-L28)
- [LoginPage.tsx:14-27](file://frontend/src/pages/LoginPage.tsx#L14-L27)
- [AdminLoginPage.tsx:13-32](file://frontend/src/pages/admin/AdminLoginPage.tsx#L13-L32)
- [GarageLoginPage.tsx:14-33](file://frontend/src/pages/garage/GarageLoginPage.tsx#L14-L33)

**Section sources**
- [AuthContext.tsx:17-66](file://frontend/src/context/AuthContext.tsx#L17-L66)
- [api.ts:7-33](file://frontend/src/services/api.ts#L7-L33)
- [garageApi.ts:7-28](file://frontend/src/services/garageApi.ts#L7-L28)
- [LoginPage.tsx:14-27](file://frontend/src/pages/LoginPage.tsx#L14-L27)
- [AdminLoginPage.tsx:13-32](file://frontend/src/pages/admin/AdminLoginPage.tsx#L13-L32)
- [GarageLoginPage.tsx:14-33](file://frontend/src/pages/garage/GarageLoginPage.tsx#L14-L33)

### Error Handling and Responses
- **Authentication errors**: Missing or invalid tokens result in 401 responses across all user types.
- **Authorization errors**: Insufficient permissions result in 403 responses with role-specific messages.
- **Garage-specific errors**: Account not found, not approved, or inactive status return 403 with descriptive messages.
- **NIC validation errors**: Invalid NIC format returns 400 with specific error messages.
- **Centralized handling**: Error handler converts errors into consistent JSON responses across the application.

```mermaid
flowchart TD
ErrStart["Error Occurs"] --> Type{"Type?"}
Type --> |Unauthorized| U401["401 Unauthorized"]
Type --> |Forbidden| U403["403 Forbidden"]
Type --> |NIC Invalid| N400["400 Invalid NIC format"]
Type --> |Garage Not Approved| G403["403 Garage Not Approved"]
Type --> |AppError| UCode["Use AppError.statusCode"]
Type --> |Other| U500["500 Internal Server Error"]
```

**Updated** Added NIC validation error handling and garage-specific error handling for approval and status checks

**Diagram sources**
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)
- [errorHandler.ts:13-27](file://backend/src/middleware/errorHandler.ts#L13-L27)
- [auth.ts:20-24](file://backend/src/routes/auth.ts#L20-L24)

**Section sources**
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)
- [errorHandler.ts:13-27](file://backend/src/middleware/errorHandler.ts#L13-L27)
- [auth.ts:20-24](file://backend/src/routes/auth.ts#L20-L24)

## Dependency Analysis
- **Backend dependencies**:
  - Express routes depend on middleware for authentication and authorization.
  - Middleware depends on JSON Web Token library and environment secret.
  - Admin and garage middleware depend on Prisma client to read user/garage roles and status.
- **Frontend dependencies**:
  - Axios interceptors depend on localStorage for token persistence with separate storage per user type.
  - Context manages user state while garage components manage garage-specific state.

```mermaid
graph LR
RAuth["routes/auth.ts"] --> MWAuth["middleware/auth.ts"]
RAdmin["routes/admin.ts"] --> MWAdmin["middleware/adminAuth.ts"]
RGarageAuth["routes/garageAuth.ts"] --> MWGarage["middleware/garageAuth.ts"]
RGarage["routes/garage.ts"] --> MWGarage
MWAuth --> Types["types/index.ts"]
MWAdmin --> Types
MWGarage --> Types
MWAdmin --> Prisma["utils/prisma.js"]
MWGarage --> Prisma
FEApi["services/api.ts"] --> FECtx["context/AuthContext.tsx"]
FEGarageApi["services/garageApi.ts"] --> FEGarageCtx["garage components"]
FEApi --> RAuth
FEApi --> RAdmin
FEGarageApi --> RGarageAuth
FEGarageApi --> RGarage
```

**Updated** Added garage authentication dependencies to the dependency graph

**Diagram sources**
- [auth.ts:10-182](file://backend/src/routes/auth.ts#L10-L182)
- [admin.ts:1-412](file://backend/src/routes/admin.ts#L1-L412)
- [garageAuth.ts:1-136](file://backend/src/routes/garageAuth.ts#L1-L136)
- [garage.ts:1-136](file://backend/src/routes/garage.ts#L1-L136)
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)
- [index.ts:3-10](file://backend/src/types/index.ts#L3-L10)
- [api.ts:3-33](file://frontend/src/services/api.ts#L3-L33)
- [garageApi.ts:1-31](file://frontend/src/services/garageApi.ts#L1-L31)
- [AuthContext.tsx:17-66](file://frontend/src/context/AuthContext.tsx#L17-L66)

**Section sources**
- [auth.ts:10-182](file://backend/src/routes/auth.ts#L10-L182)
- [admin.ts:1-412](file://backend/src/routes/admin.ts#L1-L412)
- [garageAuth.ts:1-136](file://backend/src/routes/garageAuth.ts#L1-L136)
- [garage.ts:1-136](file://backend/src/routes/garage.ts#L1-L136)
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)
- [index.ts:3-10](file://backend/src/types/index.ts#L3-L10)
- [api.ts:3-33](file://frontend/src/services/api.ts#L3-L33)
- [garageApi.ts:1-31](file://frontend/src/services/garageApi.ts#L1-L31)
- [AuthContext.tsx:17-66](file://frontend/src/context/AuthContext.tsx#L17-L66)

## Performance Considerations
- **Token verification**: Lightweight but should be performed once per request; avoid redundant checks.
- **Database queries**: Admin and garage checks query the database; consider caching user/garage roles if high traffic is expected.
- **Token payloads**: Keep minimal to reduce bandwidth overhead across all user types.
- **Efficient queries**: Use efficient Prisma queries and selective field projection to minimize data transfer.
- **Separate API clients**: Dedicated garage API client reduces overhead for non-garage users.
- **Enhanced profile queries**: Latest policy retrieval uses optimized queries with ordering and limiting.

## Troubleshooting Guide
Common issues and resolutions:
- **401 Unauthorized**:
  - Ensure Authorization header is present and formatted as Bearer <token>.
  - Confirm the token is valid and not expired for the correct user type.
  - If the frontend receives 401, it clears stored credentials and redirects to appropriate login.
- **403 Forbidden**:
  - For admin routes, verify the user has admin privileges in the database.
  - For garage routes, verify the garage account is approved and active.
  - Check that the token contains the correct role for the requested endpoint.
- **Invalid token**:
  - Verify the JWT secret configuration matches between signing and verification.
  - Ensure tokens are generated for the correct user type (user, admin, or garage).
- **NIC Validation Errors**:
  - "NIC must be 9 digits followed by V/X or 12 digits": Ensure NIC follows Sri Lankan format standards.
  - Old format example: 852345678V or 852345678X
  - New format example: 199852345678
- **Garage-specific issues**:
  - "Account pending approval": Garage must be approved by admin before login.
  - "Account deactivated": Garage account has been marked as inactive.
  - "Garage access required": Token exists but doesn't contain garage role.

**Updated** Added NIC validation troubleshooting scenarios

**Section sources**
- [auth.ts:5-23](file://backend/src/middleware/auth.ts#L5-L23)
- [adminAuth.ts:6-26](file://backend/src/middleware/adminAuth.ts#L6-L26)
- [garageAuth.ts:6-31](file://backend/src/middleware/garageAuth.ts#L6-L31)
- [api.ts:22-33](file://frontend/src/services/api.ts#L22-L33)
- [garageApi.ts:16-28](file://frontend/src/services/garageApi.ts#L16-L28)
- [auth.ts:20-24](file://backend/src/routes/auth.ts#L20-L24)

## Conclusion
The system implements a comprehensive JWT-based authentication flow with role-based authorization for user, admin, and garage roles. Tokens are generated on registration and login, validated by specialized middleware, and enforced by route guards on both frontend and backend. The addition of garage authentication provides a complete solution for service provider integration with proper approval workflows and business logic. The enhanced authentication system now includes robust Sri Lankan NIC validation supporting both legacy and modern ID formats, along with comprehensive user profile management for insurance company operations. Security relies on proper token handling, secure secrets, and careful permission checks across all user types. To enhance resilience, consider adding refresh tokens, rate limiting, CSRF protections, and centralized audit logging.

## Appendices

### Implementing Custom Authentication Flows
- Add new endpoints in the appropriate auth routes for custom flows (e.g., social login callbacks).
- Issue JWTs consistently with the same payload structure and expiration policy for each user type.
- Extend middleware if additional claims need to be validated or injected into requests.
- Follow the garage authentication pattern for new user types requiring approval workflows.
- Implement NIC validation for any user registration flows involving Sri Lankan identity verification.

### Integrating External Auth Providers
- Replace password verification with provider-specific verification logic.
- Map external identities to internal user records and set appropriate roles.
- Issue JWTs after successful external authentication following established patterns.
- For garage integrations, maintain the approval workflow requirement.
- Support NIC validation for external identity mapping to Sri Lankan users.

### Securing Sensitive Endpoints
- Apply auth middleware to protect user endpoints.
- Apply admin middleware to protect administrative endpoints.
- Apply garage middleware to protect garage-specific endpoints.
- Validate inputs and sanitize outputs to prevent injection and data leaks.
- Implement NIC format validation for all identity-related endpoints.

**Section sources**
- [auth.ts:115-182](file://backend/src/routes/auth.ts#L115-L182)
- [admin.ts:1-412](file://backend/src/routes/admin.ts#L1-L412)
- [garageAuth.ts:111-133](file://backend/src/routes/garageAuth.ts#L111-L133)
- [garage.ts:11-136](file://backend/src/routes/garage.ts#L11-L136)
- [auth.ts:20-24](file://backend/src/routes/auth.ts#L20-L24)

### Token Expiration Handling
- Current implementation uses fixed expiration windows: 7 days for garage tokens, variable for user/admin tokens.
- Frontends handle 401 by clearing relevant tokens and redirecting to appropriate login pages.
- Consider implementing refresh tokens to improve UX while maintaining security across all user types.

**Section sources**
- [auth.ts:56-62](file://backend/src/routes/auth.ts#L56-L62)
- [auth.ts:91-108](file://backend/src/routes/auth.ts#L91-L108)
- [garageAuth.ts:90-94](file://backend/src/routes/garageAuth.ts#L90-L94)
- [api.ts:22-33](file://frontend/src/services/api.ts#L22-L33)
- [garageApi.ts:16-28](file://frontend/src/services/garageApi.ts#L16-L28)

### Security Best Practices
- Store secrets securely via environment variables and never hardcode them.
- Use HTTPS in production to protect tokens in transit.
- Limit token scope and lifetime to the minimum necessary for each user type.
- Implement rate limiting on authentication endpoints to mitigate brute-force attacks.
- Consider CSRF protections for browser-based flows where applicable.
- Regularly rotate JWT secrets and monitor for suspicious authentication patterns.
- Validate NIC formats to prevent identity fraud and ensure compliance with Sri Lankan regulations.

### Garage-Specific Security Considerations
- **Approval Workflow**: All garage accounts require admin approval before they can authenticate.
- **Status Monitoring**: Active and approved status checks prevent unauthorized access even with valid tokens.
- **Data Isolation**: Garage endpoints only access data assigned to the authenticated garage.
- **Business Logic Validation**: Additional checks ensure garage estimates can only be submitted when AI assessment is complete.

**Section sources**
- [garageAuth.ts:74-82](file://backend/src/routes/garageAuth.ts#L74-L82)
- [garageAuth.ts:20-24](file://backend/src/middleware/garageAuth.ts#L20-L24)
- [garage.ts:83-86](file://backend/src/routes/garage.ts#L83-L86)

### Enhanced User Profile Security
- **NIC Validation**: Strict format validation prevents invalid identity numbers from being stored.
- **Admin-Controlled Updates**: Insurance-related fields (NIC, license type, annual fees) are managed by authorized administrators.
- **Data Privacy**: User profile information is protected and only accessible to authenticated users and authorized administrators.
- **Audit Trail**: Changes to sensitive profile fields are tracked through standard database audit mechanisms.

**Section sources**
- [auth.ts:20-24](file://backend/src/routes/auth.ts#L20-L24)
- [auth.ts:115-148](file://backend/src/routes/auth.ts#L115-L148)
- [AdminUsersPage.tsx:321-350](file://frontend/src/pages/admin/AdminUsersPage.tsx#L321-L350)
- [schema.prisma:18-23](file://backend/prisma/schema.prisma#L18-L23)