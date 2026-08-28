# Frontend Documentation

<cite>
**Referenced Files in This Document**
- [main.tsx](file://frontend/src/main.tsx)
- [App.tsx](file://frontend/src/App.tsx)
- [index.html](file://frontend/index.html)
- [package.json](file://frontend/package.json)
- [vite.config.ts](file://frontend/vite.config.ts)
- [index.css](file://frontend/src/index.css)
- [AuthContext.tsx](file://frontend/src/context/AuthContext.tsx)
- [ProtectedRoute.tsx](file://frontend/src/components/ProtectedRoute.tsx)
- [AdminProtectedRoute.tsx](file://frontend/src/components/AdminProtectedRoute.tsx)
- [Layout.tsx](file://frontend/src/components/Layout.tsx)
- [AdminLayout.tsx](file://frontend/src/components/AdminLayout.tsx)
- [api.ts](file://frontend/src/services/api.ts)
- [adminApi.ts](file://frontend/src/services/adminApi.ts)
- [uploadUrl.ts](file://frontend/src/utils/uploadUrl.ts)
- [types/index.ts](file://frontend/src/types/index.ts)
- [LoginPage.tsx](file://frontend/src/pages/LoginPage.tsx)
- [DashboardPage.tsx](file://frontend/src/pages/DashboardPage.tsx)
- [ClaimDetailPage.tsx](file://frontend/src/pages/ClaimDetailPage.tsx)
- [AdminClaimDetailPage.tsx](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx)
- [AdminDocumentsPage.tsx](file://frontend/src/pages/admin/AdminDocumentsPage.tsx)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive documentation for the new uploadUrl utility function
- Updated file structure section to include the utils directory
- Enhanced API integration patterns section with file upload handling
- Added new section on centralized URL resolution utilities
- Updated component usage examples to demonstrate uploadUrl integration

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
This document provides comprehensive frontend documentation for the React-based user interface of the Smart Vehicle Insurance Claim System. It covers component hierarchy, routing with React Router, state management via Context API, API integration using Axios, styling with Tailwind CSS, responsive design, accessibility considerations, composition patterns, prop interfaces, event handling, error boundaries, build configuration with Vite, and centralized URL resolution utilities for file uploads.

## Project Structure
The frontend is a Vite + React application using TypeScript, Tailwind CSS, and React Router. The entry point renders the root App inside StrictMode, which configures routing, authentication context, and protected routes. Layouts wrap page components to provide consistent navigation and branding. Services encapsulate HTTP calls with Axios interceptors for token injection and error handling. Types define shared data models used across pages and services. A centralized utility handles URL resolution for uploaded files across different environments.

```mermaid
graph TB
HTML["index.html"] --> MAIN["main.tsx"]
MAIN --> APP["App.tsx"]
APP --> ROUTER["React Router Routes"]
APP --> AUTH["AuthProvider (AuthContext)"]
ROUTER --> LAYOUTS["Layout / AdminLayout"]
ROUTER --> PAGES["Pages (Dashboard, Login, etc.)"]
PAGES --> SERVICES["API Services (api.ts, adminApi.ts)"]
PAGES --> UTILS["Utilities (uploadUrl.ts)"]
SERVICES --> TYPES["Shared Types (types/index.ts)"]
UTILS --> TYPES
```

**Diagram sources**
- [index.html:1-14](file://frontend/index.html#L1-L14)
- [main.tsx:1-11](file://frontend/src/main.tsx#L1-L11)
- [App.tsx:1-56](file://frontend/src/App.tsx#L1-L56)
- [Layout.tsx:1-176](file://frontend/src/components/Layout.tsx#L1-L176)
- [AdminLayout.tsx:1-74](file://frontend/src/components/AdminLayout.tsx#L1-L74)
- [api.ts:1-36](file://frontend/src/services/api.ts#L1-L36)
- [adminApi.ts:1-26](file://frontend/src/services/adminApi.ts#L1-L26)
- [uploadUrl.ts:1-16](file://frontend/src/utils/uploadUrl.ts#L1-L16)
- [types/index.ts:1-150](file://frontend/src/types/index.ts#L1-L150)

**Section sources**
- [index.html:1-14](file://frontend/index.html#L1-L14)
- [main.tsx:1-11](file://frontend/src/main.tsx#L1-L11)
- [App.tsx:1-56](file://frontend/src/App.tsx#L1-L56)

## Core Components
- Authentication Context: Centralized state for user session, token persistence, login/register/logout/profile updates.
- Protected Routes: Guarded routes that enforce authentication for regular users and admins.
- Layouts: Shared chrome for user and admin areas, including navigation and responsive behavior.
- API Services: Axios instances with interceptors for authorization headers and unified error handling.
- Utilities: Centralized functions for common operations like URL resolution for uploaded files.
- Types: Shared TypeScript interfaces for domain entities and responses.

Key responsibilities:
- AuthContext manages lifecycle of auth state and persists tokens locally.
- ProtectedRoute and AdminProtectedRoute ensure only authenticated users access sensitive routes.
- Layout and AdminLayout provide consistent UI shells and navigation.
- api.ts and adminApi.ts centralize HTTP concerns and redirect on unauthorized errors.
- uploadUrl.ts provides centralized URL resolution for uploaded files across environments.
- types/index.ts defines contracts for requests/responses across the app.

**Section sources**
- [AuthContext.tsx:1-82](file://frontend/src/context/AuthContext.tsx#L1-L82)
- [ProtectedRoute.tsx:1-21](file://frontend/src/components/ProtectedRoute.tsx#L1-L21)
- [AdminProtectedRoute.tsx:1-8](file://frontend/src/components/AdminProtectedRoute.tsx#L1-L8)
- [Layout.tsx:1-176](file://frontend/src/components/Layout.tsx#L1-L176)
- [AdminLayout.tsx:1-74](file://frontend/src/components/AdminLayout.tsx#L1-L74)
- [api.ts:1-36](file://frontend/src/services/api.ts#L1-L36)
- [adminApi.ts:1-26](file://frontend/src/services/adminApi.ts#L1-L26)
- [uploadUrl.ts:1-16](file://frontend/src/utils/uploadUrl.ts#L1-L16)
- [types/index.ts:1-150](file://frontend/src/types/index.ts#L1-L150)

## Architecture Overview
The application uses a layered architecture:
- Presentation Layer: Pages and reusable layouts render UI and handle user interactions.
- State Layer: Context API holds global auth state; local component state handles UI specifics.
- Service Layer: Axios services abstract backend communication with centralized interceptors.
- Utility Layer: Centralized functions provide common operations like URL resolution.
- Data Contracts: Shared TypeScript types ensure consistency between UI and API payloads.

```mermaid
sequenceDiagram
participant User as "User"
participant Page as "Page Component"
participant Ctx as "AuthContext"
participant Svc as "Axios Service"
participant Util as "uploadUrl"
participant API as "Backend API"
User->>Page : Interact (e.g., view uploaded image)
Page->>Util : Call uploadUrl(filePath)
Util-->>Page : Resolved URL
Page->>Ctx : Call action (login/register/updateProfile)
Ctx->>Svc : POST/PUT request with token
Svc->>API : Forward request with Authorization header
API-->>Svc : Response or 401
alt 401 Unauthorized
Svc->>Svc : Clear tokens and redirect to login
else Success
Svc-->>Ctx : Return data
Ctx->>Ctx : Update state and persist token/user
Ctx-->>Page : Updated state
Page->>Page : Re-render UI with resolved URLs
end
```

**Diagram sources**
- [AuthContext.tsx:17-66](file://frontend/src/context/AuthContext.tsx#L17-L66)
- [api.ts:7-33](file://frontend/src/services/api.ts#L7-L33)
- [adminApi.ts:5-23](file://frontend/src/services/adminApi.ts#L5-L23)
- [uploadUrl.ts:11-15](file://frontend/src/utils/uploadUrl.ts#L11-L15)

## Detailed Component Analysis

### Routing and Navigation
- Root router wraps the app with BrowserRouter and AuthProvider.
- Public routes: login, register, admin login.
- Protected user routes: dashboard, vehicles, policies, claims, profile.
- Protected admin routes: admin dashboard, users, claims, documents.
- Redirects: root path redirects to dashboard; admin root redirects to admin login.

```mermaid
flowchart TD
Start(["App Mount"]) --> Router["Routes Configuration"]
Router --> Public["Public Routes<br/>/login, /register, /admin/login"]
Router --> UserProtected["Protected User Routes<br/>/dashboard, /vehicles, /claims, /profile"]
Router --> AdminProtected["Protected Admin Routes<br/>/admin/dashboard, /admin/users, /admin/claims, /admin/documents"]
UserProtected --> GuardU["ProtectedRoute checks user"]
AdminProtected --> GuardA["AdminProtectedRoute checks adminToken"]
GuardU --> |Not Auth| ToLogin["Redirect to /login"]
GuardA --> |Not Auth| ToAdminLogin["Redirect to /admin/login"]
GuardU --> |Auth| RenderUser["Render Layout + Page"]
GuardA --> |Auth| RenderAdmin["Render AdminLayout + Page"]
```

**Diagram sources**
- [App.tsx:23-51](file://frontend/src/App.tsx#L23-L51)
- [ProtectedRoute.tsx:4-20](file://frontend/src/components/ProtectedRoute.tsx#L4-L20)
- [AdminProtectedRoute.tsx:3-7](file://frontend/src/components/AdminProtectedRoute.tsx#L3-L7)

**Section sources**
- [App.tsx:1-56](file://frontend/src/App.tsx#L1-L56)

### Authentication and Global State
- AuthContext exposes user, token, loading, and actions: login, register, logout, updateProfile.
- On mount, if a token exists, it fetches the current profile to hydrate state.
- Login/Register store token and user in localStorage and update context.
- Logout clears context and storage.
- Profile updates refresh user state from server response.

```mermaid
classDiagram
class AuthContextType {
+user : User | null
+token : string | null
+loading : boolean
+login(email, password) Promise~void~
+register(data) Promise~void~
+logout() void
+updateProfile(data) Promise~void~
}
class AuthProvider {
+children : ReactNode
}
class useAuth {
+returns AuthContextType
}
AuthProvider --> AuthContextType : "provides"
useAuth --> AuthContextType : "consumes"
```

**Diagram sources**
- [AuthContext.tsx:5-15](file://frontend/src/context/AuthContext.tsx#L5-L15)
- [AuthContext.tsx:17-82](file://frontend/src/context/AuthContext.tsx#L17-L82)

**Section sources**
- [AuthContext.tsx:1-82](file://frontend/src/context/AuthContext.tsx#L1-L82)

### Layouts and UI Shell
- User Layout: Desktop sidebar with navigation, mobile header with hamburger menu, bottom nav for quick actions, and main content area. Uses active route detection and responsive breakpoints.
- Admin Layout: Fixed dark sidebar with admin navigation and logout flow clearing admin token.

```mermaid
graph LR
subgraph "User Area"
UL["Layout.tsx"]
LP["Pages (Dashboard, Vehicles, Claims, Policies, Profile)"]
end
subgraph "Admin Area"
AL["AdminLayout.tsx"]
AP["Admin Pages (Dashboard, Users, Claims, Documents)"]
end
UL --> LP
AL --> AP
```

**Diagram sources**
- [Layout.tsx:14-176](file://frontend/src/components/Layout.tsx#L14-L176)
- [AdminLayout.tsx:11-74](file://frontend/src/components/AdminLayout.tsx#L11-L74)

**Section sources**
- [Layout.tsx:1-176](file://frontend/src/components/Layout.tsx#L1-L176)
- [AdminLayout.tsx:1-74](file://frontend/src/components/AdminLayout.tsx#L1-L74)

### API Integration Patterns
- Base URLs: User API at /api, Admin API at /api/admin.
- Request Interceptors: Attach Bearer token from localStorage; set Content-Type unless FormData.
- Response Interceptors: On 401/403, clear tokens and redirect to appropriate login pages.
- Usage: Pages call service methods directly; AuthContext performs auth flows.

```mermaid
sequenceDiagram
participant Page as "Page"
participant Api as "api.ts"
participant AdminApi as "adminApi.ts"
participant Backend as "Backend"
Page->>Api : GET /vehicles
Api->>Api : Interceptor adds Authorization
Api->>Backend : HTTP GET
Backend-->>Api : JSON or 401
alt 401
Api->>Api : Clear tokens and redirect
else OK
Api-->>Page : Data
end
Page->>AdminApi : GET /admin/...
AdminApi->>AdminApi : Interceptor adds Authorization
AdminApi->>Backend : HTTP GET
Backend-->>AdminApi : JSON or 401/403
alt 401/403
AdminApi->>AdminApi : Clear adminToken and redirect
else OK
AdminApi-->>Page : Data
end
```

**Diagram sources**
- [api.ts:1-36](file://frontend/src/services/api.ts#L1-L36)
- [adminApi.ts:1-26](file://frontend/src/services/adminApi.ts#L1-L26)

**Section sources**
- [api.ts:1-36](file://frontend/src/services/api.ts#L1-L36)
- [adminApi.ts:1-26](file://frontend/src/services/adminApi.ts#L1-L26)

### Centralized URL Resolution Utilities
- uploadUrl Function: Centralized utility for resolving stored upload paths to full URLs.
- Environment Handling: Automatically handles differences between development (Vite proxy) and production (Railway backend).
- Absolute Path Support: Preserves already absolute URLs without modification.
- Null Safety: Handles null, undefined, and empty string inputs gracefully.

The uploadUrl utility addresses environment-specific differences:
- Development: Uses Vite proxy to forward /uploads → localhost:5000, so relative paths work as-is.
- Production: Prepends VITE_API_URL (Railway backend origin) so browser fetches files directly from Railway, not from Vercel.

```mermaid
flowchart TD
Input["filePath input"] --> CheckNull{"Is filePath null/undefined?"}
CheckNull --> |Yes| Empty["Return empty string"]
CheckNull --> |No| CheckAbsolute{"Starts with http?"}
CheckAbsolute --> |Yes| ReturnAbs["Return as-is (absolute URL)"]
CheckAbsolute --> |No| Resolve["Resolve with API_ORIGIN"]
Resolve --> Dev{"Development mode?"}
Dev --> |Yes| Relative["Use relative path (Vite proxy)"]
Dev --> |No| FullURL["Prepend VITE_API_URL"]
Relative --> Output["Resolved URL"]
FullURL --> Output
ReturnAbs --> Output
Empty --> Output
```

**Diagram sources**
- [uploadUrl.ts:11-15](file://frontend/src/utils/uploadUrl.ts#L11-L15)
- [vite.config.ts:16-26](file://frontend/vite.config.ts#L16-L26)

**Section sources**
- [uploadUrl.ts:1-16](file://frontend/src/utils/uploadUrl.ts#L1-L16)
- [vite.config.ts:16-26](file://frontend/vite.config.ts#L16-L26)

### File Upload Integration in Components
Components integrate the uploadUrl utility for displaying uploaded files:
- ClaimDetailPage: Uses uploadUrl for claim images and document thumbnails.
- AdminClaimDetailPage: Uses uploadUrl for damage assessment images and document previews.
- AdminDocumentsPage: Uses uploadUrl for document thumbnails in the review interface.

```mermaid
sequenceDiagram
participant Component as "Component"
participant UploadUrl as "uploadUrl"
participant Browser as "Browser"
Component->>UploadUrl : uploadUrl(img.filePath)
UploadUrl->>UploadUrl : Check if absolute URL
UploadUrl->>UploadUrl : Resolve with API_ORIGIN
UploadUrl-->>Component : Resolved URL
Component->>Browser : <img src={resolvedUrl}>
Browser->>Browser : Load image from resolved URL
```

**Diagram sources**
- [ClaimDetailPage.tsx:180](file://frontend/src/pages/ClaimDetailPage.tsx#L180)
- [AdminClaimDetailPage.tsx:215](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L215)
- [AdminDocumentsPage.tsx:116](file://frontend/src/pages/admin/AdminDocumentsPage.tsx#L116)
- [uploadUrl.ts:11-15](file://frontend/src/utils/uploadUrl.ts#L11-L15)

**Section sources**
- [ClaimDetailPage.tsx:180](file://frontend/src/pages/ClaimDetailPage.tsx#L180)
- [AdminClaimDetailPage.tsx:215](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L215)
- [AdminDocumentsPage.tsx:116](file://frontend/src/pages/admin/AdminDocumentsPage.tsx#L116)

### Styling Approach and Responsive Design
- Tailwind CSS v4 via @tailwindcss/vite plugin.
- Custom theme colors defined in index.css for primary, danger, success, warning palettes.
- Responsive utilities used throughout layouts (hidden lg:flex, sm:p-6, etc.).
- Consistent spacing, typography, and color usage across components.

**Section sources**
- [vite.config.ts:1-21](file://frontend/vite.config.ts#L1-L21)
- [index.css:1-39](file://frontend/src/index.css#L1-L39)
- [Layout.tsx:25-173](file://frontend/src/components/Layout.tsx#L25-L173)
- [AdminLayout.tsx:28-70](file://frontend/src/components/AdminLayout.tsx#L28-L70)

### Accessibility Considerations
- Semantic HTML elements (nav, main, aside).
- Keyboard-friendly interactive elements (links, buttons).
- Focus indicators via Tailwind focus classes.
- Descriptive labels and accessible icons paired with text where needed.
- Consider adding ARIA attributes for dynamic overlays (mobile sidebar) and status messages.

[No sources needed since this section provides general guidance]

### Error Handling and Boundaries
- Axios response interceptors handle 401/403 by clearing tokens and redirecting to login.
- Page-level try/catch blocks display user-friendly errors (e.g., LoginPage).
- Loading states prevent race conditions during auth initialization.
- Note: No explicit React ErrorBoundary wrapper is present in the analyzed files; consider adding one for unhandled exceptions.

**Section sources**
- [api.ts:22-33](file://frontend/src/services/api.ts#L22-L33)
- [adminApi.ts:14-23](file://frontend/src/services/adminApi.ts#L14-L23)
- [LoginPage.tsx:14-27](file://frontend/src/pages/LoginPage.tsx#L14-L27)
- [ProtectedRoute.tsx:7-13](file://frontend/src/components/ProtectedRoute.tsx#L7-L13)

### Build Configuration and Development Workflow
- Vite dev server with proxy rules for /api and /uploads to backend at localhost:5000.
- Scripts: dev, build (TypeScript check then Vite build), lint, preview.
- Plugins: React and Tailwind CSS integrated via Vite plugins.
- Entry: index.html loads main.tsx which mounts React app into #root.
- Environment variables: VITE_API_URL configured for different deployment targets.

**Section sources**
- [vite.config.ts:1-21](file://frontend/vite.config.ts#L1-L21)
- [package.json:6-10](file://frontend/package.json#L6-L10)
- [index.html:1-14](file://frontend/index.html#L1-L14)
- [main.tsx:1-11](file://frontend/src/main.tsx#L1-L11)

## Dependency Analysis
High-level dependencies among core modules:

```mermaid
graph TB
App["App.tsx"] --> Auth["AuthContext.tsx"]
App --> PR["ProtectedRoute.tsx"]
App --> APR["AdminProtectedRoute.tsx"]
App --> L["Layout.tsx"]
App --> AL["AdminLayout.tsx"]
Pages["Pages"] --> Auth
Pages --> API["api.ts"]
Pages --> AAPI["adminApi.ts"]
Pages --> Utils["uploadUrl.ts"]
Auth --> API
PR --> Auth
APR --> LocalStorage["localStorage"]
API --> Types["types/index.ts"]
AAPI --> Types
Utils --> Types
```

**Diagram sources**
- [App.tsx:1-56](file://frontend/src/App.tsx#L1-L56)
- [AuthContext.tsx:1-82](file://frontend/src/context/AuthContext.tsx#L1-L82)
- [ProtectedRoute.tsx:1-21](file://frontend/src/components/ProtectedRoute.tsx#L1-L21)
- [AdminProtectedRoute.tsx:1-8](file://frontend/src/components/AdminProtectedRoute.tsx#L1-L8)
- [Layout.tsx:1-176](file://frontend/src/components/Layout.tsx#L1-L176)
- [AdminLayout.tsx:1-74](file://frontend/src/components/AdminLayout.tsx#L1-L74)
- [api.ts:1-36](file://frontend/src/services/api.ts#L1-L36)
- [adminApi.ts:1-26](file://frontend/src/services/adminApi.ts#L1-L26)
- [uploadUrl.ts:1-16](file://frontend/src/utils/uploadUrl.ts#L1-L16)
- [types/index.ts:1-150](file://frontend/src/types/index.ts#L1-L150)

**Section sources**
- [App.tsx:1-56](file://frontend/src/App.tsx#L1-L56)
- [types/index.ts:1-150](file://frontend/src/types/index.ts#L1-L150)

## Performance Considerations
- Use code splitting and lazy loading for heavy pages to reduce initial bundle size.
- Leverage React.memo for expensive components when necessary.
- Debounce search inputs and pagination for large lists.
- Optimize images and assets; consider lazy loading images.
- Keep network requests minimal; batch where possible.
- Monitor bundle size and tree-shaking effectiveness.
- Centralized URL resolution reduces redundant logic across components.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Unauthorized redirects: Occur when backend returns 401/403; tokens are cleared and user redirected to login. Verify token presence and expiration handling.
- CORS or proxy misconfiguration: Ensure Vite dev proxy targets match backend endpoints. Confirm changeOrigin settings.
- Form submission errors: Check try/catch blocks and error messages displayed in UI. Validate input fields and required attributes.
- Mobile sidebar not closing: Ensure overlay click handlers are bound and state toggles correctly.
- Image loading issues: Verify uploadUrl is properly imported and filePath values are correct. Check environment variable configuration for production deployments.

**Section sources**
- [api.ts:22-33](file://frontend/src/services/api.ts#L22-L33)
- [adminApi.ts:14-23](file://frontend/src/services/adminApi.ts#L14-L23)
- [LoginPage.tsx:14-27](file://frontend/src/pages/LoginPage.tsx#L14-L27)
- [vite.config.ts:8-19](file://frontend/vite.config.ts#L8-L19)
- [uploadUrl.ts:11-15](file://frontend/src/utils/uploadUrl.ts#L11-L15)

## Conclusion
The frontend is structured around a clear separation of concerns: routing and layout orchestration, centralized authentication state, robust API integration with interceptors, centralized URL resolution utilities for file uploads, and consistent styling with Tailwind CSS. The modular design supports scalability and maintainability. Adding error boundaries and further performance optimizations will enhance resilience and user experience.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Key Data Models
- User, Vehicle, InsurancePolicy, Claim, Document, ChatMessage, and related types define the domain model used across pages and services.

**Section sources**
- [types/index.ts:1-150](file://frontend/src/types/index.ts#L1-L150)

### Example Page Workflows

#### Dashboard Data Fetch
```mermaid
sequenceDiagram
participant D as "DashboardPage"
participant A as "api.ts"
participant S as "Server"
D->>D : useEffect mount
D->>A : GET /vehicles
D->>A : GET /claims
A->>S : HTTP requests
S-->>A : JSON arrays
A-->>D : Data
D->>D : Set state and render
```

**Diagram sources**
- [DashboardPage.tsx:14-27](file://frontend/src/pages/DashboardPage.tsx#L14-L27)
- [api.ts:1-36](file://frontend/src/services/api.ts#L1-L36)

**Section sources**
- [DashboardPage.tsx:1-142](file://frontend/src/pages/DashboardPage.tsx#L1-L142)

### Upload URL Resolution Examples

#### Image Display Pattern
```mermaid
sequenceDiagram
participant Component as "Image Component"
participant UploadUrl as "uploadUrl"
participant Env as "Environment"
Component->>UploadUrl : uploadUrl(imagePath)
UploadUrl->>Env : Check VITE_API_URL
alt Development
Env-->>UploadUrl : Empty string (use proxy)
else Production
Env-->>UploadUrl : Railway backend URL
end
UploadUrl->>UploadUrl : Prepend API_ORIGIN if needed
UploadUrl-->>Component : Resolved URL
Component->>Component : Render <img src={resolvedUrl}>
```

**Diagram sources**
- [uploadUrl.ts:9-15](file://frontend/src/utils/uploadUrl.ts#L9-L15)
- [vite.config.ts:16-26](file://frontend/vite.config.ts#L16-L26)

**Section sources**
- [uploadUrl.ts:1-16](file://frontend/src/utils/uploadUrl.ts#L1-L16)
- [ClaimDetailPage.tsx:180](file://frontend/src/pages/ClaimDetailPage.tsx#L180)
- [AdminClaimDetailPage.tsx:215](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L215)
- [AdminDocumentsPage.tsx:116](file://frontend/src/pages/admin/AdminDocumentsPage.tsx#L116)