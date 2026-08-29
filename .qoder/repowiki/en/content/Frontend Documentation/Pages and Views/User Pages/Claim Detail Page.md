# Claim Detail Page

<cite>
**Referenced Files in This Document**
- [ClaimDetailPage.tsx](file://frontend/src/pages/ClaimDetailPage.tsx)
- [AdminClaimDetailPage.tsx](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx)
- [GlobalAIAssistant.tsx](file://frontend/src/components/GlobalAIAssistant.tsx)
- [api.ts](file://frontend/src/services/api.ts)
- [adminApi.ts](file://frontend/src/services/adminApi.ts)
- [index.ts (types)](file://frontend/src/types/index.ts)
- [claims.ts (routes)](file://backend/src/routes/claims.ts)
- [admin.ts (routes)](file://backend/src/routes/admin.ts)
- [damageAnalysisService.ts](file://backend/src/services/damageAnalysisService.ts)
- [repairEstimateService.ts](file://backend/src/services/repairEstimateService.ts)
- [documentVerificationService.ts](file://backend/src/services/documentVerificationService.ts)
- [claimAssistantService.ts](file://backend/src/services/claimAssistantService.ts)
- [garageEstimate.ts](file://frontend/src/utils/garageEstimate.ts)
</cite>

## Update Summary
**Changes Made**
- Enhanced garage selection modal with improved user interface and better visual feedback
- Implemented real-time damage assessment polling with automatic background updates
- Added re-analysis triggers that automatically run after image uploads or deletions
- Integrated comprehensive garage estimate comparison display showing AI vs garage estimates
- Improved progress tracking with garage-specific steps including garage selection and assessment phases
- Enhanced error handling for garage operations and assessment processes

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

## Introduction
This document explains the ClaimDetailPage, which provides a comprehensive view and management experience for an individual insurance claim. It covers how incident details, vehicle information, damage assessment results with real-time polling, repair estimates with integrated garage comparison, current status with timeline tracking, documents, chat-based communication, approval workflow integration, and admin notes display are shown and managed. The page now features enhanced garage selection capabilities, automatic re-analysis after image modifications, and comprehensive estimate comparison between AI-generated and garage-provided assessments. It also documents data fetching patterns, error handling for missing or invalid claim data, navigation behavior, and real-time-like updates via polling mechanisms.

## Project Structure
The ClaimDetailPage is part of a React frontend that communicates with an Express backend. The page fetches claim data, triggers AI analysis with real-time polling, manages garage selection, handles image uploads with automatic re-analysis, uploads documents, verifies documents, manages a chat conversation, and displays admin notes from insurance reviewers. The backend exposes REST endpoints to read/update claims, run AI services, persist related entities such as images, documents, assessments, estimates, payouts, chat messages, and admin notes. All monetary values are consistently formatted with Sri Lankan Rupees (Rs.) prefixes and proper thousands separators.

```mermaid
graph TB
subgraph "Frontend"
CDP["ClaimDetailPage.tsx"]
ACDP["AdminClaimDetailPage.tsx"]
GAA["GlobalAIAssistant.tsx"]
GEU["garageEstimate.ts"]
API["api.ts (Axios client)"]
AAPI["adminApi.ts (Admin Axios client)"]
TYPES["Types (Claim, DamageAssessment, RepairEstimate, etc.)"]
end
subgraph "Backend"
ROUTES["claims.ts routes"]
AROUTES["admin.ts routes"]
DAST["damageAnalysisService.ts"]
RES["repairEstimateService.ts"]
DVS["documentVerificationService.ts"]
CAS["claimAssistantService.ts"]
end
CDP --> API
ACDP --> AAPI
GAA --> API
CDP --> GEU
API --> ROUTES
AAPI --> AROUTES
ROUTES --> DAST
ROUTES --> RES
ROUTES --> DVS
ROUTES --> CAS
AROUTES --> DAST
AROUTES --> RES
AROUTES --> DVS
AROUTES --> CAS
CDP --> TYPES
ACDP --> TYPES
GAA --> TYPES
GEU --> TYPES
```

**Diagram sources**
- [ClaimDetailPage.tsx:1-713](file://frontend/src/pages/ClaimDetailPage.tsx#L1-L713)
- [AdminClaimDetailPage.tsx:1-359](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L1-L359)
- [GlobalAIAssistant.tsx:1-157](file://frontend/src/components/GlobalAIAssistant.tsx#L1-L157)
- [garageEstimate.ts:1-49](file://frontend/src/utils/garageEstimate.ts#L1-L49)
- [api.ts:1-40](file://frontend/src/services/api.ts#L1-L40)
- [adminApi.ts:1-27](file://frontend/src/services/adminApi.ts#L1-L27)
- [claims.ts:1-532](file://backend/src/routes/claims.ts#L1-L532)
- [admin.ts:1-239](file://backend/src/routes/admin.ts#L1-L239)

**Section sources**
- [ClaimDetailPage.tsx:1-713](file://frontend/src/pages/ClaimDetailPage.tsx#L1-L713)
- [AdminClaimDetailPage.tsx:1-359](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L1-L359)
- [GlobalAIAssistant.tsx:1-157](file://frontend/src/components/GlobalAIAssistant.tsx#L1-L157)
- [garageEstimate.ts:1-49](file://frontend/src/utils/garageEstimate.ts#L1-L49)
- [api.ts:1-40](file://frontend/src/services/api.ts#L1-L40)
- [adminApi.ts:1-27](file://frontend/src/services/adminApi.ts#L1-L27)
- [claims.ts:1-532](file://backend/src/routes/claims.ts#L1-L532)
- [admin.ts:1-239](file://backend/src/routes/admin.ts#L1-L239)

## Core Components
- Claim detail display: incident info, vehicle make/model/year, location/date, status badge, safety warning when severe damage is detected.
- **Enhanced garage selection**: improved modal interface with visual feedback, address display, and change capabilities.
- Images gallery: shows uploaded full-vehicle and close-up damage photos with delete functionality.
- **Real-time damage assessment**: displays severity, drivability assessment, and itemized damages with automatic polling and re-analysis triggers.
- **Integrated estimate comparison**: shows both AI and garage estimates side-by-side with detailed breakdowns and currency formatting.
- **Repair estimate**: shows parts/labor totals with Sri Lankan Rupees formatting, estimated days, and line items with proper currency display.
- **Insurance payout**: shows deductible, covered amounts, and estimated payouts in Rs. format.
- **Admin notes display**: shows color-coded category badges and timestamp formatting.
- Documents: upload, view, and verify documents with verification statuses and issues.
- **Enhanced progress checklist**: includes garage-specific steps like garage selection and assessment phases.
- Chat assistant: send/receive messages about the claim; quick prompts included.
- **Global AI Assistant**: floating chat interface for general AI assistance (replaces inline suggestions).

Key behaviors:
- Fetches claim details on mount and refreshes after mutations.
- **Real-time polling**: automatically polls for damage assessment results until they appear.
- **Automatic re-analysis**: triggers re-analysis after image uploads or deletions.
- Navigates back to claims listing if claim not found.
- Uses axios interceptors to attach auth tokens and handle 401 redirects.
- Displays all monetary values with consistent Sri Lankan Rupees formatting.
- Shows admin notes with categorized badges and formatted timestamps.
- Provides access to AI assistance through global floating assistant instead of inline suggestions.

**Section sources**
- [ClaimDetailPage.tsx:9-119](file://frontend/src/pages/ClaimDetailPage.tsx#L9-L119)
- [ClaimDetailPage.tsx:170-197](file://frontend/src/pages/ClaimDetailPage.tsx#L170-L197)
- [ClaimDetailPage.tsx:272-366](file://frontend/src/pages/ClaimDetailPage.tsx#L272-L366)
- [ClaimDetailPage.tsx:368-417](file://frontend/src/pages/ClaimDetailPage.tsx#L368-L417)
- [ClaimDetailPage.tsx:419-465](file://frontend/src/pages/ClaimDetailPage.tsx#L419-L465)
- [AdminClaimDetailPage.tsx:245-304](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L245-L304)
- [GlobalAIAssistant.tsx:16-157](file://frontend/src/components/GlobalAIAssistant.tsx#L16-L157)
- [api.ts:11-37](file://frontend/src/services/api.ts#L11-L37)

## Architecture Overview
The ClaimDetailPage follows a client-server architecture with clear separation of concerns:
- Frontend UI orchestrates user interactions and renders rich claim context including admin notes with proper currency formatting.
- **Enhanced polling mechanism**: implements background polling for damage assessment results and automatic re-analysis triggers.
- Backend routes enforce authentication and delegate to specialized services.
- Services integrate with AI models to analyze damage, generate estimates, verify documents, and power the chat assistant.
- Data persistence uses Prisma to store claims, images, documents, assessments, estimates, payouts, chat messages, and admin notes.
- Global AI Assistant provides centralized AI assistance accessible from any page.

```mermaid
sequenceDiagram
participant U as "User"
participant F as "ClaimDetailPage.tsx"
participant GA as "GlobalAIAssistant.tsx"
participant A as "api.ts"
participant R as "claims.ts"
participant S1 as "damageAnalysisService.ts"
participant S2 as "repairEstimateService.ts"
participant S3 as "documentVerificationService.ts"
participant S4 as "claimAssistantService.ts"
U->>F : Open claim detail
F->>A : GET /claims/ : id
A->>R : GET /claims/ : id
R-->>A : Claim + relations + adminNotes
A-->>F : Claim data with Rs. formatted values
F->>F : Render sections including admin notes and currency
Note over F : Background polling starts for assessment
loop Real-time polling (every 5s, max 2min)
F->>A : GET /claims/ : id (polling)
A->>R : GET /claims/ : id
R-->>A : Updated claim with assessment
A-->>F : Assessment result
end
U->>F : Upload/delete image
F->>A : POST/DELETE /claims/ : id/images
A->>R : Handle image operation
R-->>A : Success
A-->>F : Updated claim
F->>F : Trigger re-analysis
F->>A : POST /claims/ : id/analyze
A->>R : POST /claims/ : id/analyze
R->>S1 : analyzeDamage()
S1-->>R : Assessment result
R-->>A : Assessment
A-->>F : Success
Note over F : Re-analysis polling starts
loop Re-analysis polling (every 5s, max 3min)
F->>A : GET /claims/ : id (polling)
A->>R : GET /claims/ : id
R-->>A : Updated claim with new assessment
A-->>F : New assessment result
end
U->>GA : Open global AI assistant
GA->>A : POST /general-chat
A->>S4 : getChatResponse()
S4-->>A : AI response
A-->>GA : Reply
GA-->>U : Display AI response
```

**Diagram sources**
- [ClaimDetailPage.tsx:37-58](file://frontend/src/pages/ClaimDetailPage.tsx#L37-L58)
- [ClaimDetailPage.tsx:112-117](file://frontend/src/pages/ClaimDetailPage.tsx#L112-L117)
- [GlobalAIAssistant.tsx:29-43](file://frontend/src/components/GlobalAIAssistant.tsx#L29-L43)
- [claims.ts:104-134](file://backend/src/routes/claims.ts#L104-L134)
- [claims.ts:270-288](file://backend/src/routes/claims.ts#L270-L288)
- [damageAnalysisService.ts:50-153](file://backend/src/services/damageAnalysisService.ts#L50-L153)
- [repairEstimateService.ts:104-199](file://backend/src/services/repairEstimateService.ts#L104-L199)
- [documentVerificationService.ts:41-107](file://backend/src/services/documentVerificationService.ts#L41-L107)
- [claimAssistantService.ts:19-130](file://backend/src/services/claimAssistantService.ts#L19-L130)

## Detailed Component Analysis

### Enhanced Garage Selection Modal
**Updated** Significantly improved garage selection interface with better visual feedback and user experience.

- **Improved modal design**: Full-screen overlay with smooth animations and better layout
- **Visual selection indicators**: Radio buttons with highlighted borders and check marks for selected garages
- **Enhanced garage information display**: Shows name, address, city, and phone number with map pin icons
- **Smart loading states**: Loading indicator while fetching available garages
- **Contextual actions**: Dynamic button text changes based on whether changing existing garage or selecting new one
- **Validation and error handling**: Prevents saving without selection and handles network errors gracefully

Implementation details:
- Modal opens with `openGarageModal()` function that pre-populates current garage selection
- Garages are fetched from `/claims/garages` endpoint only when needed (on first open)
- Selection state managed with `garagePick` state variable
- Save operation calls PATCH `/claims/:id/garage` with garageId
- Automatic claim refresh after successful garage selection/change

**Section sources**
- [ClaimDetailPage.tsx:60-80](file://frontend/src/pages/ClaimDetailPage.tsx#L60-L80)
- [ClaimDetailPage.tsx:673-709](file://frontend/src/pages/ClaimDetailPage.tsx#L673-L709)
- [claims.ts:175-200](file://backend/src/routes/claims.ts#L175-L200)

### Real-Time Damage Assessment Polling
**Updated** Implemented sophisticated polling mechanism for automatic damage assessment updates.

- **Background polling**: Automatically polls every 5 seconds for up to 2 minutes after claim submission
- **Smart polling conditions**: Only activates when claim is submitted, has images, and no assessment exists
- **Polling timeout**: Stops polling after 2 minutes to prevent unnecessary network requests
- **Visual feedback**: Shows spinning animation and helpful messages during polling process
- **State management**: Uses `pollStartRef` to track polling start time and prevent multiple intervals

Processing logic:
- Polling starts immediately when claim becomes non-DRAFT status with images but no assessment
- Each poll fetches updated claim data to check for assessment completion
- Polling stops when assessment appears or timeout is reached
- Clean interval cleanup prevents memory leaks

**Section sources**
- [ClaimDetailPage.tsx:37-46](file://frontend/src/pages/ClaimDetailPage.tsx#L37-L46)
- [ClaimDetailPage.tsx:409-413](file://frontend/src/pages/ClaimDetailPage.tsx#L409-L413)

### Automatic Re-Analysis After Image Edits
**Updated** Added intelligent re-analysis triggers that automatically update damage assessments when images are modified.

- **Image change detection**: Monitors image uploads and deletions to trigger re-analysis
- **Conditional re-analysis**: Only triggers when claim is not in DRAFT status or already has assessment
- **Background processing**: Runs re-analysis in background with automatic polling until new assessment arrives
- **User feedback**: Shows clear messaging about ongoing re-analysis process
- **Time-limited polling**: Polls for up to 3 minutes for new assessment results

Implementation details:
- `triggerReanalysis()` function sets timestamp and calls analyze endpoint
- `reanalyzing` state computed based on timestamp and assessment timing
- Separate polling mechanism from initial assessment polling
- Visual indicator shows "Photos changed — AI is re-analyzing" message
- Automatic cleanup when re-analysis completes or times out

**Section sources**
- [ClaimDetailPage.tsx:48-58](file://frontend/src/pages/ClaimDetailPage.tsx#L48-L58)
- [ClaimDetailPage.tsx:112-117](file://frontend/src/pages/ClaimDetailPage.tsx#L112-L117)
- [ClaimDetailPage.tsx:137-144](file://frontend/src/pages/ClaimDetailPage.tsx#L137-L144)
- [ClaimDetailPage.tsx:377-382](file://frontend/src/pages/ClaimDetailPage.tsx#L377-L382)

### Integrated Garage Estimate Comparison Display
**Updated** Comprehensive comparison interface showing both AI-generated and garage-provided estimates side by side.

- **Side-by-side comparison**: Displays AI estimate and garage estimate in parallel grid layout
- **Color-coded differentiation**: Blue for AI estimates, orange for garage estimates
- **Detailed breakdown**: Shows parts, labor, paint materials, totals, and estimated days for both estimates
- **Currency formatting**: Consistent Sri Lankan Rupees formatting across all monetary values
- **Status indicators**: Shows when garage estimate is submitted with timestamp
- **Itemized details**: Expands to show detailed line items for both estimates

Comparison features:
- Grid layout with 2-column comparison when both estimates exist
- Individual cost components (parts, labor, paint) displayed separately
- Total costs prominently displayed with appropriate styling
- Notes field for garage estimates when available
- Responsive design adapts to different screen sizes

**Section sources**
- [ClaimDetailPage.tsx:291-347](file://frontend/src/pages/ClaimDetailPage.tsx#L291-L347)
- [garageEstimate.ts:17-48](file://frontend/src/utils/garageEstimate.ts#L17-L48)

### Enhanced Progress Checklist with Garage Integration
**Updated** Expanded progress tracking to include garage-specific milestones and assessment phases.

- **Garage selection step**: Added "Garage selected" milestone in progress tracking
- **Garage assessment step**: Includes "Garage assessment" phase after garage selection
- **Issue detection**: Highlights problematic steps with red indicators and XCircle icons
- **Visual hierarchy**: Clear distinction between completed, pending, and problematic steps
- **Contextual guidance**: Clock icons indicate pending steps requiring attention

Progress flow:
- Claim created → Vehicle photos uploaded → Claim submitted → AI damage assessment complete → Repair estimate generated → **Garage selected** → **Garage assessment** → Documents uploaded → Documents approved → Claim approved → Claim completed
- Each step includes boolean completion status and optional issue flag
- Conditional rendering based on claim state and related entities

**Section sources**
- [ClaimDetailPage.tsx:170-197](file://frontend/src/pages/ClaimDetailPage.tsx#L170-L197)
- [ClaimDetailPage.tsx:247-270](file://frontend/src/pages/ClaimDetailPage.tsx#L247-L270)

### Monetary Value Formatting with Sri Lankan Rupees
**Updated** Enhanced with comprehensive Sri Lankan Rupees (Rs.) formatting throughout all monetary displays, including garage estimates.

All monetary values are consistently formatted with:
- **Rs. prefix**: Every monetary value displays the Sri Lankan Rupees symbol followed by the amount
- **Thousands separators**: Uses `toLocaleString()` for proper number formatting (e.g., 1,234,567)
- **Consistent styling**: Bold fonts and appropriate colors for different monetary categories

Implementation includes:
- **Repair cost breakdowns**: Parts, labor, and total costs all formatted with Rs. prefixes
- **Garage estimate comparisons**: Both AI and garage estimates use consistent formatting
- **Insurance payout estimates**: Deductible, covered amounts, and estimated payouts with proper currency formatting
- **Line item costs**: Individual part costs, labor rates, and subtotals with consistent formatting
- **Admin interface**: Same currency formatting applied across both user and admin views

Examples of formatted values:
- AI Parts: `Rs. {aiTotals.totalPartsCost.toLocaleString()}`
- Garage Labor: `Rs. {garageTotals.laborCost.toLocaleString()}`
- Garage Paint: `Rs. {garageItems.paintMaterials.toLocaleString()}`
- Payout: `Rs. {claim.insurancePayout.estimatedPayout.toLocaleString()}`

**Section sources**
- [ClaimDetailPage.tsx:297-347](file://frontend/src/pages/ClaimDetailPage.tsx#L297-L347)
- [ClaimDetailPage.tsx:427-463](file://frontend/src/pages/ClaimDetailPage.tsx#L427-L463)
- [AdminClaimDetailPage.tsx:210-223](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L210-L223)
- [index.ts:74-102](file://frontend/src/types/index.ts#L74-L102)

### Admin Notes Display with Color-Coded Categories
**Updated** Enhanced with admin notes display showing color-coded category badges and timestamp formatting for insurance company perspective.

- Displays admin notes with categorized badges:
  - **Vehicle notes**: Blue background (`bg-blue-200 text-blue-800`)
  - **Document notes**: Purple background (`bg-purple-200 text-purple-800`)  
  - **General notes**: Gray background (`bg-gray-200 text-gray-700`)
- Shows formatted timestamps using `toLocaleString()` for better readability
- Provides visual distinction between different types of administrative feedback
- Integrates seamlessly with the existing claim detail layout

Implementation details:
- Notes are rendered conditionally when `claim.adminNotes` exists and has content
- Each note displays category badge, timestamp, and content in a structured format
- Uses consistent styling with other claim components for visual harmony

**Section sources**
- [ClaimDetailPage.tsx:569-590](file://frontend/src/pages/ClaimDetailPage.tsx#L569-L590)
- [AdminClaimDetailPage.tsx:275-304](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L275-L304)
- [index.ts:122-129](file://frontend/src/types/index.ts#L122-L129)

### Damage Assessment Results with Real-Time Updates
**Updated** Enhanced with real-time polling and automatic re-analysis capabilities.

- Displays overall severity, drivability assessment, and list of damages with type, severity, location, and description.
- **Real-time polling**: Automatically polls for assessment results every 5 seconds until they appear
- **Re-analysis triggers**: Automatically triggers re-analysis when images are uploaded or deleted
- **Visual feedback**: Shows spinning animations and helpful messages during processing
- Supports manual re-analysis by calling POST /claims/:id/analyze

Processing logic:
- Backend service reads claim images, sends them to AI model, parses JSON output, persists assessment, updates image annotations, and auto-generates repair estimate with Sri Lankan Rupees formatting.
- Frontend implements sophisticated polling mechanism with timeout protection
- Automatic re-analysis ensures assessment stays current with image changes

**Section sources**
- [ClaimDetailPage.tsx:37-58](file://frontend/src/pages/ClaimDetailPage.tsx#L37-L58)
- [ClaimDetailPage.tsx:368-417](file://frontend/src/pages/ClaimDetailPage.tsx#L368-L417)
- [claims.ts:270-288](file://backend/src/routes/claims.ts#L270-L288)
- [damageAnalysisService.ts:50-153](file://backend/src/services/damageAnalysisService.ts#L50-L153)

### Repair Estimates with Currency Formatting
**Updated** Enhanced with comprehensive Sri Lankan Rupees formatting for all repair cost components and integrated garage comparison.

- Shows total parts cost, labor cost, total cost with Rs. prefixes and thousands separators
- Estimated days display alongside formatted costs
- Itemized breakdown with individual part costs, labor hours, labor rates, and subtotals all properly formatted
- Generated automatically after damage analysis or via dedicated endpoint
- **Integrated comparison**: Side-by-side display with garage estimates when available

Processing logic:
- Service computes item costs using predefined ranges in Sri Lankan Rupees, aggregates totals, calculates estimated days, and creates/updates estimate record with proper currency formatting. Also computes insurance payout if policy exists.

**Section sources**
- [ClaimDetailPage.tsx:419-465](file://frontend/src/pages/ClaimDetailPage.tsx#L419-L465)
- [claims.ts:290-314](file://backend/src/routes/claims.ts#L290-L314)
- [repairEstimateService.ts:104-199](file://backend/src/services/repairEstimateService.ts#L104-L199)

### Insurance Payout Estimates with Currency Formatting
**Updated** Enhanced with Sri Lankan Rupees formatting for all payout components.

- Shows deductible, covered amount, and estimated payout all with Rs. prefixes and proper formatting
- Consistent visual presentation with bold fonts and appropriate colors
- Notes field displays additional payout information when available

Implementation:
- All payout values use `Rs. {value.toLocaleString()}` pattern for consistent formatting
- Visual hierarchy emphasizes the estimated payout amount in green color
- Grid layout provides clear separation between different payout components

**Section sources**
- [ClaimDetailPage.tsx:552-566](file://frontend/src/pages/ClaimDetailPage.tsx#L552-L566)
- [AdminClaimDetailPage.tsx:217-226](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L217-L226)

### Current Status and Timeline Tracking
- Status badge reflects current claim status.
- **Enhanced progress checklist**: Now includes garage-specific steps for better workflow visibility
- Progress checklist shows steps like claim created, photos uploaded, submitted, AI assessment complete, estimate generated, **garage selected**, **garage assessment**, documents uploaded/approved, approved, completed.
- **Removed**: Contextual suggestions based on claim state have been removed in favor of the global AI assistant.

Implementation:
- Checklist computed from claim fields and related entities including garage-related data
- Suggestions derived from presence/absence of images, documents, assessments, and current status
- Enhanced with garage-specific milestones for better workflow tracking

**Section sources**
- [ClaimDetailPage.tsx:170-197](file://frontend/src/pages/ClaimDetailPage.tsx#L170-L197)
- [ClaimDetailPage.tsx:247-270](file://frontend/src/pages/ClaimDetailPage.tsx#L247-L270)

### Document Management
- Uploads documents with types LICENSE, REGISTRATION, ACCIDENT_REPORT, REPAIR_ESTIMATE.
- Displays existing documents with verification status and issues.
- Allows verifying pending documents to trigger AI verification.

Endpoints:
- POST /claims/:id/documents (multipart)
- POST /claims/:id/documents/:docId/verify

Verification logic:
- Reads document file, sends to AI model, parses JSON result, updates verification status and result.

**Section sources**
- [ClaimDetailPage.tsx:91-110](file://frontend/src/pages/ClaimDetailPage.tsx#L91-L110)
- [ClaimDetailPage.tsx:467-513](file://frontend/src/pages/ClaimDetailPage.tsx#L467-L513)
- [claims.ts:316-353](file://backend/src/routes/claims.ts#L316-L353)
- [claims.ts:379-397](file://backend/src/routes/claims.ts#L379-L397)
- [documentVerificationService.ts:41-107](file://backend/src/services/documentVerificationService.ts#L41-L107)

### Communication History and Chat Assistant
- Displays chat messages for the claim with user and assistant roles.
- Sends new messages via POST /claims/:id/chat and refreshes to show updated history.
- Quick prompts available for common questions.

Assistant logic:
- Builds context from claim, vehicle, policy, assessment, estimate, payout, and documents.
- Maintains conversation history and persists both user and assistant messages.
- References Sri Lankan Rupees when discussing monetary values in responses.

**Section sources**
- [ClaimDetailPage.tsx:146-158](file://frontend/src/pages/ClaimDetailPage.tsx#L146-L158)
- [ClaimDetailPage.tsx:634-670](file://frontend/src/pages/ClaimDetailPage.tsx#L634-L670)
- [claims.ts:399-447](file://backend/src/routes/claims.ts#L399-L447)
- [claimAssistantService.ts:19-130](file://backend/src/services/claimAssistantService.ts#L19-L130)

### Global AI Assistant
**New** Replaces inline AI suggestions with a floating global assistant interface.

- Floating button positioned at bottom-right corner of screen
- Opens chat panel with message history and quick question prompts
- Communicates with `/general-chat` endpoint for AI responses
- Provides persistent chat history across pages
- Includes message clearing functionality
- Responsive design with mobile-friendly interface

Implementation:
- Fixed positioning with z-index layering
- State management for open/closed states and message history
- Real-time message sending and receiving
- Auto-scroll to latest messages
- Loading indicators during AI processing

**Section sources**
- [GlobalAIAssistant.tsx:16-157](file://frontend/src/components/GlobalAIAssistant.tsx#L16-L157)

### Enhanced Real-Time Updates and Refresh Strategy
**Updated** Enhanced with sophisticated polling mechanisms for real-time updates.

- After each mutation (analyze, upload, verify, chat), the page calls GET /claims/:id to refresh the latest state.
- **Real-time polling**: Automatically polls every 5 seconds for up to 2 minutes when damage assessment is pending
- **Re-analysis polling**: Triggers separate polling mechanism when images are modified
- This pattern ensures consistent UI without WebSockets while providing near real-time updates.
- Currency formatting is maintained across all refresh operations.

**Section sources**
- [ClaimDetailPage.tsx:37-58](file://frontend/src/pages/ClaimDetailPage.tsx#L37-L58)
- [ClaimDetailPage.tsx:112-117](file://frontend/src/pages/ClaimDetailPage.tsx#L112-L117)

### Approval Workflow Integration
- While direct status transitions are not exposed on this page, the backend enforces workflow rules (e.g., submit only from DRAFT, require images).
- **Enhanced progress checklist**: Now includes garage-specific workflow stages for better visibility
- The progress checklist and suggestions reflect workflow stages and guide users toward completion.
- Currency-formatted estimates and payouts are integrated into the approval workflow.
- **Garage integration**: Workflow now includes garage selection and assessment phases

**Section sources**
- [claims.ts:175-200](file://backend/src/routes/claims.ts#L175-L200)
- [ClaimDetailPage.tsx:170-197](file://frontend/src/pages/ClaimDetailPage.tsx#L170-L197)

## Dependency Analysis
- ClaimDetailPage depends on:
  - api.ts for HTTP requests and auth token injection.
  - Types for compile-time safety and rendering.
  - **garageEstimate.ts** for normalizing and calculating garage estimate totals.
- AdminClaimDetailPage depends on:
  - adminApi.ts for admin-specific HTTP requests and authentication.
  - Same types for consistency across user and admin interfaces.
- GlobalAIAssistant depends on:
  - api.ts for general chat functionality.
  - Independent state management for chat history.
- Backend routes depend on:
  - Authentication middleware.
  - File upload middleware for images and documents.
  - Services for AI-powered features.
- Services depend on:
  - Prisma for database access.
  - Gemini model utilities for AI capabilities.
  - Sri Lankan Rupees formatting for all monetary calculations.

```mermaid
graph LR
CDP["ClaimDetailPage.tsx"] --> API["api.ts"]
ACDP["AdminClaimDetailPage.tsx"] --> AAPI["adminApi.ts"]
GAA["GlobalAIAssistant.tsx"] --> API
CDP --> GEU["garageEstimate.ts"]
API --> ROUTES["claims.ts"]
AAPI --> AROUTES["admin.ts"]
ROUTES --> DAST["damageAnalysisService.ts"]
ROUTES --> RES["repairEstimateService.ts"]
ROUTES --> DVS["documentVerificationService.ts"]
ROUTES --> CAS["claimAssistantService.ts"]
AROUTES --> DAST
AROUTES --> RES
AROUTES --> DVS
AROUTES --> CAS
CDP --> TYPES["Types (index.ts)"]
ACDP --> TYPES
GAA --> TYPES
GEU --> TYPES
```

**Diagram sources**
- [ClaimDetailPage.tsx:1-713](file://frontend/src/pages/ClaimDetailPage.tsx#L1-L713)
- [AdminClaimDetailPage.tsx:1-359](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L1-L359)
- [GlobalAIAssistant.tsx:1-157](file://frontend/src/components/GlobalAIAssistant.tsx#L1-L157)
- [garageEstimate.ts:1-49](file://frontend/src/utils/garageEstimate.ts#L1-L49)
- [api.ts:1-40](file://frontend/src/services/api.ts#L1-L40)
- [adminApi.ts:1-27](file://frontend/src/services/adminApi.ts#L1-L27)
- [claims.ts:1-532](file://backend/src/routes/claims.ts#L1-L532)
- [admin.ts:1-239](file://backend/src/routes/admin.ts#L1-L239)
- [index.ts:1-219](file://frontend/src/types/index.ts#L1-L219)

**Section sources**
- [ClaimDetailPage.tsx:1-713](file://frontend/src/pages/ClaimDetailPage.tsx#L1-L713)
- [AdminClaimDetailPage.tsx:1-359](file://frontend/src/pages/admin/AdminClaimDetailPage.tsx#L1-L359)
- [GlobalAIAssistant.tsx:1-157](file://frontend/src/components/GlobalAIAssistant.tsx#L1-L157)
- [garageEstimate.ts:1-49](file://frontend/src/utils/garageEstimate.ts#L1-L49)
- [api.ts:1-40](file://frontend/src/services/api.ts#L1-L40)
- [adminApi.ts:1-27](file://frontend/src/services/adminApi.ts#L1-L27)
- [claims.ts:1-532](file://backend/src/routes/claims.ts#L1-L532)
- [admin.ts:1-239](file://backend/src/routes/admin.ts#L1-L239)
- [index.ts:1-219](file://frontend/src/types/index.ts#L1-L219)

## Performance Considerations
- Re-fetching after mutations avoids stale UI but may cause multiple network calls; consider batching or optimistic updates where appropriate.
- **Enhanced polling optimization**: Implements smart polling with timeouts to prevent excessive network requests
- Image loading can be optimized with lazy loading and proper sizing.
- AI operations (analysis, verification, chat) can be slow; keep disabled states and spinners to improve perceived performance.
- Avoid unnecessary re-renders by memoizing derived lists (already used for todoSteps and suggestions).
- Currency formatting using `toLocaleString()` is lightweight and doesn't significantly impact performance.
- Admin notes display is lightweight and doesn't significantly impact performance due to simple conditional rendering.
- Global AI Assistant maintains separate state to avoid interfering with claim page performance.
- **Garage estimate normalization**: Efficient parsing and calculation of garage estimate totals using utility functions

## Troubleshooting Guide
Common issues and resolutions:
- Claim not found:
  - Frontend navigates to /claims when GET /claims/:id fails.
  - Ensure valid claim id and authenticated session.
- Missing images before submission:
  - Backend rejects submission without images; ensure at least one image is uploaded.
- Invalid document type:
  - Only supported types accepted; verify payload includes a valid type.
- AI parsing failures:
  - Services include fallback responses when AI output cannot be parsed; retry or check file readability.
- Authentication errors:
  - 401 responses clear local storage and redirect to login; re-authenticate.
- Admin notes not displaying:
  - Verify claim includes adminNotes relation in backend query.
  - Check that admin notes exist for the claim and have valid category values.
- Currency formatting issues:
  - Ensure all monetary values are numbers (not strings) before applying `toLocaleString()`.
  - Verify that the locale settings support thousands separators.
- Global AI Assistant not responding:
  - Check network connectivity to `/general-chat` endpoint.
  - Verify authentication token is present for chat requests.
- **Garage selection issues**:
  - Verify garage availability and approval status in backend
  - Check network connectivity to `/claims/garages` endpoint
  - Ensure proper error handling for garage selection failures
- **Polling not working**:
  - Verify claim status is not DRAFT and has images uploaded
  - Check network connectivity and response times
  - Ensure polling timeout limits are not exceeded
- **Re-analysis not triggering**:
  - Verify image upload/delete operations are successful
  - Check that claim is not in DRAFT status
  - Monitor console for any API errors during re-analysis

Relevant flows:
- Error handling in frontend catches failures and alerts users; navigation occurs on claim fetch failure.
- Backend routes return descriptive errors for validation and resource-not-found cases.
- Admin notes are fetched as part of the standard claim data retrieval process.
- Currency formatting is applied consistently across all monetary displays.
- Global AI Assistant handles its own error states independently from claim operations.
- **Enhanced error handling**: Improved error messages for garage operations and assessment processes

**Section sources**
- [ClaimDetailPage.tsx:27-33](file://frontend/src/pages/ClaimDetailPage.tsx#L27-L33)
- [ClaimDetailPage.tsx:60-80](file://frontend/src/pages/ClaimDetailPage.tsx#L60-L80)
- [ClaimDetailPage.tsx:37-58](file://frontend/src/pages/ClaimDetailPage.tsx#L37-L58)
- [GlobalAIAssistant.tsx:29-43](file://frontend/src/components/GlobalAIAssistant.tsx#L29-L43)
- [api.ts:26-37](file://frontend/src/services/api.ts#L26-L37)
- [claims.ts:175-200](file://backend/src/routes/claims.ts#L175-L200)
- [claims.ts:316-353](file://backend/src/routes/claims.ts#L316-L353)
- [damageAnalysisService.ts:85-103](file://backend/src/services/damageAnalysisService.ts#L85-L103)
- [documentVerificationService.ts:78-94](file://backend/src/services/documentVerificationService.ts#L78-L94)
- [admin.ts:183-208](file://backend/src/routes/admin.ts#L183-L208)

## Conclusion
The ClaimDetailPage delivers a robust, user-friendly interface for managing individual claims with comprehensive Sri Lankan Rupees formatting throughout all monetary displays. The recent enhancements include sophisticated garage selection capabilities with improved user interface, real-time damage assessment polling that automatically updates results, intelligent re-analysis triggers that respond to image modifications, and integrated garage estimate comparison displays that provide transparent cost analysis. The system now features enhanced progress tracking with garage-specific milestones, improved error handling for complex workflows, and better visual feedback during processing operations. The removal of inline AI suggestions has streamlined the user experience, focusing on core claim management features while providing access to AI assistance through a more flexible global floating assistant. The enhanced polling mechanisms ensure near real-time updates without WebSocket complexity, while the garage integration provides comprehensive cost transparency between AI-generated and professional garage estimates. Data consistency is maintained through explicit re-fetching after mutations and intelligent polling strategies, while error handling ensures graceful degradation and clear user feedback. The system now provides a professional, localized experience for Sri Lankan insurance claim management with culturally appropriate currency formatting, enhanced garage collaboration features, and improved AI accessibility.