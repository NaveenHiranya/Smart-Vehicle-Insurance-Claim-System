# Garage Management System

<cite>
**Referenced Files in This Document**
- [index.ts](file://backend/src/index.ts)
- [schema.prisma](file://backend/prisma/schema.prisma)
- [claims.ts](file://backend/src/routes/claims.ts)
- [garage.ts](file://backend/src/routes/garage.ts)
- [admin.ts](file://backend/src/routes/admin.ts)
- [auth.ts](file://backend/src/middleware/auth.ts)
- [claimAssistantService.ts](file://backend/src/services/claimAssistantService.ts)
- [payoutService.ts](file://backend/src/services/payoutService.ts)
- [GarageClaimDetailPage.tsx](file://frontend/src/pages/garage/GarageClaimDetailPage.tsx)
- [garageEstimate.ts](file://frontend/src/utils/garageEstimate.ts)
- [index.ts (types)](file://frontend/src/types/index.ts)
- [App.tsx](file://frontend/src/App.tsx)
- [Layout.tsx](file://frontend/src/components/Layout.tsx)
- [AuthContext.tsx](file://frontend/src/context/AuthContext.tsx)
- [api.ts](file://frontend/src/services/api.ts)
- [package.json (backend)](file://backend/package.json)
- [package.json (frontend)](file://frontend/package.json)
</cite>

## Update Summary
**Changes Made**
- Enhanced garage estimate editor with new estimateDate field support
- Improved validation logic for both legacy array-based and modern object-based estimate formats
- Enhanced backend API endpoints for handling optional estimate dates with proper date parsing and validation
- Updated frontend components to support editable estimate dates with proper formatting
- Added comprehensive date validation and error handling in backend processing

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
This document describes the Garage Management System, a full-stack application for managing vehicle insurance claims with roles for policyholders, garages, and administrators. The system supports claim creation, AI-assisted damage analysis, repair estimates with enhanced date tracking, document verification, chat assistance, and administrative oversight including garage approvals. It is built with an Express backend, Prisma ORM with SQLite, and a React frontend using Vite and Tailwind CSS.

## Project Structure
The repository is organized into two main parts:
- Backend (Express + TypeScript + Prisma): API endpoints, middleware, services, and database schema.
- Frontend (React + TypeScript + Vite): Routing, protected routes, context-based authentication, and UI layouts.

```mermaid
graph TB
subgraph "Frontend"
FE_App["App.tsx"]
FE_Layout["Layout.tsx"]
FE_Auth["AuthContext.tsx"]
FE_API["api.ts"]
FE_GarageUI["GarageClaimDetailPage.tsx"]
FE_EstimateUtils["garageEstimate.ts"]
end
subgraph "Backend"
BE_Index["index.ts"]
BE_Routes_Claims["routes/claims.ts"]
BE_Routes_Garage["routes/garage.ts"]
BE_Routes_Admin["routes/admin.ts"]
BE_Middleware_Auth["middleware/auth.ts"]
BE_Service_Chat["services/claimAssistantService.ts"]
BE_Service_Payout["services/payoutService.ts"]
BE_Schema["prisma/schema.prisma"]
end
FE_App --> FE_Layout
FE_App --> FE_Auth
FE_Layout --> FE_API
FE_Auth --> FE_API
FE_GarageUI --> FE_EstimateUtils
FE_API --> BE_Index
BE_Index --> BE_Routes_Claims
BE_Index --> BE_Routes_Garage
BE_Index --> BE_Routes_Admin
BE_Routes_Claims --> BE_Middleware_Auth
BE_Routes_Garage --> BE_Middleware_Auth
BE_Routes_Admin --> BE_Middleware_Auth
BE_Routes_Claims --> BE_Service_Chat
BE_Routes_Garage --> BE_Service_Payout
BE_Routes_Claims --> BE_Schema
BE_Routes_Garage --> BE_Schema
BE_Routes_Admin --> BE_Schema
```

**Diagram sources**
- [index.ts:28-51](file://backend/src/index.ts#L28-L51)
- [App.tsx:30-66](file://frontend/src/App.tsx#L30-L66)
- [Layout.tsx:15-177](file://frontend/src/components/Layout.tsx#L15-L177)
- [AuthContext.tsx:17-73](file://frontend/src/context/AuthContext.tsx#L17-L73)
- [api.ts:7-24](file://frontend/src/services/api.ts#L7-L24)
- [GarageClaimDetailPage.tsx:1-403](file://frontend/src/pages/garage/GarageClaimDetailPage.tsx#L1-L403)
- [garageEstimate.ts:1-49](file://frontend/src/utils/garageEstimate.ts#L1-L49)
- [schema.prisma:10-256](file://backend/prisma/schema.prisma#L10-L256)

**Section sources**
- [index.ts:1-71](file://backend/src/index.ts#L1-L71)
- [App.tsx:1-71](file://frontend/src/App.tsx#L1-L71)
- [schema.prisma:1-256](file://backend/prisma/schema.prisma#L1-L256)

## Core Components
- Authentication and Authorization: JWT-based middleware protects user, garage, and admin routes.
- Claims Management: Create, update, submit, list, and retrieve claims; upload images and documents; trigger AI analysis and estimates; chat assistant per claim.
- **Enhanced Garage Portal**: List assigned claims, view details, and submit repair estimates with optional estimate dates; require prior AI damage assessment; updates claim status accordingly.
- Admin Portal: Dashboard stats, user management, claim oversight, document approval/rejection, garage approval/toggle.
- Data Layer: Prisma models define users, vehicles, policies, claims, assessments, estimates, payouts, documents, messages, notes, garages, and garage estimates with enhanced date tracking.

**Section sources**
- [auth.ts:5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [claims.ts:38-476](file://backend/src/routes/claims.ts#L38-L476)
- [garage.ts:11-163](file://backend/src/routes/garage.ts#L11-L163)
- [admin.ts:11-299](file://backend/src/routes/admin.ts#L11-L299)
- [schema.prisma:10-256](file://backend/prisma/schema.prisma#L10-L256)

## Architecture Overview
The system follows a layered architecture:
- Frontend pages and components call a centralized Axios client that injects auth tokens and handles 401 redirects.
- Backend Express app mounts route modules under /api namespaces.
- Route handlers enforce role-based access via middleware and delegate to Prisma for data operations.
- Services encapsulate AI-driven features like damage analysis and chat responses.
- **Enhanced Estimate Processing**: Backend validates both legacy array-based and modern object-based estimate formats with optional date fields.

```mermaid
sequenceDiagram
participant FE as "Frontend App"
participant API as "Axios Client"
participant BE as "Express Server"
participant MW as "Auth Middleware"
participant RT as "Garage Routes"
participant SVC as "Payout Service"
participant DB as "Prisma/SQLite"
FE->>API : POST /api/garage/claims/ : id/estimate
API->>BE : HTTP request with Bearer token & estimate data
BE->>MW : Validate token
MW-->>BE : userId attached
BE->>RT : Handle estimate submission
RT->>RT : Validate estimate format (array/object)
RT->>RT : Parse & validate estimateDate (optional)
RT->>DB : Create/Update GarageEstimate with date
RT->>SVC : Recalculate payout based on estimate
SVC->>DB : Update InsurancePayout
DB-->>RT : Success
RT-->>BE : 201 JSON
BE-->>API : Response
API-->>FE : Render success state
```

**Diagram sources**
- [api.ts:11-24](file://frontend/src/services/api.ts#L11-L24)
- [index.ts:43-51](file://backend/src/index.ts#L43-L51)
- [auth.ts:5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [garage.ts:69-163](file://backend/src/routes/garage.ts#L69-L163)
- [payoutService.ts:11-67](file://backend/src/services/payoutService.ts#L11-L67)
- [schema.prisma:283-300](file://backend/prisma/schema.prisma#L283-L300)

## Detailed Component Analysis

### Enhanced Garage Estimate Module
Responsibilities:
- List and view claims assigned to the authenticated garage.
- Submit or update repair estimates with optional estimate dates; require prior AI damage assessment.
- Support both legacy array-based and modern object-based estimate formats.
- Validate estimate dates with proper parsing and error handling.
- Update claim status to GARAGE_ESTIMATED upon estimate submission.
- Recalculate insurance payouts based on garage estimates.

**Updated** Enhanced with optional estimate date field support and improved validation logic for multiple estimate formats.

```mermaid
flowchart TD
Start(["Submit Estimate"]) --> CheckAssessment{"AI Assessment Exists?"}
CheckAssessment --> |No| ErrAssess["Return error: need assessment"]
CheckAssessment --> |Yes| ParseItems{"Parse Items Format"}
ParseItems --> ArrayFormat["Legacy Array Format"]
ParseItems --> ObjectFormat["Modern Object Format"]
ArrayFormat --> ExtractParts["Extract parts from array"]
ObjectFormat --> ExtractPartsObj["Extract parts from object"]
ExtractParts --> ValidateCosts{"Has Parts/Labor/Paint?"}
ExtractPartsObj --> ValidateCosts
ValidateCosts --> |No| ErrCosts["Return error: need costs"]
ValidateCosts --> |Yes| ParseDate{"Has Estimate Date?"}
ParseDate --> |Yes| ValidateDate["Validate Date Format"]
ParseDate --> |No| UseCurrent["Use Current Date"]
ValidateDate --> |Invalid| ErrDate["Return error: invalid date"]
ValidateDate --> |Valid| SetDate["Set Parsed Date"]
UseCurrent --> SaveEstimate["Save Estimate"]
SetDate --> SaveEstimate
SaveEstimate --> UpdateStatus["Update Claim Status"]
UpdateStatus --> RecalcPayout["Recalculate Payout"]
RecalcPayout --> Done(["Estimate Submitted"])
```

**Diagram sources**
- [garage.ts:69-163](file://backend/src/routes/garage.ts#L69-L163)

**Section sources**
- [garage.ts:1-163](file://backend/src/routes/garage.ts#L1-L163)

### Enhanced Frontend Estimate Editor
Features:
- Editable estimate date field with default current date.
- Support for both legacy and modern estimate data structures.
- Real-time cost calculations and validation.
- Proper date formatting when submitting to backend.
- Display of existing estimate dates when revising estimates.

**Updated** Added estimate date field with proper formatting and validation.

```mermaid
sequenceDiagram
participant UI as "Garage UI"
participant Utils as "Estimate Utils"
participant API as "Garage API"
participant BE as "Backend"
UI->>UI : Load claim with existing estimate
UI->>Utils : normalizeGarageItems(items)
Utils-->>UI : Structured estimate data
UI->>UI : Set estimateDate (existing or today)
UI->>UI : User edits estimate & date
UI->>API : POST estimate with formatted date
API->>BE : Send {items, estimateDate}
BE->>BE : Validate & parse estimateDate
BE-->>API : Success response
API-->>UI : Update UI with new estimate
```

**Diagram sources**
- [GarageClaimDetailPage.tsx:19-94](file://frontend/src/pages/garage/GarageClaimDetailPage.tsx#L19-L94)
- [garageEstimate.ts:17-49](file://frontend/src/utils/garageEstimate.ts#L17-L49)

**Section sources**
- [GarageClaimDetailPage.tsx:1-403](file://frontend/src/pages/garage/GarageClaimDetailPage.tsx#L1-L403)
- [garageEstimate.ts:1-49](file://frontend/src/utils/garageEstimate.ts#L1-L49)

### Enhanced Validation Logic
The system now supports multiple estimate formats:

**Legacy Array Format:**
- Labor hours, labor rate, and paint materials stored on each item
- Normalized to modern structure during processing

**Modern Object Format:**
- Separate parts array with single labor line and paint/materials line
- Direct mapping to database structure

**Date Validation:**
- Optional estimate date field with proper ISO string parsing
- Fallback to current date when no date provided
- Comprehensive error handling for invalid date formats

**Section sources**
- [garage.ts:89-115](file://backend/src/routes/garage.ts#L89-L115)
- [garageEstimate.ts:17-39](file://frontend/src/utils/garageEstimate.ts#L17-L39)

### Claims Module
Responsibilities:
- CRUD for claims with ownership checks.
- Image and document uploads with file storage paths.
- Submitting claims triggers background AI damage analysis and sets appropriate status based on garage assignment.
- Repair estimate generation requires prior damage assessment.
- Per-claim chat assistant integrates claim context and conversation history.

Key flows:
- Create claim: validates required fields, ensures vehicle ownership, persists claim.
- Submit claim: enforces minimum images, transitions status to SUBMITTED or GARAGE_REVIEW, starts background analysis.
- Upload images/documents: stores files and records metadata.
- Analyze damage: invokes service to process images and produce assessment.
- Generate estimate: depends on existing damage assessment.
- Chat: builds context from claim data and recent messages, calls AI assistant, persists messages.

```mermaid
flowchart TD
Start(["Submit Claim"]) --> CheckImages{"At least one image?"}
CheckImages --> |No| ErrImg["Return error: need images"]
CheckImages --> |Yes| CheckGarage{"Garage assigned?"}
CheckGarage --> |Yes| SetGR["Set status = GARAGE_REVIEW"]
CheckGarage --> |No| SetSUB["Set status = SUBMITTED"]
SetGR --> BGAnalyze["Start background damage analysis"]
SetSUB --> BGAnalyze
BGAnalyze --> Done(["Claim submitted"])
```

**Diagram sources**
- [claims.ts:175-218](file://backend/src/routes/claims.ts#L175-L218)

**Section sources**
- [claims.ts:17-476](file://backend/src/routes/claims.ts#L17-L476)

### Admin Module
Responsibilities:
- Dashboard statistics: user counts, claims grouped by status, document counts and pending verifications.
- User listing with counts of vehicles and claims.
- Claims listing with search and filters; detailed view including all related entities.
- Status transitions for claims.
- Document approval/rejection workflow.
- Garage management: list, approve, toggle active status.

```mermaid
flowchart TD
AStart(["Admin Action"]) --> AType{"Action Type"}
AType --> |Stats| AStats["Aggregate counts and group by status"]
AType --> |Users| AUsers["List non-admin users with counts"]
AType --> |Claims| AClaims["Filter/search claims with includes"]
AType --> |Documents| ADocs["List docs by verificationStatus"]
AType --> |Garages| AGarages["List garages with counts"]
AStats --> AReturn["JSON response"]
AUsers --> AReturn
AClaims --> AReturn
ADocs --> AReturn
AGarages --> AReturn
```

**Diagram sources**
- [admin.ts:11-299](file://backend/src/routes/admin.ts#L11-L299)

**Section sources**
- [admin.ts:1-300](file://backend/src/routes/admin.ts#L1-L300)

### Authentication and Authorization
- JWT middleware validates bearer tokens and attaches userId to requests.
- Protected routes use this middleware to ensure only authenticated users can access resources.
- Frontend Axios interceptor adds Authorization header and redirects on 401.

```mermaid
sequenceDiagram
participant FE as "Frontend"
participant API as "Axios"
participant BE as "Express"
participant MW as "Auth Middleware"
FE->>API : Request with stored token
API->>BE : Add Authorization header
BE->>MW : Verify token
MW-->>BE : Attach userId or return 401
BE-->>FE : Authorized response or redirect
```

**Diagram sources**
- [auth.ts:5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [api.ts:11-36](file://frontend/src/services/api.ts#L11-L36)

**Section sources**
- [auth.ts:1-23](file://backend/src/middleware/auth.ts#L1-L23)
- [api.ts:1-40](file://frontend/src/services/api.ts#L1-L40)

### AI Chat Assistant
- Builds rich context from claim data (vehicle, policy, damage assessment, estimates, payout, documents).
- Maintains conversation history per claim and persists both user and assistant messages.
- Uses a fallback-enabled chat utility to handle model availability.

```mermaid
sequenceDiagram
participant UI as "Claim Detail UI"
participant SVC as "Chat Service"
participant DB as "Prisma"
participant AI as "Gemini Chat"
UI->>SVC : Send message with claimId
SVC->>DB : Load claim + related data + last 20 messages
SVC->>AI : startChatWithFallback(context + history)
AI-->>SVC : Model used + sendMessage result
SVC->>DB : Save USER message
SVC->>DB : Save ASSISTANT message
SVC-->>UI : Return both messages
```

**Diagram sources**
- [claimAssistantService.ts:20-128](file://backend/src/services/claimAssistantService.ts#L20-L128)

**Section sources**
- [claimAssistantService.ts:1-128](file://backend/src/services/claimAssistantService.ts#L1-L128)

### Enhanced Data Models and Relationships
The Prisma schema defines the core entities and relationships with enhanced date tracking:
- Users, Vehicles, Insurance Policies, Claims, Garages.
- Supporting entities: ClaimImage, DamageAssessment, RepairEstimate, InsurancePayout, Document, ChatMessage, AdminNote, GarageEstimate with optional estimateDate field.
- Enums standardize statuses and types across the system.

**Updated** Enhanced GarageEstimate model with optional estimateDate field for tracking when estimates apply.

```mermaid
erDiagram
USER {
string id PK
string email UK
boolean isAdmin
datetime createdAt
}
VEHICLE {
string id PK
string userId FK
string make
string model
int year
string licensePlate
}
INSURANCE_POLICY {
string id PK
string userId FK
string providerName
string policyNumber
float deductible
datetime startDate
datetime endDate
}
CLAIM {
string id PK
string userId FK
string vehicleId FK
string policyId FK
enum status
datetime incidentDate
string incidentLocation
string incidentDescription
}
GARAGE {
string id PK
string email UK
string name
boolean isActive
boolean isApproved
}
CLAIM_IMAGE {
string id PK
string claimId FK
enum type
string filePath
}
DAMAGE_ASSESSMENT {
string id PK
string claimId FK
json damages
enum overallSeverity
}
REPAIR_ESTIMATE {
string id PK
string claimId FK
json items
float totalCost
int estimatedDays
}
INSURANCE_PAYOUT {
string id PK
string claimId FK
float deductible
float coveredAmount
float estimatedPayout
}
DOCUMENT {
string id PK
string claimId FK
enum type
enum verificationStatus
}
CHAT_MESSAGE {
string id PK
string claimId FK
enum role
string content
}
ADMIN_NOTE {
string id PK
string claimId FK
string category
string content
}
GARAGE_ESTIMATE {
string id PK
string claimId FK
string garageId FK
json items
float totalPartsCost
float totalLaborCost
float totalCost
int estimatedDays
string notes
datetime estimateDate
datetime submittedAt
}
USER ||--o{ VEHICLE : owns
USER ||--o{ INSURANCE_POLICY : holds
USER ||--o{ CLAIM : submits
VEHICLE ||--o{ CLAIM : involved_in
INSURANCE_POLICY ||--o{ CLAIM : covers
GARAGE ||--o{ CLAIM : reviews
CLAIM ||--o{ CLAIM_IMAGE : has
CLAIM ||--|| DAMAGE_ASSESSMENT : has
CLAIM ||--|| REPAIR_ESTIMATE : has
CLAIM ||--|| INSURANCE_PAYOUT : has
CLAIM ||--o{ DOCUMENT : contains
CLAIM ||--o{ CHAT_MESSAGE : contains
CLAIM ||--o{ ADMIN_NOTE : has
GARAGE ||--o{ GARAGE_ESTIMATE : submits
```

**Diagram sources**
- [schema.prisma:10-300](file://backend/prisma/schema.prisma#L10-L300)

**Section sources**
- [schema.prisma:1-300](file://backend/prisma/schema.prisma#L1-L300)

## Dependency Analysis
- Frontend dependencies: React, React Router, Axios, Tailwind, Vite.
- Backend dependencies: Express, Prisma, JWT, Multer, Zod, Google Generative AI, bcryptjs.
- Routing layer: index.ts wires route modules to URL prefixes.
- Middleware layer: auth.ts secures routes; other middleware (upload, error handling) support specific features.
- Services layer: claimAssistantService orchestrates AI interactions and persistence; payoutService recalculates insurance payouts.

**Updated** Enhanced dependency structure with improved estimate processing services.

```mermaid
graph LR
FE["Frontend (React/Vite)"] --> API["Axios Client"]
API --> BE["Express Server"]
BE --> MW["Auth Middleware"]
BE --> RT["Routes (claims/garage/admin)"]
RT --> PR["Prisma Client"]
RT --> SV["Services (chat, damage, estimate)"]
SV --> AI["Gemini API"]
PR --> DB["SQLite Database"]
RT --> PS["Payout Service"]
PS --> DB
```

**Diagram sources**
- [package.json (frontend):12-29](file://frontend/package.json#L12-L29)
- [package.json (backend):20-31](file://backend/package.json#L20-L31)
- [index.ts:28-64](file://backend/src/index.ts#L28-L64)

**Section sources**
- [package.json (frontend):1-32](file://frontend/package.json#L1-L32)
- [package.json (backend):1-44](file://backend/package.json#L1-L44)
- [index.ts:1-71](file://backend/src/index.ts#L1-L71)

## Performance Considerations
- Background processing: Damage analysis is triggered asynchronously to avoid blocking claim submission.
- Query optimization: Use selective field inclusion to reduce payload sizes (e.g., selecting only needed fields for lists).
- File uploads: Enforce reasonable limits and consider offloading large files to object storage in production.
- Caching: Consider caching frequent reads (e.g., garage listings) if traffic increases.
- Database: For high concurrency, migrate from SQLite to a relational database with proper indexing on foreign keys and frequently filtered columns.
- **Enhanced Processing**: Efficient parsing of multiple estimate formats reduces validation overhead.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Missing environment variables: Ensure JWT_SECRET, GEMINI_API_KEY, DATABASE_URL are set before starting the server.
- CORS errors: Configure CORS_ORIGIN appropriately for your frontend origin.
- 401 Unauthorized: Verify token presence and validity; frontend clears token and redirects on 401.
- Upload failures: Confirm UPLOAD_DIR exists and is writable; check multer configuration and file size limits.
- AI service errors: Implement retries and fallbacks; log model usage and errors for diagnostics.
- **Enhanced Error Handling**: Invalid estimate dates now return proper 400 errors with descriptive messages; both legacy and modern estimate formats are supported with appropriate validation.

**Updated** Added troubleshooting guidance for enhanced estimate date validation and format support.

**Section sources**
- [index.ts:18-25](file://backend/src/index.ts#L18-L25)
- [index.ts:31-41](file://backend/src/index.ts#L31-L41)
- [api.ts:26-36](file://frontend/src/services/api.ts#L26-L36)
- [claims.ts:220-258](file://backend/src/routes/claims.ts#L220-L258)
- [garage.ts:107-115](file://backend/src/routes/garage.ts#L107-L115)

## Conclusion
The Garage Management System provides a comprehensive platform for managing vehicle insurance claims with robust role-based access, AI-assisted workflows, and administrative oversight. Its modular backend and reactive frontend enable scalable feature development. Recent enhancements include improved garage estimate editing with optional date tracking, enhanced validation for multiple estimate formats, and better error handling for date parsing. Future enhancements may include advanced analytics, notifications, and migration to a cloud database for production scale.

**Updated** Enhanced conclusion reflecting recent improvements to estimate handling and validation capabilities.