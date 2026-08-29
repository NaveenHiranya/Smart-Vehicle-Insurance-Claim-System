# Claims Processing Workflow

<cite>
**Referenced Files in This Document**
- [claims.ts](file://backend/src/routes/claims.ts)
- [garage.ts](file://backend/src/routes/garage.ts)
- [admin.ts](file://backend/src/routes/admin.ts)
- [garageAuth.ts](file://backend/src/middleware/garageAuth.ts)
- [claimAssistantService.ts](file://backend/src/services/claimAssistantService.ts)
- [damageAnalysisService.ts](file://backend/src/services/damageAnalysisService.ts)
- [documentVerificationService.ts](file://backend/src/services/documentVerificationService.ts)
- [repairEstimateService.ts](file://backend/src/services/repairEstimateService.ts)
- [payoutService.ts](file://backend/src/services/payoutService.ts)
- [vehicleDetectionService.ts](file://backend/src/services/vehicleDetectionService.ts)
- [schema.prisma](file://backend/prisma/schema.prisma)
- [index.ts (types)](file://backend/src/types/index.ts)
- [NewClaimPage.tsx](file://frontend/src/pages/NewClaimPage.tsx)
- [GarageDashboardPage.tsx](file://frontend/src/pages/garage/GarageDashboardPage.tsx)
- [GarageClaimDetailPage.tsx](file://frontend/src/pages/garage/GarageClaimDetailPage.tsx)
- [AdminClaimDetailPage.tsx](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx)
</cite>

## Update Summary
**Changes Made**
- Added automatic policy linking when none is specified during claim creation
- Implemented intelligent search for most recent active policy
- Enhanced payout calculation service with complex business logic for deductibles, coverage percentages, and vehicle valuation caps
- Updated garage estimate submission to trigger automatic payout recalculation
- Improved frontend display of vehicle valuation cap information

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
This document describes the end-to-end insurance claim lifecycle implemented by the Smart Vehicle Insurance Claim System. It covers claim submission with validation and initial status assignment, AI-powered damage assessment using image analysis, automated repair estimate generation, document verification for authenticity and quality, and the overall workflow from submission to approval/rejection. The enhanced workflow now includes authorized garage participation through GARAGE_REVIEW and GARAGE_ESTIMATED statuses, allowing professional repair shops to assess damages and submit detailed estimates. It also explains how notifications and audit trails are maintained through chat logs and persisted records, and provides guidance for extending workflows and business rules.

## Project Structure
The system is organized into a backend API with services for AI-driven processing and a React frontend that guides users through claim creation and management. The enhanced workflow now includes dedicated garage interfaces and authentication.

```mermaid
graph TB
subgraph "Frontend"
NCP["NewClaimPage.tsx"]
GDP["GarageDashboardPage.tsx"]
GCDP["GarageClaimDetailPage.tsx"]
ADP["AdminClaimDetailPage.tsx"]
CDP["ClaimDetailPage.tsx"]
end
subgraph "Backend API"
R_CLAIMS["routes/claims.ts"]
R_GARAGE["routes/garage.ts"]
R_ADMIN["routes/admin.ts"]
M_AUTH["middleware/auth.ts"]
M_GARAGE["middleware/garageAuth.ts"]
M_UPLOAD["middleware/upload.ts"]
end
subgraph "Services"
S_DAM["services/damageAnalysisService.ts"]
S_EST["services/repairEstimateService.ts"]
S_DOC["services/documentVerificationService.ts"]
S_ASS["services/claimAssistantService.ts"]
S_VEH["services/vehicleDetectionService.ts"]
S_PAYOUT["services/payoutService.ts"]
end
subgraph "Data Layer"
DB["Prisma Client<br/>schema.prisma"]
end
NCP --> R_CLAIMS
GDP --> R_GARAGE
GCDP --> R_GARAGE
ADP --> R_ADMIN
CDP --> R_CLAIMS
R_CLAIMS --> S_DAM
R_CLAIMS --> S_EST
R_CLAIMS --> S_DOC
R_CLAIMS --> S_ASS
R_GARAGE --> DB
R_ADMIN --> DB
S_DAM --> DB
S_EST --> S_PAYOUT
S_DOC --> DB
S_ASS --> DB
S_VEH --> DB
S_PAYOUT --> DB
```

**Diagram sources**
- [claims.ts:1-554](file://backend/src/routes/claims.ts#L1-L554)
- [garage.ts:1-136](file://backend/src/routes/garage.ts#L1-L136)
- [admin.ts:1-300](file://backend/src/routes/admin.ts#L1-L300)
- [schema.prisma:1-282](file://backend/prisma/schema.prisma#L1-L282)
- [payoutService.ts:1-67](file://backend/src/services/payoutService.ts#L1-L67)

**Section sources**
- [claims.ts:1-554](file://backend/src/routes/claims.ts#L1-L554)
- [garage.ts:1-136](file://backend/src/routes/garage.ts#L1-L136)
- [admin.ts:1-300](file://backend/src/routes/admin.ts#L1-L300)
- [schema.prisma:1-282](file://backend/prisma/schema.prisma#L1-L282)

## Core Components
- **Enhanced Claim Submission and Validation**: Enforces required fields and ensures at least one image before submission; automatically links policies when none is specified; sets initial status to SUBMITTED or GARAGE_REVIEW depending on garage assignment.
- **Automatic Policy Linking**: When no policy is specified during claim creation, the system intelligently searches for the user's most recent active policy based on end date.
- **Enhanced Garage Integration**: Authorized garages can now participate in claim assessment through dedicated authentication and claim management interfaces.
- AI Damage Assessment: Analyzes uploaded images to identify damages, classify severity, and assess drivability.
- **Enhanced Repair Estimate Generation**: Computes itemized costs for parts, labor, and materials; calculates total cost and estimated repair days; derives insurance payout estimates with complex business logic including deductibles, coverage percentages, and vehicle valuation caps.
- **Garage Estimate Submission**: Professional repair shops can submit detailed estimates with itemized costs, labor hours, and repair timelines; triggers automatic payout recalculation.
- Document Verification: Validates uploaded documents for readability, completeness, and potential issues; updates verification status.
- AI Chat Assistant: Provides contextual responses about claim status, assessments, estimates, and next steps; persists conversation as an audit trail.
- Data Model: Defines claims, vehicles, policies, images, assessments, estimates, payouts, documents, chat messages, and garage relationships with relationships and enums.

**Section sources**
- [claims.ts:39-98](file://backend/src/routes/claims.ts#L39-L98)
- [claims.ts:253-296](file://backend/src/routes/claims.ts#L253-L296)
- [garage.ts:67-133](file://backend/src/routes/garage.ts#L67-L133)
- [damageAnalysisService.ts:50-153](file://backend/src/services/damageAnalysisService.ts#L50-L153)
- [repairEstimateService.ts:107-170](file://backend/src/services/repairEstimateService.ts#L107-L170)
- [payoutService.ts:11-67](file://backend/src/services/payoutService.ts#L11-L67)
- [documentVerificationService.ts:41-106](file://backend/src/services/documentVerificationService.ts#L41-L106)
- [claimAssistantService.ts:19-129](file://backend/src/services/claimAssistantService.ts#L19-L129)
- [schema.prisma:68-126](file://backend/prisma/schema.prisma#L68-L126)
- [schema.prisma:266-282](file://backend/prisma/schema.prisma#L266-L282)

## Architecture Overview
The claim workflow integrates user input, AI services, garage participation, and persistent storage to automate and assist claim processing with professional repair shop involvement and intelligent policy management.

```mermaid
sequenceDiagram
participant User as "User"
participant FE as "NewClaimPage.tsx"
participant API as "routes/claims.ts"
participant Garage as "Garage Interface"
participant DAM as "damageAnalysisService.ts"
participant EST as "repairEstimateService.ts"
participant PAYOUT as "payoutService.ts"
participant DOC as "documentVerificationService.ts"
participant ASS as "claimAssistantService.ts"
participant DB as "Prisma schema"
User->>FE : Fill incident info + upload photos + select garage
FE->>API : POST /claims (create draft with auto-linked policy)
API->>DB : Create Claim (status=DRAFT, auto-link policy if none specified)
FE->>API : POST /claims/ : id/images (attach images)
FE->>API : POST /claims/ : id/submit
API->>DB : Update Claim status=SUBMITTED or GARAGE_REVIEW
Note over API,DB : If garageId present -> GARAGE_REVIEW, else SUBMITTED
API->>DAM : analyzeDamage(claimId) [background]
DAM->>DB : Save DamageAssessment
DAM->>EST : generateRepairEstimate(claimId)
EST->>PAYOUT : recalculatePayout(claimId)
PAYOUT->>DB : Save InsurancePayout with complex calculations
Garage->>API : GET /garage/claims (assigned claims)
Garage->>API : POST /garage/claims/ : id/estimate (submit estimate)
API->>DB : Save GarageEstimate + Update status=GARAGE_ESTIMATED
API->>PAYOUT : recalculatePayout(claimId) [triggered by garage estimate]
User->>API : POST /claims/ : id/documents (upload docs)
API->>DOC : verifyDocument(docId)
DOC->>DB : Update Document verificationStatus
User->>API : GET/POST /claims/ : id/chat
API->>ASS : getChatResponse(claimId, message)
ASS->>DB : Persist ChatMessage (audit trail)
```

**Diagram sources**
- [claims.ts:39-98](file://backend/src/routes/claims.ts#L39-L98)
- [claims.ts:253-296](file://backend/src/routes/claims.ts#L253-L296)
- [garage.ts:67-133](file://backend/src/routes/garage.ts#L67-L133)
- [damageAnalysisService.ts:50-153](file://backend/src/services/damageAnalysisService.ts#L50-L153)
- [repairEstimateService.ts:107-170](file://backend/src/services/repairEstimateService.ts#L107-L170)
- [payoutService.ts:11-67](file://backend/src/services/payoutService.ts#L11-L67)
- [documentVerificationService.ts:41-106](file://backend/src/services/documentVerificationService.ts#L41-L106)
- [claimAssistantService.ts:19-129](file://backend/src/services/claimAssistantService.ts#L19-L129)
- [schema.prisma:68-126](file://backend/prisma/schema.prisma#L68-L126)

## Detailed Component Analysis

### Enhanced Claim Submission Process with Automatic Policy Linking
- Required fields: vehicleId, incidentDate, incidentLocation, incidentDescription. Optional fields include policyId, garageId, weatherConditions, hasPoliceReport.
- **Automatic Policy Linking**: When no policyId is provided during claim creation, the system automatically searches for the user's most recent active policy based on end date. If no active policy exists, it falls back to the most recent policy regardless of expiration status.
- **Policy Validation**: When a policyId is explicitly provided, the system validates that the policy belongs to the current user.
- Validation:
  - Backend validates required fields on create.
  - On submit, requires at least one image; otherwise returns an error.
- Initial status:
  - Created as DRAFT.
  - After successful submit, status transitions to SUBMITTED if no garage assigned, or GARAGE_REVIEW if garage is assigned.
- Background processing:
  - Submit triggers background AI damage analysis which auto-generates repair estimates and updates related records.

```mermaid
flowchart TD
Start(["Submit Claim"]) --> Validate["Validate required fields"]
Validate --> Valid{"All required fields present?"}
Valid --> |No| ErrFields["Return 400: Missing fields"]
Valid --> |Yes| CheckPolicy{"Policy specified?"}
CheckPolicy --> |No| AutoLink["Find most recent active policy"]
CheckPolicy --> |Yes| ValidatePolicy["Validate policy ownership"]
AutoLink --> SetPolicy["Set linkedPolicyId"]
ValidatePolicy --> HasPolicy{"Policy belongs to user?"}
HasPolicy --> |No| ErrPolicy["Return 404: Policy not found"]
HasPolicy --> |Yes| SetPolicy
SetPolicy --> CheckImages["Check images attached"]
CheckImages --> HasImages{"At least one image?"}
HasImages --> |No| ErrImages["Return 400: Upload images first"]
HasImages --> |Yes| CheckGarage{"Garage assigned?"}
CheckGarage --> |Yes| SetGarageReview["Set status = GARAGE_REVIEW"]
CheckGarage --> |No| SetSubmitted["Set status = SUBMITTED"]
SetGarageReview --> TriggerAI["Trigger background damage analysis"]
SetSubmitted --> TriggerAI
TriggerAI --> End(["Done"])
```

**Diagram sources**
- [claims.ts:39-98](file://backend/src/routes/claims.ts#L39-L98)
- [claims.ts:253-296](file://backend/src/routes/claims.ts#L253-L296)

**Section sources**
- [claims.ts:39-98](file://backend/src/routes/claims.ts#L39-L98)
- [claims.ts:253-296](file://backend/src/routes/claims.ts#L253-L296)

### Enhanced Payout Calculation Service
- **Complex Business Logic**: The payout calculation service implements sophisticated business rules for determining insurance payouts.
- **Deductible Application**: Subtracts the policy deductible from the base estimate total.
- **Coverage Percentage**: Applies the policy's coverage percentage to the amount after deductible.
- **Vehicle Valuation Cap**: Caps the final covered amount at the vehicle's insured valuation when set.
- **Garage Estimate Priority**: Uses garage estimates as the primary basis when available, falling back to AI-generated estimates.
- **Automatic Recalculation**: Triggers payout recalculation whenever estimates change (both AI and garage estimates).

```mermaid
flowchart TD
Start(["Recalculate Payout"]) --> Load["Load Claim + Policy + Vehicle + Estimates"]
Load --> BaseTotal{"Garage estimate exists?"}
BaseTotal --> |Yes| UseGarage["Use garage estimate total"]
BaseTotal --> |No| UseAI["Use AI repair estimate total"]
UseGarage --> CalcAfterDeductible["Calculate after deductible"]
UseAI --> CalcAfterDeductible
CalcAfterDeductible --> ApplyCoverage["Apply coverage percentage"]
ApplyCoverage --> CheckValuation{"Vehicle valuation set?"}
CheckValuation --> |Yes| CapAmount["Cap at vehicle valuation"]
CheckValuation --> |No| SkipCap["Skip valuation cap"]
CapAmount --> SavePayout["Save/update InsurancePayout"]
SkipCap --> SavePayout
SavePayout --> End(["Done"])
```

**Diagram sources**
- [payoutService.ts:11-67](file://backend/src/services/payoutService.ts#L11-L67)

**Section sources**
- [payoutService.ts:11-67](file://backend/src/services/payoutService.ts#L11-L67)

### Garage Authentication and Authorization
- **Garage Registration**: New garages can register with required information including license number, specialties, and contact details.
- **Authentication Flow**: Garages authenticate using JWT tokens with role-based access control.
- **Authorization Middleware**: Dedicated middleware validates garage tokens and checks approval status.
- **Access Control**: Only approved and active garages can access claim management endpoints.

```mermaid
sequenceDiagram
participant GarageUI as "Garage Interface"
participant Auth as "garageAuth.ts"
participant API as "garage routes"
participant DB as "Prisma schema"
GarageUI->>Auth : POST /api/garage/auth/login
Auth->>DB : Verify garage credentials
DB-->>Auth : Garage data + approval status
Auth->>Auth : Generate JWT token with role='garage'
Auth-->>GarageUI : Return token
GarageUI->>API : Request with Bearer token
API->>Auth : Validate token via middleware
Auth->>DB : Check garage approval & active status
DB-->>Auth : Garage validation result
Auth-->>API : Allow access if valid
API-->>GarageUI : Return claim data
```

**Diagram sources**
- [garageAuth.ts:1-30](file://backend/src/middleware/garageAuth.ts#L1-L30)
- [garageAuth.ts:58-109](file://backend/src/routes/garageAuth.ts#L58-L109)
- [garage.ts:1-136](file://backend/src/routes/garage.ts#L1-L136)

**Section sources**
- [garageAuth.ts:1-30](file://backend/src/middleware/garageAuth.ts#L1-L30)
- [garageAuth.ts:58-109](file://backend/src/routes/garageAuth.ts#L58-L109)
- [garage.ts:1-136](file://backend/src/routes/garage.ts#L1-L136)

### Garage Claim Management Workflow
- **Assigned Claims**: Garages can view all claims assigned to them through dedicated endpoints.
- **Claim Details**: Full claim information including vehicle details, images, AI assessments, and existing estimates.
- **Estimate Submission**: Garages can submit detailed repair estimates with itemized costs, labor hours, and notes.
- **Status Updates**: Automatic status transition to GARAGE_ESTIMATED when estimates are submitted.
- **Payout Recalculation**: Garage estimate submission triggers automatic payout recalculation with vehicle valuation caps.

```mermaid
flowchart TD
Start(["Garage Login"]) --> ViewClaims["View Assigned Claims"]
ViewClaims --> SelectClaim["Select Claim for Review"]
SelectClaim --> Assess["Review AI Assessment + Images"]
Assess --> CreateEstimate["Create/Edit Repair Estimate"]
CreateEstimate --> SubmitEstimate["Submit Estimate"]
SubmitEstimate --> UpdateStatus["Update Claim Status = GARAGE_ESTIMATED"]
UpdateStatus --> RecalculatePayout["Recalculate Payout with Vehicle Cap"]
RecalculatePayout --> End(["Complete"])
```

**Diagram sources**
- [garage.ts:12-36](file://backend/src/routes/garage.ts#L12-L36)
- [garage.ts:38-65](file://backend/src/routes/garage.ts#L38-L65)
- [garage.ts:67-133](file://backend/src/routes/garage.ts#L67-L133)

**Section sources**
- [garage.ts:12-36](file://backend/src/routes/garage.ts#L12-L36)
- [garage.ts:38-65](file://backend/src/routes/garage.ts#L38-L65)
- [garage.ts:67-133](file://backend/src/routes/garage.ts#L67-L133)

### AI-Powered Damage Assessment
- Input: All images associated with the claim.
- Processing:
  - Reads image files and sends them to the AI model with a structured prompt to detect dents, scratches, cracks, broken lights, bumper damage, glass damage, wheel/frame issues, etc.
  - Returns JSON with damages array, drivability assessment, and overall severity.
  - Parses response robustly, handling markdown-wrapped JSON; falls back to a safe default if parsing fails.
- Output:
  - Creates or updates DamageAssessment record linked to the claim.
  - Updates per-image AI annotations based on damage locations.
  - Auto-calls repair estimate generation after successful assessment.

```mermaid
sequenceDiagram
participant API as "routes/claims.ts"
participant DAM as "damageAnalysisService.ts"
participant AI as "Gemini Model"
participant DB as "Prisma schema"
API->>DAM : analyzeDamage(claimId)
DAM->>DB : Fetch Claim + Images
DAM->>AI : Send images + prompt
AI-->>DAM : JSON {damages, drivability, overallSeverity}
DAM->>DB : Create/Update DamageAssessment
DAM->>DB : Update ClaimImage.aiAnnotation
DAM->>API : Return result
Note over DAM,API : Auto-trigger repair estimate generation
```

**Diagram sources**
- [damageAnalysisService.ts:50-153](file://backend/src/services/damageAnalysisService.ts#L50-L153)
- [claims.ts:374-392](file://backend/src/routes/claims.ts#L374-L392)

**Section sources**
- [damageAnalysisService.ts:50-153](file://backend/src/services/damageAnalysisService.ts#L50-L153)

### Enhanced Repair Estimate Generation
- Inputs: DamageAssessment items with type, severity, location, description, affectedParts.
- Cost Calculation:
  - Uses predefined cost ranges for parts and labor hours by damage type and severity.
  - Applies severity-based labor rates and paint material costs.
  - Computes subtotal per item: partCost + laborCost + paintMaterials.
  - Aggregates totals: totalPartsCost, totalLaborCost, totalCost, totalLaborHours.
  - Estimates repair days based on total labor hours divided by standard daily capacity.
- Outputs:
  - Creates or updates RepairEstimate with itemized details and totals.
  - **Enhanced Payout Calculation**: Automatically triggers payout recalculation with complex business logic including deductibles, coverage percentages, and vehicle valuation caps.

```mermaid
flowchart TD
Start(["Generate Estimate"]) --> Load["Load Claim + DamageAssessment + Policy"]
Load --> Items["Map damages to estimate items"]
Items --> Costs["Compute part/labor/materials per item"]
Costs --> Totals["Sum totals and compute estimatedDays"]
Totals --> SaveEstimate["Save RepairEstimate"]
SaveEstimate --> RecalculatePayout["Call recalculatePayout()"]
RecalculatePayout --> End(["Done"])
```

**Diagram sources**
- [repairEstimateService.ts:107-170](file://backend/src/services/repairEstimateService.ts#L107-L170)
- [payoutService.ts:11-67](file://backend/src/services/payoutService.ts#L11-L67)

**Section sources**
- [repairEstimateService.ts:107-170](file://backend/src/services/repairEstimateService.ts#L107-L170)

### Document Verification Workflow
- Supported types: LICENSE, REGISTRATION, ACCIDENT_REPORT, REPAIR_ESTIMATE.
- Processing:
  - Reads document file and sends it to the AI model with context (document type, vehicle, policyholder).
  - Checks readability, identifies document type, verifies presence of key information, flags issues like expiration or tampering.
  - Returns JSON with status (VERIFIED, ISSUES_FOUND, UNREADABLE), issues list, extractedInfo, and recommendations.
- Output:
  - Updates Document record with verificationStatus and verificationResult.

```mermaid
sequenceDiagram
participant API as "routes/claims.ts"
participant DOC as "documentVerificationService.ts"
participant AI as "Gemini Model"
participant DB as "Prisma schema"
API->>DOC : verifyDocument(docId)
DOC->>DB : Fetch Document + Claim context
DOC->>AI : Send doc image + prompt
AI-->>DOC : JSON {status, issues, extractedInfo, recommendations}
DOC->>DB : Update Document.verificationStatus + verificationResult
DOC-->>API : Return result
```

**Diagram sources**
- [documentVerificationService.ts:41-106](file://backend/src/services/documentVerificationService.ts#L41-L106)
- [claims.ts:483-501](file://backend/src/routes/claims.ts#L483-L501)

**Section sources**
- [documentVerificationService.ts:41-106](file://backend/src/services/documentVerificationService.ts#L41-L106)
- [claims.ts:483-501](file://backend/src/routes/claims.ts#L483-L501)

### Enhanced Claim Status Transitions and Audit Trail
- **Enhanced Statuses**: DRAFT, SUBMITTED, UNDER_REVIEW, GARAGE_REVIEW, GARAGE_ESTIMATED, APPROVED, REJECTED, COMPLETED.
- **Current transitions**:
  - DRAFT -> SUBMITTED on submit endpoint (no garage assigned).
  - DRAFT -> GARAGE_REVIEW on submit endpoint (garage assigned).
  - GARAGE_REVIEW -> GARAGE_ESTIMATED when garage submits estimate.
  - Other transitions (UNDER_REVIEW, APPROVED, REJECTED, COMPLETED) can be extended via admin routes or additional endpoints.
- Audit trail:
  - Chat messages are persisted per claim with roles USER and ASSISTANT, providing a chronological log of interactions and decisions.
  - DamageAssessment, RepairEstimate, GarageEstimate, InsurancePayout, and Document verification results serve as immutable artifacts for auditing.

```mermaid
stateDiagram-v2
[*] --> DRAFT
DRAFT --> SUBMITTED : "submit (no garage)"
DRAFT --> GARAGE_REVIEW : "submit (with garage)"
GARAGE_REVIEW --> GARAGE_ESTIMATED : "garage submits estimate"
SUBMITTED --> UNDER_REVIEW : "admin review"
GARAGE_ESTIMATED --> UNDER_REVIEW : "admin review"
UNDER_REVIEW --> APPROVED : "approve"
UNDER_REVIEW --> REJECTED : "reject"
APPROVED --> COMPLETED : "complete"
REJECTED --> [*]
COMPLETED --> [*]
```

**Diagram sources**
- [schema.prisma:88-97](file://backend/prisma/schema.prisma#L88-L97)
- [claims.ts:253-296](file://backend/src/routes/claims.ts#L253-L296)
- [garage.ts:122-126](file://backend/src/routes/garage.ts#L122-L126)
- [admin.ts:109-127](file://backend/src/routes/admin.ts#L109-L127)

**Section sources**
- [schema.prisma:88-97](file://backend/prisma/schema.prisma#L88-L97)
- [claims.ts:253-296](file://backend/src/routes/claims.ts#L253-L296)
- [garage.ts:122-126](file://backend/src/routes/garage.ts#L122-L126)
- [admin.ts:109-127](file://backend/src/routes/admin.ts#L109-L127)

### Frontend Claim Creation Flow
- Steps: Incident Info, Full Vehicle Photos, Damage Close-up Photos, Review & Submit.
- **Enhanced Garage Selection**: Users can now select from available authorized garages during claim creation.
- **Automatic Policy Display**: Shows the automatically linked policy when none is explicitly selected.
- Validation:
  - Requires vehicle selection, incident date/location/description.
  - Requires at least one full vehicle photo before proceeding.
- Submission:
  - Creates claim with automatic policy linking, uploads images, then submits; navigates to claim detail page.

```mermaid
flowchart TD
Start(["New Claim Page"]) --> Step1["Incident Info"]
Step1 --> Step2["Full Vehicle Photos"]
Step2 --> Step3["Damage Close-up Photos"]
Step3 --> Step4["Select Garage (Optional)"]
Step4 --> Step5["Review & Submit"]
Step5 --> Submit["Create claim + auto-link policy + upload images + submit"]
Submit --> Navigate["Navigate to claim detail"]
```

**Diagram sources**
- [NewClaimPage.tsx:1-252](file://frontend/src/pages/NewClaimPage.tsx#L1-L252)

**Section sources**
- [NewClaimPage.tsx:1-252](file://frontend/src/pages/NewClaimPage.tsx#L1-L252)

### Garage Dashboard and Management Interface
- **Dashboard Overview**: Shows total claims, pending reviews, and completed estimates for each garage.
- **Claim Filtering**: Displays claims awaiting review (GARAGE_REVIEW) separately from completed estimates.
- **Interactive Interface**: Clickable claim cards leading to detailed estimation interface.
- **Status Visualization**: Color-coded status indicators for different claim states.

```mermaid
flowchart TD
Start(["Garage Dashboard"]) --> Stats["View Statistics"]
Stats --> Pending["View Pending Reviews"]
Stats --> Completed["View Completed Estimates"]
Pending --> Detail["Click to View Claim Details"]
Completed --> Detail
Detail --> EditEstimate["Edit/Create Estimate"]
EditEstimate --> Submit["Submit Estimate"]
Submit --> Update["Update Status to GARAGE_ESTIMATED"]
Update --> Recalculate["Recalculate Payout with Vehicle Cap"]
```

**Diagram sources**
- [GarageDashboardPage.tsx:1-119](file://frontend/src/pages/garage/GarageDashboardPage.tsx#L1-L119)

**Section sources**
- [GarageDashboardPage.tsx:1-119](file://frontend/src/pages/garage/GarageDashboardPage.tsx#L1-L119)

## Dependency Analysis
- Routes depend on middleware for authentication and file uploads.
- Services encapsulate AI integrations and database operations.
- Prisma schema defines entities and relationships used across services.
- Types define shared interfaces for requests/responses and service outputs.
- **Enhanced Dependencies**: Garage authentication middleware and dedicated garage routes add new dependency layers; payout service is now integrated with both repair estimate and garage estimate workflows.

```mermaid
graph LR
R["routes/claims.ts"] --> M1["middleware/auth.ts"]
R --> M2["middleware/upload.ts"]
R --> S1["damageAnalysisService.ts"]
R --> S2["repairEstimateService.ts"]
R --> S3["documentVerificationService.ts"]
R --> S4["claimAssistantService.ts"]
R_G["routes/garage.ts"] --> MG["middleware/garageAuth.ts"]
R_A["routes/admin.ts"] --> MA["middleware/adminAuth.ts"]
S1 --> T["types/index.ts"]
S2 --> T
S2 --> S5["payoutService.ts"]
S3 --> T
S4 --> T
S1 --> P["prisma/schema.prisma"]
S2 --> P
S3 --> P
S4 --> P
S5 --> P
R_G --> P
R_A --> P
```

**Diagram sources**
- [claims.ts:1-554](file://backend/src/routes/claims.ts#L1-L554)
- [garage.ts:1-136](file://backend/src/routes/garage.ts#L1-L136)
- [admin.ts:1-300](file://backend/src/routes/admin.ts#L1-L300)
- [index.ts:1-51](file://backend/src/types/index.ts#L1-L51)
- [schema.prisma:1-282](file://backend/prisma/schema.prisma#L1-L282)
- [payoutService.ts:1-67](file://backend/src/services/payoutService.ts#L1-L67)

**Section sources**
- [claims.ts:1-554](file://backend/src/routes/claims.ts#L1-L554)
- [garage.ts:1-136](file://backend/src/routes/garage.ts#L1-L136)
- [admin.ts:1-300](file://backend/src/routes/admin.ts#L1-L300)
- [index.ts:1-51](file://backend/src/types/index.ts#L1-L51)
- [schema.prisma:1-282](file://backend/prisma/schema.prisma#L1-L282)

## Performance Considerations
- Image handling: Reading and encoding images to base64 for AI calls can be memory-intensive; consider streaming or optimizing image sizes where possible.
- Background processing: Damage analysis runs asynchronously after submit; ensure robust error handling and retries for long-running tasks.
- Database queries: Use selective includes to minimize payload size when fetching claim details for UI or chat context.
- Caching: Consider caching frequent lookups (e.g., vehicle/policy data) if read-heavy workloads emerge.
- Rate limits: Respect external AI provider rate limits and implement exponential backoff for retries.
- **Garage Performance**: Garage authentication and claim filtering should be optimized for concurrent access patterns.
- **Payout Calculation Optimization**: The recalculatePayout function is called multiple times during the workflow; consider batching or caching strategies for high-volume scenarios.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Missing required fields on claim creation: Ensure vehicleId, incidentDate, incidentLocation, and incidentDescription are provided.
- No images on submit: At least one image must be attached before submitting; otherwise, the request will fail.
- **Policy Linking Issues**: When no policy is specified, the system automatically finds the most recent active policy; check user's policy history if unexpected policy is linked.
- **Garage Assignment Issues**: Verify garage exists, is approved, and is active before assigning to claims.
- Damage analysis failures: If AI parsing fails, a fallback assessment is stored; manual review may be required.
- Document verification unreadable: If the document image is blurry or damaged, the system marks it UNREADABLE; prompt users to re-upload clearer images.
- Estimate generation errors: Requires a valid DamageAssessment; ensure damage analysis completes successfully before generating estimates.
- **Payout Calculation Errors**: Ensure vehicle valuation is properly set; check policy deductible and coverage percentage values.
- **Garage Authentication Errors**: Check JWT token validity, garage approval status, and account activation.
- Chat assistant errors: Verify claim exists and that chat history retrieval succeeds; check AI model availability.

**Section sources**
- [claims.ts:39-98](file://backend/src/routes/claims.ts#L39-L98)
- [claims.ts:253-296](file://backend/src/routes/claims.ts#L253-L296)
- [garageAuth.ts:1-30](file://backend/src/middleware/garageAuth.ts#L1-L30)
- [damageAnalysisService.ts:85-103](file://backend/src/services/damageAnalysisService.ts#L85-L103)
- [documentVerificationService.ts:78-94](file://backend/src/services/documentVerificationService.ts#L78-L94)
- [repairEstimateService.ts:114-116](file://backend/src/services/repairEstimateService.ts#L114-L116)
- [payoutService.ts:11-67](file://backend/src/services/payoutService.ts#L11-L67)
- [claimAssistantService.ts:36-38](file://backend/src/services/claimAssistantService.ts#L36-L38)

## Conclusion
The system implements a comprehensive, AI-assisted claims processing workflow that automates damage assessment, generates repair estimates, verifies documents, and maintains an auditable chat history. The enhanced workflow now includes automatic policy linking when none is specified, intelligent search for the most recent active policy, and sophisticated payout calculation with complex business logic including deductibles, coverage percentages, and vehicle valuation caps. The integration of authorized garage participation through GARAGE_REVIEW and GARAGE_ESTIMATED statuses allows professional repair shops to assess damages and submit detailed estimates. The modular architecture separates concerns between routing, services, and data modeling, enabling extensibility for custom claim types, additional workflow stages, and business rule modifications.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Custom Claim Types and Extensions
- Extend the ClaimStatus enum to add new states (e.g., PAUSED, RESUBMITTED) and update route handlers to support transitions.
- Add new document types in the DocumentType enum and update validation logic in the document upload route.
- Introduce new AI prompts in services to handle specialized damage categories or document formats.
- **Garage Extensions**: Add new garage capabilities such as real-time communication, scheduling integration, or advanced diagnostic tools.
- **Policy Extensions**: Enhance automatic policy linking logic to support more sophisticated criteria beyond just expiration dates.

**Section sources**
- [schema.prisma:88-97](file://backend/prisma/schema.prisma#L88-L97)
- [schema.prisma:194-199](file://backend/prisma/schema.prisma#L194-L199)
- [claims.ts:374-392](file://backend/src/routes/claims.ts#L374-L392)

### Business Rule Modifications
- Adjust cost ranges and labor rates in repair estimate calculations to reflect regional pricing or vendor agreements.
- Modify validation rules for claim submission (e.g., require police report for certain severities).
- Implement notification triggers upon status changes (e.g., email/SMS on APPROVED/REJECTED) by adding hooks in route handlers.
- **Garage Business Rules**: Define approval workflows, specialty matching algorithms, and performance metrics for garage participation.
- **Payout Business Rules**: Customize deductible amounts, coverage percentages, and vehicle valuation cap logic in the payout calculation service.

**Section sources**
- [repairEstimateService.ts:5-60](file://backend/src/services/repairEstimateService.ts#L5-L60)
- [claims.ts:39-98](file://backend/src/routes/claims.ts#L39-L98)
- [garageAuth.ts:11-56](file://backend/src/routes/garageAuth.ts#L11-L56)
- [payoutService.ts:11-67](file://backend/src/services/payoutService.ts#L11-L67)

### Enhanced Workflow Scenarios
- **Standard Flow**: User submits claim → AI assessment → Admin review → Approval/Rejection
- **Garage Flow**: User submits claim with garage → Garage review → Garage estimate → Admin review → Approval/Rejection
- **Hybrid Flow**: User submits claim → AI assessment → Garage estimate → Admin comparison → Approval/Rejection
- **Automatic Policy Flow**: User submits claim without policy → System auto-links most recent active policy → Standard processing continues

[No sources needed since this section provides conceptual workflow examples]