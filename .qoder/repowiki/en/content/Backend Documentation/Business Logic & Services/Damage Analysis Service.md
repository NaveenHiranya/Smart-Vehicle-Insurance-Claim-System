# Damage Analysis Service

<cite>
**Referenced Files in This Document**
- [damageAnalysisService.ts](file://backend/src/services/damageAnalysisService.ts)
- [fraudScoringService.ts](file://backend/src/services/fraudScoringService.ts)
- [partCatalog.ts](file://backend/src/services/partCatalog.ts)
- [gemini.ts](file://backend/src/utils/gemini.ts)
- [schema.prisma](file://backend/prisma/schema.prisma)
- [index.ts (types)](file://backend/src/types/index.ts)
- [claims.ts](file://backend/src/routes/claims.ts)
- [repairEstimateService.ts](file://backend/src/services/repairEstimateService.ts)
- [upload.ts](file://backend/src/middleware/upload.ts)
</cite>

## Update Summary
**Changes Made**
- Enhanced with strict part ID validation through responseSchema constraints ensuring only valid part IDs from the catalog are accepted
- Added automatic fraud scoring trigger after damage assessment completion for comprehensive risk evaluation
- Implemented schema-enforced JSON responses with deterministic parsing instead of best-effort approaches
- Integrated comprehensive fraud detection including policy recency checks, duplicate plate detection, document verification, and AI-powered incident-damage consistency analysis
- Enhanced error handling with robust fallback mechanisms for both damage analysis and fraud scoring operations

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Configuration Management](#configuration-management)
7. [Dependency Analysis](#dependency-analysis)
8. [Performance Considerations](#performance-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)
11. [Appendices](#appendices)

## Introduction
This document explains the enhanced Damage Analysis Service that processes vehicle images using Google Gemini AI to identify and classify damage types including dents, scratches, cracks, broken lights, bumper damage, glass damage, and structural issues. The service now features strict part ID validation through responseSchema constraints, automatic fraud scoring integration, intelligent image selection that prioritizes close-up shots, cost reduction through optimized image processing, automatic repair estimate generation, and improved JSON response parsing with robust fallback mechanisms.

**Updated** The service now implements strict part ID validation via responseSchema constraints, ensuring only valid parts from the canonical catalog are accepted, and automatically triggers comprehensive fraud scoring after damage assessment completion for enhanced risk detection.

## Project Structure
The backend exposes REST endpoints under /api/claims. The claims route triggers background or on-demand damage analysis, which reads uploaded images from configurable upload directories, calls Gemini with optimized image selection and strict schema validation, parses structured results, persists assessments, annotates images, automatically generates repair estimates, and triggers fraud scoring for comprehensive risk evaluation.

```mermaid
graph TB
Client["Client App"] --> API["Express Server<br/>/api/claims"]
API --> ClaimsRoute["Claims Router<br/>POST /:id/analyze"]
ClaimsRoute --> DAS["DamageAnalysisService.analyzeDamage()"]
DAS --> ImageSelect["Intelligent Image Selection<br/>Prioritize Close-ups + Max 6 Images"]
DAS --> Schema["Strict Part ID Validation<br/>responseSchema Constraints"]
DAS --> Config["Configurable Upload Directory<br/>UPLOAD_DIR Environment Variable"]
DAS --> Gemini["GoogleGenerativeAI<br/>getGeminiModel()"]
DAS --> Prisma["Prisma Client<br/>Claim, ClaimImage, DamageAssessment"]
DAS --> RepairEst["RepairEstimateService.generateRepairEstimate()<br/>Auto-generated"]
DAS --> Fraud["FraudScoringService.scoreClaimFraud()<br/>Auto-triggered"]
Config --> FS["File System<br/>Flexible Path Resolution"]
Prisma --> DB["SQLite Database"]
```

**Diagram sources**
- [claims.ts:352-370](file://backend/src/routes/claims.ts#L352-L370)
- [damageAnalysisService.ts:26-141](file://backend/src/services/damageAnalysisService.ts#L26-L141)
- [fraudScoringService.ts:145-200](file://backend/src/services/fraudScoringService.ts#L145-L200)
- [gemini.ts:54-98](file://backend/src/utils/gemini.ts#L54-L98)
- [schema.prisma:73-166](file://backend/prisma/schema.prisma#L73-L166)
- [upload.ts:6-15](file://backend/src/middleware/upload.ts#L6-L15)

**Section sources**
- [claims.ts:352-370](file://backend/src/routes/claims.ts#L352-L370)

## Core Components
- **Enhanced Damage Analysis Service**: Orchestrates intelligent image selection, strict schema validation, Gemini invocation with responseSchema constraints, JSON parsing with robust fallbacks, persistence, image annotation updates, automatic repair estimate generation, and automatic fraud scoring.
- **Fraud Scoring Service**: Provides comprehensive fraud detection through rule-based signals (policy recency, duplicate plates, document verification) and AI-powered incident-damage consistency analysis.
- **Part Catalog**: Centralized source of truth for valid part IDs, pricing information, and human-readable labels used across damage analysis, repair estimation, and UI display.
- **Optimized Gemini Utility**: Provides configured GoogleGenerativeAI models with cascade fallback and response mode configuration for cost efficiency.
- **Types**: Strongly typed interfaces for damage items, analysis results, repair estimates, and fraud scoring.
- **Routes**: Expose endpoints to trigger analysis and generate estimates with background processing.
- **Enhanced Repair Estimate Service**: Converts damage assessments into itemized cost estimates with automatic insurance payout calculations.
- **Prisma Schema**: Defines entities for claims, images, damage assessments, repair estimates, fraud scoring data, and related data.
- **Upload Middleware**: Manages file uploads to configurable directories with automatic directory creation.

**Updated** All components now feature strict part ID validation through responseSchema constraints, automatic fraud scoring integration, intelligent image selection, automatic repair estimate generation, and enhanced cost optimization through response mode configuration.

**Section sources**
- [damageAnalysisService.ts:26-141](file://backend/src/services/damageAnalysisService.ts#L26-L141)
- [fraudScoringService.ts:145-200](file://backend/src/services/fraudScoringService.ts#L145-L200)
- [partCatalog.ts:1-57](file://backend/src/services/partCatalog.ts#L1-57)
- [gemini.ts:54-98](file://backend/src/utils/gemini.ts#L54-L98)
- [index.ts (types):12-43](file://backend/src/types/index.ts#L12-L43)
- [claims.ts:352-396](file://backend/src/routes/claims.ts#L352-L396)
- [repairEstimateService.ts:106-201](file://backend/src/services/repairEstimateService.ts#L106-L201)
- [schema.prisma:73-166](file://backend/prisma/schema.prisma#L73-L166)
- [upload.ts:6-15](file://backend/src/middleware/upload.ts#L6-L15)

## Architecture Overview
The service follows an enhanced pipeline with strict validation and comprehensive fraud detection:
1. Route receives an analyze request for a specific claim.
2. Service loads claim with images and vehicle context from Prisma.
3. **Intelligent Image Selection**: Filters and prioritizes DAMAGE_CLOSEUP images first, then adds FULL_VEHICLE images until reaching maximum of 6 images.
4. **Strict Part ID Validation**: Uses responseSchema constraints to ensure only valid part IDs from the canonical catalog are accepted by the AI model.
5. Images are read from configurable upload directories using UPLOAD_DIR environment variable.
6. File paths are resolved consistently across all services using path.resolve().
7. A detailed prompt instructs Gemini to return a strict JSON schema with response mode enabled for cost efficiency.
8. Gemini response is parsed with enhanced fallback mechanisms; if parsing fails, a safe fallback result is used.
9. Assessment is persisted (create or update), and each claim image's aiAnnotation field is updated based on image type.
10. **Automatic Post-Processing**: Repair estimate generation is triggered automatically after successful analysis.
11. **Automatic Fraud Scoring**: Comprehensive fraud scoring is triggered immediately after analysis completion.

```mermaid
sequenceDiagram
participant C as "Client"
participant R as "Claims Router"
participant S as "DamageAnalysisService"
participant IS as "Image Selector"
participant SV as "Schema Validator"
participant G as "Gemini Model"
participant P as "Prisma"
participant E as "RepairEstimateService"
participant F as "FraudScoringService"
C->>R : POST /api/claims/ : id/analyze
R->>S : analyzeDamage(claimId)
S->>P : Load claim + images + vehicle
S->>IS : Select optimal images (max 6, prioritize close-ups)
IS-->>S : Selected images array
S->>SV : Validate with responseSchema constraints
SV-->>S : Strict part ID validation
S->>G : generateContent(prompt + selected images)<br/>responseMimeType : application/json
G-->>S : JSON string response (schema-enforced)
S->>S : Parse JSON, enhanced fallback if needed
S->>P : Create/Update DamageAssessment
S->>P : Update ClaimImage.aiAnnotation per image
S->>E : generateRepairEstimate(claimId) [automatic]
E-->>S : Estimate saved
S->>F : scoreClaimFraud(claimId) [automatic]
F-->>S : Fraud score saved
S-->>R : DamageAnalysisResult
R-->>C : 200 OK + result
```

**Diagram sources**
- [claims.ts:352-370](file://backend/src/routes/claims.ts#L352-L370)
- [damageAnalysisService.ts:40-141](file://backend/src/services/damageAnalysisService.ts#L40-L141)
- [fraudScoringService.ts:145-200](file://backend/src/services/fraudScoringService.ts#L145-L200)
- [gemini.ts:54-98](file://backend/src/utils/gemini.ts#L54-L98)
- [repairEstimateService.ts:106-201](file://backend/src/services/repairEstimateService.ts#L106-L201)

## Detailed Component Analysis

### Enhanced Damage Analysis Pipeline with Strict Validation
- **Input validation**: Ensures claim exists and has at least one image.
- **Intelligent Image Selection**: Filters images by type, prioritizing DAMAGE_CLOSEUP images first, then adding FULL_VEHICLE images until reaching maximum of 6 images for optimal cost-to-quality ratio.
- **Strict Part ID Validation**: Uses responseSchema constraints to enforce that affectedParts must contain only valid part IDs from the canonical catalog, preventing invalid or fabricated part references.
- **Image preparation**: Reads files from configurable upload directories using UPLOAD_DIR environment variable, determines MIME type by extension, encodes to base64, and builds inline data parts for Gemini.
- **Prompt engineering**: Uses comprehensive prompt specifying damage categories, severity guidelines, and required JSON output format with vehicle context appended for relevance.
- **Optimized AI call**: Invokes Gemini with text prompt and selected images using responseMimeType: 'application/json' and responseSchema constraints for compact, cost-efficient, and strictly validated responses.
- **Enhanced response parsing**: Extracts JSON from possible markdown code blocks with improved error handling; on failure, returns minimal safe result indicating manual review.
- **Persistence**: Upserts DamageAssessment with damages, drivability assessment, overall severity, and raw AI response.
- **Image annotations**: Updates each ClaimImage's aiAnnotation with relevant damages filtered by image type (full vs closeup).
- **Automatic post-processing**: Triggers repair estimate generation immediately after successful analysis without requiring manual intervention.
- **Automatic fraud scoring**: Triggers comprehensive fraud scoring immediately after analysis completion for enhanced risk detection.

**Updated** The pipeline now features strict part ID validation through responseSchema constraints, automatic fraud scoring integration, intelligent image selection that prioritizes close-up shots and limits total images to 6, significantly reducing API costs while maintaining detection accuracy.

```mermaid
flowchart TD
Start(["Start analyzeDamage"]) --> Validate["Validate claim and images"]
Validate --> |OK| ImageSelect["Select optimal images:<br/>1. Filter DAMAGE_CLOSEUP first<br/>2. Add FULL_VEHICLE images<br/>3. Limit to max 6 images"]
Validate --> |Fail| Err["Throw error"]
ImageSelect --> Schema["Apply responseSchema constraints<br/>Strict part ID validation"]
Schema --> Prepare["Read images from configurable path<br/>path.resolve(uploadDir, relativePath)"]
Prepare --> Prompt["Build prompt + vehicle context"]
Prompt --> Call["Call Gemini with responseMimeType: application/json<br/>+ responseSchema constraints"]
Call --> Parse{"Parse JSON with enhanced fallback"}
Parse --> |Success| Persist["Upsert DamageAssessment"]
Parse --> |Fail| Fallback["Use fallback result"]
Persist --> Annotate["Update ClaimImage.aiAnnotation"]
Fallback --> Annotate
Annotate --> AutoEstimate["Auto-generate repair estimate"]
AutoEstimate --> AutoFraud["Auto-score for fraud"]
AutoFraud --> End(["Return result"])
Err --> End
```

**Diagram sources**
- [damageAnalysisService.ts:40-141](file://backend/src/services/damageAnalysisService.ts#L40-L141)
- [partCatalog.ts:1-57](file://backend/src/services/partCatalog.ts#L1-57)
- [upload.ts:6-15](file://backend/src/middleware/upload.ts#L6-L15)

**Section sources**
- [damageAnalysisService.ts:26-141](file://backend/src/services/damageAnalysisService.ts#L26-L141)

### Configuration Management
The service implements centralized configuration management for file paths and environment-specific settings.

- **Upload Directory Configuration**: Uses UPLOAD_DIR environment variable with './uploads' as default fallback for development.
- **Consistent Path Resolution**: All file operations use path.resolve() to ensure cross-platform compatibility.
- **Environment Variables**: Supports different configurations for development, staging, and production environments.
- **Directory Auto-Creation**: Upload middleware automatically creates required subdirectories (images, documents) if they don't exist.

**Deployment Examples:**
- Development: `UPLOAD_DIR=./uploads` (default)
- Production: `UPLOAD_DIR=/data/uploads` or cloud storage paths
- Containerized: `UPLOAD_DIR=/app/uploads` for Docker deployments

**Section sources**
- [damageAnalysisService.ts:49-51](file://backend/src/services/damageAnalysisService.ts#L49-L51)
- [upload.ts:6-15](file://backend/src/middleware/upload.ts#L6-L15)

### Prompt Engineering Strategy with Schema Enforcement
- Role and scope: Explicitly defines the AI as an automotive damage assessment expert.
- Categories: Enumerates target damage types including dents, scratches, cracks, broken lights, bumper damage, glass damage, wheel/tire damage, frame/structural damage, and other defects.
- Contextual guidance: Differentiates between full vehicle photos and damage closeups, requesting location descriptions and affected parts.
- Severity rubric: Provides clear MINOR/MODERATE/SEVERE definitions to standardize classification.
- Output contract: Enforces a strict JSON schema with fields for damages array, drivability assessment, and overall severity.
- Vehicle context: Appends make/model/year/color to ground the analysis.
- **Schema enforcement**: Uses responseSchema constraints to physically prevent the model from inventing field names or wrapping JSON in prose, making parsing deterministic instead of best-effort.

**Section sources**
- [damageAnalysisService.ts:7-24](file://backend/src/services/damageAnalysisService.ts#L7-L24)

### Severity Assessment Algorithms
- AI-driven severity: The prompt includes severity guidelines; Gemini assigns severity per damage and an overall severity.
- Post-processing: The service stores both per-damage severity and overall severity in the database.
- Cost estimation linkage: Repair estimate service uses severity to select labor rates and paint/material costs, influencing total cost and estimated days.

**Section sources**
- [damageAnalysisService.ts:19-24](file://backend/src/services/damageAnalysisService.ts#L19-L24)
- [repairEstimateService.ts:75-104](file://backend/src/services/repairEstimateService.ts#L75-L104)

### Enhanced JSON Response Parsing and Fallback with Schema Validation
- **Robust extraction**: Attempts to extract JSON from markdown code fences before parsing with improved error handling.
- **Typed result**: Parses into a strongly-typed interface ensuring consistent downstream usage.
- **Enhanced fallback behavior**: On parse failure, logs the raw response and returns a minimal result indicating manual review, preventing pipeline breakage.
- **Cost optimization**: Uses responseMimeType: 'application/json' configuration to ensure compact JSON responses with fewer tokens.
- **Schema enforcement**: responseSchema constraints ensure the model cannot wrap JSON in prose or invent field names, making parsing deterministic.

**Section sources**
- [damageAnalysisService.ts:67-90](file://backend/src/services/damageAnalysisService.ts#L67-L90)
- [gemini.ts:54-98](file://backend/src/utils/gemini.ts#L54-L98)

### Strict Part ID Validation Through responseSchema Constraints
- **Canonical Part Catalog**: Maintains a single source of truth for valid part IDs, pricing information, and human-readable labels.
- **Schema Enforcement**: Uses responseSchema constraints to ensure the AI model can only reference valid part IDs from the catalog, preventing fabrication or typos.
- **Validation Process**: The DAMAGE_SCHEMA includes `affectedParts: { type: 'ARRAY', items: { type: 'STRING', enum: PART_IDS } }`, physically constraining the model to use only approved part identifiers.
- **Normalization**: Additional normalization ensures case-insensitive matching and proper formatting of part IDs.
- **Integration**: Validated part IDs flow through to repair estimation and UI display, ensuring consistency across the entire system.

**Updated** The service now enforces strict part ID validation through responseSchema constraints, ensuring only valid parts from the canonical catalog are accepted by the AI model.

**Section sources**
- [damageAnalysisService.ts:18-39](file://backend/src/services/damageAnalysisService.ts#L18-L39)
- [partCatalog.ts:1-57](file://backend/src/services/partCatalog.ts#L1-57)

### Automatic Fraud Scoring Integration
- **Trigger Point**: Automatically called after successful damage assessment completion within the analyzeDamage function.
- **Comprehensive Analysis**: Evaluates multiple fraud indicators including policy recency, duplicate plate detection, document verification status, and AI-powered incident-damage consistency analysis.
- **Rule-Based Signals**: 
  - Policy recency: Flags claims filed within 14 days of policy start (+15 points)
  - Duplicate plates: Detects vehicles with excessive claims history (+30 points)
  - Document verification: Identifies missing or failed document verification (+10-25 points)
- **AI-Powered Consistency Check**: Uses LLM to assess whether detected damage is plausible given the described incident (+30 points if mismatch detected)
- **Risk Scoring**: Calculates composite fraud score (0-100) with tier classification (LOW/MEDIUM/HIGH)
- **Data Persistence**: Updates claim records with fraudScore, fraudFlags, fraudSummary, and fraudScoredAt fields
- **Graceful Error Handling**: Errors during fraud scoring are caught and logged without failing the main analysis pipeline

**Updated** The service now automatically triggers comprehensive fraud scoring after damage assessment completion for enhanced risk detection.

**Section sources**
- [damageAnalysisService.ts:208-214](file://backend/src/services/damageAnalysisService.ts#L208-L214)
- [fraudScoringService.ts:145-200](file://backend/src/services/fraudScoringService.ts#L145-L200)

### Prisma Integration and Data Models
- Entities involved:
  - Claim: Central entity linking user, vehicle, policy, images, assessments, estimates, payouts, documents, chat messages, and fraud scoring data.
  - ClaimImage: Stores image metadata, type (FULL_VEHICLE or DAMAGE_CLOSEUP), path, label, and aiAnnotation JSON.
  - DamageAssessment: Stores damages JSON, drivability assessment, overall severity, raw AI response, and timestamp.
  - RepairEstimate: Stores itemized costs, totals, and estimated days linked to assessment and claim.
  - InsurancePayout: Automatically calculated based on repair estimates and policy deductibles.
  - Fraud Scoring Fields: fraudScore (0-100), fraudFlags (array), fraudSummary (text), fraudScoredAt (timestamp)
- Relationships: One-to-many from Claim to images/documents/chat; one-to-one from Claim to DamageAssessment and RepairEstimate; optional InsurancePayout linked to RepairEstimate.

```mermaid
erDiagram
CLAIM {
uuid id PK
string userId FK
string vehicleId FK
string policyId FK
enum status
datetime incidentDate
string incidentLocation
string incidentDescription
string weatherConditions
boolean hasPoliceReport
int fraudScore
json fraudFlags
string fraudSummary
datetime fraudScoredAt
datetime createdAt
datetime updatedAt
}
CLAIMIMAGE {
uuid id PK
string claimId FK
enum type
string filePath
string label
json aiAnnotation
datetime uploadedAt
}
DAMAGEASSESSMENT {
uuid id PK
string claimId UK FK
json damages
string drivabilityAssessment
enum overallSeverity
json aiRawResponse
datetime assessedAt
}
REPAIRESTIMATE {
uuid id PK
string claimId UK FK
string damageAssessmentId UK FK
json items
float totalPartsCost
float totalLaborCost
float totalCost
int estimatedDays
datetime createdAt
}
INSURANCEPAYOUT {
uuid id PK
string claimId UK FK
string repairEstimateId UK FK
float deductible
float coveredAmount
float estimatedPayout
string notes
datetime createdAt
}
VEHICLE {
uuid id PK
string userId FK
string make
string model
int year
string vin
string licensePlate
string color
int mileage
string photos
datetime createdAt
datetime updatedAt
}
USER {
uuid id PK
string email UK
string passwordHash
string firstName
string lastName
string phone
string address
boolean isAdmin
datetime createdAt
datetime updatedAt
}
USER ||--o{ VEHICLE : "owns"
USER ||--o{ CLAIM : "submits"
VEHICLE ||--o{ CLAIM : "involved in"
CLAIM ||--o{ CLAIMIMAGE : "has"
CLAIM ||--o| DAMAGEASSESSMENT : "has"
CLAIM ||--o| REPAIRESTIMATE : "has"
REPAIRESTIMATE ||--o| INSURANCEPAYOUT : "linked to"
```

**Diagram sources**
- [schema.prisma:73-166](file://backend/prisma/schema.prisma#L73-L166)

**Section sources**
- [schema.prisma:73-166](file://backend/prisma/schema.prisma#L73-L166)

### API Integration and Workflows
- Submitting a claim triggers background damage analysis asynchronously to avoid blocking the submit flow.
- Manual re-analysis can be requested via POST /api/claims/:id/analyze.
- After analysis, repair estimates are automatically generated without requiring manual intervention.
- Automatic insurance payout calculation is performed when policies are linked.
- **Automatic fraud scoring**: Comprehensive fraud scoring is triggered immediately after damage assessment completion.

```mermaid
sequenceDiagram
participant U as "User"
participant API as "Claims API"
participant DAS as "DamageAnalysisService"
participant RES as "RepairEstimateService"
participant FRS as "FraudScoringService"
U->>API : POST /api/claims/ : id/submit
API->>API : Validate inputs, set status SUBMITTED
API->>DAS : analyzeDamage(claimId) [background]
Note over API,DAS : Non-blocking background task
API-->>U : 200 OK (claim updated)
Note over DAS,FRS : Automatic post-processing
DAS->>RES : generateRepairEstimate(claimId) [automatic]
RES-->>DAS : Estimate saved
DAS->>FRS : scoreClaimFraud(claimId) [automatic]
FRS-->>DAS : Fraud score saved
U->>API : GET /api/claims/ : id [includes estimate + fraud score]
API-->>U : 200 OK (claim with estimate + fraud score)
```

**Diagram sources**
- [claims.ts:231-274](file://backend/src/routes/claims.ts#L231-L274)
- [damageAnalysisService.ts:200-214](file://backend/src/services/damageAnalysisService.ts#L200-L214)

**Section sources**
- [claims.ts:231-274](file://backend/src/routes/claims.ts#L231-L274)
- [claims.ts:352-396](file://backend/src/routes/claims.ts#L352-L396)

### Error Handling and Fallback Mechanisms
- Missing claim or images: Throws descriptive errors early.
- Gemini failures or malformed responses: Logs raw response and returns a safe fallback result indicating manual review.
- Background tasks: Errors in background analysis are caught and logged without failing the submit endpoint.
- Estimate generation: Errors during auto-generation are caught and logged, allowing the rest of the pipeline to continue.
- File path errors: Enhanced error handling for missing files in configurable upload directories.
- **Enhanced model fallback**: Gemini utility provides cascade fallback through multiple models with retry logic for transient failures.
- **Schema validation errors**: Strict responseSchema constraints reduce parsing failures by enforcing valid output structure.
- **Fraud scoring resilience**: Fraud scoring errors are caught and logged without affecting the main analysis pipeline.

**Updated** Enhanced error handling includes intelligent model fallback, improved JSON parsing fallbacks, automatic repair estimate generation with graceful error handling, and resilient fraud scoring integration.

**Section sources**
- [damageAnalysisService.ts:32-38](file://backend/src/services/damageAnalysisService.ts#L32-L38)
- [damageAnalysisService.ts:72-90](file://backend/src/services/damageAnalysisService.ts#L72-L90)
- [damageAnalysisService.ts:200-214](file://backend/src/services/damageAnalysisService.ts#L200-L214)
- [fraudScoringService.ts:170-180](file://backend/src/services/fraudScoringService.ts#L170-L180)
- [gemini.ts:27-98](file://backend/src/utils/gemini.ts#L27-L98)
- [claims.ts:264-267](file://backend/src/routes/claims.ts#L264-L267)

### Performance Considerations
- Asynchronous background analysis: Submitting a claim does not block on AI processing, improving responsiveness.
- **Intelligent image selection**: Limits analysis to maximum 6 images with close-up priority, significantly reducing API costs while maintaining accuracy.
- **Cost optimization**: Uses responseMimeType: 'application/json' configuration for compact responses with fewer output tokens.
- **Schema enforcement**: responseSchema constraints reduce token usage by preventing verbose model outputs.
- Efficient image handling: Reads files once and encodes to base64 inline data; MIME detection by extension avoids extra checks.
- Batched updates: Updates aiAnnotation per image in a loop; consider batching writes if image counts grow large.
- Environment limits: Ensure adequate memory and disk I/O capacity for multiple large images.
- Retry strategy: For transient Gemini errors, implement retries with exponential backoff at the Gemini call layer.
- File system optimization: Configurable upload directories allow placement on high-performance storage systems.
- **Fraud scoring efficiency**: Rule-based checks are fast, with only one additional LLM call for incident-damage consistency analysis.

**Updated** Performance optimizations include intelligent image selection (max 6 images), response mode configuration for cost efficiency, automatic repair estimate generation, and efficient fraud scoring with rule-based pre-filtering.

### Customization and Extensibility
- Adding new damage types:
  - Extend the prompt to include the new category and ensure it aligns with severity guidelines.
  - Update the DamageItem type if necessary to capture additional attributes.
  - Add cost ranges and labor hours in the repair estimate service for accurate costing.
- Adjusting severity thresholds:
  - Refine severity definitions in the prompt to better match business rules.
  - Optionally add post-processing logic to adjust overall severity based on specific combinations of damages.
- Modifying image annotation logic:
  - Customize how damages are filtered per image type (e.g., map keywords like "close" vs "full").
- Integrating additional services:
  - Hook into the pipeline after analysis to run third-party validations or notifications.
- **Enhanced image selection customization**:
  - Modify MAX_AI_IMAGES constant to balance cost vs accuracy requirements.
  - Adjust image prioritization logic to favor different image types based on business needs.
- **Part catalog expansion**:
  - Add new parts to the PART_CATALOG for inclusion in responseSchema constraints.
  - Define pricing ranges and keywords for new part categories.
- **Fraud scoring enhancement**:
  - Add new rule-based signals to detect additional fraud patterns.
  - Modify scoring weights and thresholds based on business requirements.
  - Integrate external fraud detection APIs for enhanced analysis.
- Environment customization:
  - Configure UPLOAD_DIR for different deployment targets without code changes.
  - Set up separate upload directories for development, staging, and production environments.

**Updated** Enhanced extensibility includes customizable image selection parameters, automatic repair estimate generation, automatic fraud scoring integration, and environment-based configuration.

**Section sources**
- [damageAnalysisService.ts:40-46](file://backend/src/services/damageAnalysisService.ts#L40-L46)
- [damageAnalysisService.ts:7-24](file://backend/src/services/damageAnalysisService.ts#L7-L24)
- [partCatalog.ts:1-57](file://backend/src/services/partCatalog.ts#L1-57)
- [fraudScoringService.ts:20-73](file://backend/src/services/fraudScoringService.ts#L20-L73)
- [index.ts (types):12-43](file://backend/src/types/index.ts#L12-L43)
- [repairEstimateService.ts:4-58](file://backend/src/services/repairEstimateService.ts#L4-L58)

## Dependency Analysis
- Express server mounts routes under /api/* and serves static uploads from configurable directory.
- Claims router depends on:
  - Prisma client for data access.
  - DamageAnalysisService for AI-based analysis with intelligent image selection and strict validation.
  - RepairEstimateService for automatic cost estimation.
  - Upload middleware for file handling with configurable paths.
- DamageAnalysisService depends on:
  - Gemini utility for model instantiation with cascade fallback.
  - Prisma client for reading/writing claim-related data.
  - File system for reading uploaded images from configurable directories.
  - Part catalog for strict part ID validation.
  - Fraud scoring service for automatic risk assessment.
- RepairEstimateService depends on Prisma and uses deterministic cost tables to compute estimates.
- FraudScoringService depends on Prisma and Gemini for AI-powered consistency analysis.

**Updated** All dependencies now support intelligent image selection, automatic repair estimate generation, automatic fraud scoring, and enhanced cost optimization.

```mermaid
graph LR
Server["Express Server"] --> Claims["Claims Router"]
Claims --> DAS["DamageAnalysisService"]
Claims --> RES["RepairEstimateService"]
DAS --> Gemini["Gemini Utility<br/>with Cascade Fallback"]
DAS --> Prisma["Prisma Client"]
DAS --> Config["UPLOAD_DIR Configuration"]
DAS --> PartCat["Part Catalog<br/>Strict Validation"]
DAS --> FRS["FraudScoringService"]
RES --> Prisma
FRS --> Prisma
FRS --> Gemini
Config --> FS["File System"]
Prisma --> DB["SQLite"]
DAS -.-> ImageSelect["Intelligent Image Selection"]
```

**Diagram sources**
- [claims.ts:1-11](file://backend/src/routes/claims.ts#L1-L11)
- [damageAnalysisService.ts:1-5](file://backend/src/services/damageAnalysisService.ts#L1-L5)
- [fraudScoringService.ts:1-2](file://backend/src/services/fraudScoringService.ts#L1-L2)
- [partCatalog.ts:1-2](file://backend/src/services/partCatalog.ts#L1-L2)
- [gemini.ts:1-25](file://backend/src/utils/gemini.ts#L1-L25)
- [upload.ts:6-15](file://backend/src/middleware/upload.ts#L6-L15)

**Section sources**
- [claims.ts:1-11](file://backend/src/routes/claims.ts#L1-L11)

## Performance Considerations
- Use asynchronous background processing for AI tasks to reduce latency on user-facing endpoints.
- Cache frequently accessed claim metadata where appropriate to minimize repeated queries.
- Implement retry and timeout policies for Gemini calls to handle transient network issues.
- Monitor disk I/O when reading multiple large images; consider streaming or resizing images before encoding.
- Profile database write operations; batch updates if necessary to reduce round-trips.
- Optimize file system performance by placing upload directories on high-speed storage in production environments.
- **Monitor API costs**: Track image selection patterns and adjust MAX_AI_IMAGES based on cost/performance requirements.
- **Cache model responses**: Consider implementing response caching for identical image sets to reduce redundant API calls.
- **Fraud scoring optimization**: Rule-based checks are computationally inexpensive, with only one LLM call for consistency analysis.
- **Schema enforcement benefits**: responseSchema constraints reduce token usage and improve parsing reliability.

**Updated** Performance recommendations include monitoring API costs, optimizing image selection, implementing response caching strategies, and leveraging efficient fraud scoring with rule-based pre-filtering.

## Troubleshooting Guide
- No images to analyze: Ensure at least one image is uploaded before submitting or analyzing.
- Claim not found: Verify the claim ID and user authorization.
- Gemini API key missing: Confirm environment variable GEMINI_API_KEY is set at startup.
- JSON parse failures: Check the raw AI response stored in aiRawResponse for formatting issues; refine the prompt if needed.
- Background analysis failures: Inspect logs for background task errors; re-run manual analysis via the analyze endpoint.
- Estimate generation failures: Ensure a damage analysis exists; check logs for errors during cost calculation.
- **Image selection issues**: Verify image types are correctly tagged (DAMAGE_CLOSEUP vs FULL_VEHICLE) for optimal selection.
- **High API costs**: Review image selection patterns and consider adjusting MAX_AI_IMAGES constant.
- **Model fallback issues**: Check logs for model cascade failures and verify API rate limits.
- **File path resolution issues**: Verify UPLOAD_DIR environment variable is correctly set and accessible.
- **Missing upload directories**: Ensure upload directories exist or are automatically created by the upload middleware.
- **Permission errors**: Check file system permissions for the configured upload directory.
- **Cross-platform path issues**: Verify path separators are handled correctly across different operating systems.
- **Schema validation errors**: Check if AI responses comply with responseSchema constraints; review part catalog validity.
- **Fraud scoring failures**: Verify claim has damage assessment and incident description; check logs for LLM consistency analysis errors.
- **Invalid part IDs**: Ensure part IDs in AI responses match the canonical catalog; review part catalog completeness.

**Updated** Enhanced troubleshooting includes guidance for image selection optimization, API cost monitoring, model fallback debugging, schema validation issues, and fraud scoring integration problems.

**Section sources**
- [damageAnalysisService.ts:32-38](file://backend/src/services/damageAnalysisService.ts#L32-L38)
- [damageAnalysisService.ts:72-90](file://backend/src/services/damageAnalysisService.ts#L72-L90)
- [damageAnalysisService.ts:200-214](file://backend/src/services/damageAnalysisService.ts#L200-L214)
- [fraudScoringService.ts:170-180](file://backend/src/services/fraudScoringService.ts#L170-L180)
- [gemini.ts:27-98](file://backend/src/utils/gemini.ts#L27-L98)
- [claims.ts:264-267](file://backend/src/routes/claims.ts#L264-L267)

## Conclusion
The enhanced Damage Analysis Service integrates Google Gemini AI with a sophisticated pipeline that intelligently selects optimal images, classifies vehicle damage with strict part ID validation, assesses severity, persists results, annotates images, automatically generates repair estimates, and triggers comprehensive fraud scoring. The recent improvements include strict responseSchema constraints ensuring only valid part IDs are accepted, automatic fraud scoring integration for enhanced risk detection, intelligent image prioritization that maximizes detection accuracy while minimizing API costs, automatic repair estimate generation, enhanced JSON response parsing with robust fallbacks, and optimized Gemini model usage with response mode configuration. These enhancements provide significant cost savings while maintaining or improving detection quality, making the service more efficient, reliable, and comprehensive for production deployments.

**Updated** The service now delivers enhanced cost efficiency through intelligent image selection, automatic post-processing capabilities, strict schema validation, automatic fraud scoring, and optimized API usage patterns suitable for high-volume claim processing scenarios.

## Appendices

### API Endpoints Summary
- POST /api/claims/:id/submit: Submits a claim and triggers background damage analysis with automatic repair estimate generation and fraud scoring.
- POST /api/claims/:id/analyze: Manually triggers damage analysis and returns the result.
- POST /api/claims/:id/estimate: Generates a repair estimate based on existing damage assessment (manual override available).
- POST /api/admin/claims/:id/fraud-score: Manually recalculates fraud score for administrative purposes.

**Section sources**
- [claims.ts:231-274](file://backend/src/routes/claims.ts#L231-L274)
- [claims.ts:352-396](file://backend/src/routes/claims.ts#L352-L396)
- [admin.ts:661-675](file://backend/src/routes/admin.ts#L661-L675)

### Environment Configuration
Configuration examples for different deployment scenarios:

**Development (.env):**
```bash
UPLOAD_DIR=./uploads
PORT=5000
GEMINI_API_KEY=your_key_here
DATABASE_URL=sqlite:./dev.db
```

**Production (.env):**
```bash
UPLOAD_DIR=/data/uploads
PORT=8080
GEMINI_API_KEY=production_key
DATABASE_URL=postgresql://user:pass@host/db
```

**Container Deployment (.env):**
```bash
UPLOAD_DIR=/app/uploads
PORT=3000
GEMINI_API_KEY=container_key
DATABASE_URL=postgresql://user:pass@db-host:5432/app
```

**Section sources**
- [damageAnalysisService.ts:49-51](file://backend/src/services/damageAnalysisService.ts#L49-L51)
- [upload.ts:6-15](file://backend/src/middleware/upload.ts#L6-L15)

### Cost Optimization Guidelines
- **Image Selection Strategy**: The service automatically prioritizes DAMAGE_CLOSEUP images and limits total images to 6 for optimal cost-to-quality ratio.
- **Response Mode**: Uses responseMimeType: 'application/json' configuration to ensure compact JSON responses with fewer output tokens.
- **Schema Enforcement**: responseSchema constraints reduce token usage by preventing verbose model outputs and ensuring structured responses.
- **Model Cascade**: Implements fallback through multiple Gemini models starting with the most cost-effective option.
- **Background Processing**: Performs analysis asynchronously to avoid blocking user interactions and optimize resource utilization.
- **Fraud Scoring Efficiency**: Rule-based checks are computationally inexpensive, with only one LLM call for consistency analysis.

### Monitoring and Metrics
- **API Usage Tracking**: Monitor model usage and fallback patterns through console logs.
- **Cost Analysis**: Track image selection patterns and adjust MAX_AI_IMAGES based on cost/performance requirements.
- **Error Rate Monitoring**: Log and monitor JSON parsing failures and model fallback occurrences.
- **Performance Metrics**: Measure end-to-end processing time from image upload to estimate generation and fraud scoring.
- **Fraud Detection Metrics**: Track fraud scoring frequency, flag distribution, and risk tier classification.
- **Schema Validation Success Rate**: Monitor compliance with responseSchema constraints and part ID validation.