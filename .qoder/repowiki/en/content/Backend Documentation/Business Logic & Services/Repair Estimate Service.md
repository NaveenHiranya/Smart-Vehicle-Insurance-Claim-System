# Repair Estimate Service

<cite>
**Referenced Files in This Document**
- [repairEstimateService.ts](file://backend/src/services/repairEstimateService.ts)
- [damageAnalysisService.ts](file://backend/src/services/damageAnalysisService.ts)
- [vehicleDetectionService.ts](file://backend/src/services/vehicleDetectionService.ts)
- [claims.ts](file://backend/src/routes/claims.ts)
- [index.ts](file://backend/src/index.ts)
- [schema.prisma](file://backend/prisma/schema.prisma)
- [types/index.ts](file://backend/src/types/index.ts)
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
10. [Appendices](#appendices)

## Introduction
This document explains the Repair Estimate Service that automatically generates repair cost estimates from damage analysis results, vehicle information, and pricing data. It covers how the service calculates costs, identifies parts, computes labor rates, validates estimates, and integrates with damage assessment, vehicle lookup, and policy data to produce an insurance payout estimate. It also provides guidance on configuring pricing models, adding new parts catalogs, and customizing estimation rules for different markets.

## Project Structure
The Repair Estimate Service is implemented as a backend service module integrated into an Express API. The key files involved are:
- Service layer: repair estimate generation and calculations
- Damage analysis service: AI-based damage detection that triggers estimate generation
- Vehicle detection service: AI-based vehicle identification used during claim intake
- Routes: HTTP endpoints to trigger analysis and estimate generation
- Data model: Prisma schema defining claims, assessments, estimates, payouts
- Types: Shared TypeScript interfaces for inputs and outputs

```mermaid
graph TB
Client["Client App"] --> API["Express API"]
API --> ClaimsRoutes["Claims Routes"]
ClaimsRoutes --> DamageAnalysis["Damage Analysis Service"]
ClaimsRoutes --> RepairEstimate["Repair Estimate Service"]
DamageAnalysis --> Gemini["Gemini Vision Model"]
RepairEstimate --> DB["Prisma (SQLite)"]
RepairEstimate --> Policy["Insurance Policy"]
RepairEstimate --> Vehicle["Vehicle Info"]
```

**Diagram sources**
- [claims.ts:270-314](file://backend/src/routes/claims.ts#L270-L314)
- [damageAnalysisService.ts:50-152](file://backend/src/services/damageAnalysisService.ts#L50-L152)
- [repairEstimateService.ts:104-199](file://backend/src/services/repairEstimateService.ts#L104-L199)
- [index.ts:40-45](file://backend/src/index.ts#L40-L45)

**Section sources**
- [index.ts:1-65](file://backend/src/index.ts#L1-L65)
- [claims.ts:270-314](file://backend/src/routes/claims.ts#L270-L314)

## Core Components
- Repair Estimate Service: Computes itemized repair costs based on damage types, severity, parts, labor hours, paint materials, and policy deductibles; persists estimates and optional payout calculations.
- Damage Analysis Service: Uses AI to analyze images, returns structured damages, and auto-triggers estimate generation.
- Vehicle Detection Service: Identifies vehicle details from images to enrich context for damage analysis.
- Routes: Expose endpoints to submit claims, run damage analysis, and generate repair estimates.
- Data Model: Defines relationships between claims, vehicles, policies, damage assessments, repair estimates, and payouts.

Key responsibilities:
- Cost calculation algorithms using predefined ranges per damage type and severity
- Parts identification logic via affected parts list and damage type mapping
- Labor rate calculations by severity level
- Estimate validation through required prerequisites (claim exists, damage assessment present)
- Integration with policy deductible to compute covered amount and estimated payout

**Section sources**
- [repairEstimateService.ts:4-102](file://backend/src/services/repairEstimateService.ts#L4-L102)
- [damageAnalysisService.ts:7-48](file://backend/src/services/damageAnalysisService.ts#L7-L48)
- [vehicleDetectionService.ts:15-44](file://backend/src/services/vehicleDetectionService.ts#L15-L44)
- [claims.ts:270-314](file://backend/src/routes/claims.ts#L270-L314)
- [schema.prisma:71-160](file://backend/prisma/schema.prisma#L71-L160)
- [types/index.ts:12-43](file://backend/src/types/index.ts#L12-L43)

## Architecture Overview
The end-to-end workflow starts when a user submits a claim with images. The system runs AI damage analysis, which parses images to identify damage types, severity, locations, and affected parts. Once the damage assessment is saved, the system automatically generates a repair estimate. If a policy is linked, it computes deductible-adjusted coverage and stores the estimated payout.

```mermaid
sequenceDiagram
participant Client as "Client"
participant API as "Claims Routes"
participant DA as "Damage Analysis Service"
participant RE as "Repair Estimate Service"
participant DB as "Database"
participant POL as "Policy"
Client->>API : POST /api/claims/ : id/submit
API->>DB : Update claim status to SUBMITTED
API->>DA : analyzeDamage(claimId)
DA->>DB : Read claim + images + vehicle
DA->>DA : Call Gemini to analyze images
DA-->>DB : Save DamageAssessment
DA->>RE : generateRepairEstimate(claimId)
RE->>DB : Load claim, vehicle, damageAssessment, policy
RE->>RE : Calculate items, totals, days
RE->>DB : Create/Update RepairEstimate
alt Policy linked
RE->>POL : Read deductible
RE->>DB : Create/Update InsurancePayout
end
API-->>Client : 200 OK (estimate or submission response)
```

**Diagram sources**
- [claims.ts:152-193](file://backend/src/routes/claims.ts#L152-L193)
- [damageAnalysisService.ts:50-152](file://backend/src/services/damageAnalysisService.ts#L50-L152)
- [repairEstimateService.ts:104-199](file://backend/src/services/repairEstimateService.ts#L104-L199)
- [schema.prisma:71-160](file://backend/prisma/schema.prisma#L71-L160)

## Detailed Component Analysis

### Repair Estimate Service
Responsibilities:
- Compute itemized repair costs per damage type and severity
- Aggregate totals for parts, labor, paint materials, and overall cost
- Estimate repair duration in days based on total labor hours
- Persist estimate and optionally calculate insurance payout

Cost calculation algorithm:
- For each damage item, select a configuration by damage type
- Resolve parts cost range by severity or specific part name; fallback to default
- Resolve labor hours range by severity or specific part name; fallback to default
- Apply labor rate by severity
- Add paint materials cost by severity
- Compute subtotal per item as parts + labor + paint materials
- Sum across items for totals; derive estimated days from total labor hours divided by standard daily hours

Parts identification logic:
- Uses damage.type and damage.affectedParts to determine part names and costs
- Supports specific part categories (e.g., headlight, taillight, windshield) within certain damage types

Labor rate calculations:
- Severity-based hourly rates applied to labor hours to compute labor cost

Estimate validation:
- Requires claim and damage assessment to exist before generating estimate
- Ensures at least one day is estimated even if labor hours are low

Integration points:
- Reads vehicle and policy data to enrich context and compute payout
- Persists estimate and updates or creates insurance payout

```mermaid
flowchart TD
Start(["Start generateRepairEstimate"]) --> LoadClaim["Load claim, vehicle, damageAssessment, policy"]
LoadClaim --> Validate{"Claim and damageAssessment exist?"}
Validate --> |No| Error["Throw error"]
Validate --> |Yes| MapDamages["Map damages to estimate items"]
MapDamages --> CalcItem["For each damage:<br/>- Select parts/labor ranges<br/>- Apply severity rates<br/>- Compute subtotal"]
CalcItem --> Totals["Sum parts, labor, paint materials<br/>Compute total cost and days"]
Totals --> Persist{"Existing estimate?"}
Persist --> |Yes| UpdateEstimate["Update RepairEstimate"]
Persist --> |No| CreateEstimate["Create RepairEstimate"]
UpdateEstimate --> PayoutCheck{"Policy linked?"}
CreateEstimate --> PayoutCheck
PayoutCheck --> |Yes| CalcPayout["Apply deductible<br/>Compute coveredAmount and estimatedPayout"]
PayoutCheck --> |No| Done(["Return estimate"])
CalcPayout --> PersistPayout{"Existing payout?"}
PersistPayout --> |Yes| UpdatePayout["Update InsurancePayout"]
PersistPayout --> |No| CreatePayout["Create InsurancePayout"]
UpdatePayout --> Done
CreatePayout --> Done
Error --> End(["End"])
Done --> End
```

**Diagram sources**
- [repairEstimateService.ts:60-102](file://backend/src/services/repairEstimateService.ts#L60-L102)
- [repairEstimateService.ts:104-199](file://backend/src/services/repairEstimateService.ts#L104-L199)

**Section sources**
- [repairEstimateService.ts:4-102](file://backend/src/services/repairEstimateService.ts#L4-L102)
- [repairEstimateService.ts:104-199](file://backend/src/services/repairEstimateService.ts#L104-L199)
- [types/index.ts:26-43](file://backend/src/types/index.ts#L26-L43)

### Damage Analysis Service
Responsibilities:
- Analyze uploaded images using AI to detect damage types, severity, locations, and affected parts
- Save structured damage assessment and annotate images
- Auto-trigger repair estimate generation after successful assessment

Workflow highlights:
- Loads claim images and vehicle context
- Sends images to vision model with a strict JSON prompt format
- Parses JSON response; falls back to safe defaults if parsing fails
- Saves or updates DamageAssessment and annotates images
- Calls repair estimate generator asynchronously

```mermaid
sequenceDiagram
participant API as "Claims Routes"
participant DAS as "Damage Analysis Service"
participant AI as "Vision Model"
participant DB as "Database"
API->>DAS : analyzeDamage(claimId)
DAS->>DB : Fetch claim, images, vehicle
DAS->>AI : Send images + prompt
AI-->>DAS : JSON damages + severity
DAS->>DB : Save/update DamageAssessment
DAS->>DB : Update ClaimImage.aiAnnotation
DAS->>DAS : generateRepairEstimate(claimId)
DAS-->>API : Return analysis result
```

**Diagram sources**
- [damageAnalysisService.ts:50-152](file://backend/src/services/damageAnalysisService.ts#L50-L152)
- [claims.ts:270-288](file://backend/src/routes/claims.ts#L270-L288)

**Section sources**
- [damageAnalysisService.ts:7-48](file://backend/src/services/damageAnalysisService.ts#L7-L48)
- [damageAnalysisService.ts:50-152](file://backend/src/services/damageAnalysisService.ts#L50-L152)

### Vehicle Detection Service
Responsibilities:
- Identify vehicle make, model, year, color, license plate, and confidence from images
- Provide additional observations to support downstream processes

Usage context:
- Used during claim intake to auto-populate vehicle details
- Enhances damage analysis prompts with vehicle context

**Section sources**
- [vehicleDetectionService.ts:15-44](file://backend/src/services/vehicleDetectionService.ts#L15-L44)
- [vehicleDetectionService.ts:46-95](file://backend/src/services/vehicleDetectionService.ts#L46-L95)

### API Integration Points
Endpoints relevant to repair estimates:
- Submit claim: Triggers background damage analysis and sets status to submitted
- Analyze damage: Runs AI damage analysis synchronously and returns results
- Generate estimate: Requires prior damage analysis; returns itemized estimate and totals

```mermaid
sequenceDiagram
participant Client as "Client"
participant Routes as "Claims Routes"
participant DAS as "Damage Analysis Service"
participant RES as "Repair Estimate Service"
Client->>Routes : POST /api/claims/ : id/submit
Routes->>Routes : Validate and update status
Routes->>DAS : analyzeDamage(claimId) [background]
Note over Routes,DAS : Background processing continues independently
Client->>Routes : POST /api/claims/ : id/analyze
Routes->>DAS : analyzeDamage(claimId)
DAS-->>Routes : DamageAnalysisResult
Routes-->>Client : 200 OK
Client->>Routes : POST /api/claims/ : id/estimate
Routes->>RES : generateRepairEstimate(claimId)
RES-->>Routes : RepairEstimateResult
Routes-->>Client : 200 OK
```

**Diagram sources**
- [claims.ts:152-193](file://backend/src/routes/claims.ts#L152-L193)
- [claims.ts:270-314](file://backend/src/routes/claims.ts#L270-L314)

**Section sources**
- [claims.ts:152-193](file://backend/src/routes/claims.ts#L152-L193)
- [claims.ts:270-314](file://backend/src/routes/claims.ts#L270-L314)

## Dependency Analysis
The Repair Estimate Service depends on:
- Database access via Prisma for reading claims, vehicles, policies, and saving estimates/payouts
- Damage Assessment data structure for driving cost calculations
- Policy deductible for payout computation
- Types definitions for consistent interfaces

Coupling and cohesion:
- High cohesion within repair estimate calculations (cost tables, helpers, aggregation)
- Loose coupling to damage analysis via shared types and database records
- Clear separation of concerns: routes orchestrate services; services handle business logic

Potential circular dependencies:
- None detected; damage analysis calls repair estimate but not vice versa

External integrations:
- Vision model for image analysis (used by damage and vehicle services)
- SQLite database via Prisma

```mermaid
graph LR
Types["Types"] --> RE["Repair Estimate Service"]
Schema["Schema (Prisma)"] --> RE
Damage["Damage Analysis Service"] --> RE
Routes["Claims Routes"] --> RE
RE --> DB["Database"]
RE --> Policy["Policy"]
RE --> Vehicle["Vehicle"]
```

**Diagram sources**
- [repairEstimateService.ts:1-3](file://backend/src/services/repairEstimateService.ts#L1-L3)
- [schema.prisma:71-160](file://backend/prisma/schema.prisma#L71-L160)
- [types/index.ts:12-43](file://backend/src/types/index.ts#L12-L43)

**Section sources**
- [repairEstimateService.ts:1-3](file://backend/src/services/repairEstimateService.ts#L1-L3)
- [schema.prisma:71-160](file://backend/prisma/schema.prisma#L71-L160)
- [types/index.ts:12-43](file://backend/src/types/index.ts#L12-L43)

## Performance Considerations
- Image processing and AI calls can be slow; running damage analysis in the background improves responsiveness
- Aggregation of costs and totals is linear in number of damage items; efficient for typical claim sizes
- Estimated days calculation uses integer division and minimum floor to avoid zero-day estimates
- Database operations are minimal and targeted; consider indexing frequently queried fields if scaling up

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Missing claim or damage assessment: Ensure claim exists and damage analysis has been completed before generating estimate
- No images provided: Damage analysis requires at least one image; upload images before submitting or analyzing
- AI parsing failures: If the vision model returns non-JSON or malformed content, the system falls back to safe defaults; re-run analysis or provide clearer images
- Policy not linked: Without a policy, no payout will be calculated; link a policy to enable deductible-based coverage computation
- File path resolution errors: Ensure uploads directory is correctly configured and accessible

Error handling patterns:
- Explicit checks for existence of required entities before proceeding
- Graceful fallbacks for AI parsing errors
- Consistent error responses via route handlers

**Section sources**
- [damageAnalysisService.ts:56-62](file://backend/src/services/damageAnalysisService.ts#L56-L62)
- [damageAnalysisService.ts:85-103](file://backend/src/services/damageAnalysisService.ts#L85-L103)
- [repairEstimateService.ts:114-116](file://backend/src/services/repairEstimateService.ts#L114-L116)
- [claims.ts:298-309](file://backend/src/routes/claims.ts#L298-L309)

## Conclusion
The Repair Estimate Service automates cost estimation by combining AI-driven damage analysis with structured pricing rules and policy data. It produces transparent, itemized estimates, supports insurance payout calculations, and integrates cleanly with the broader claims workflow. With configurable cost tables and severity-based rates, it can be adapted to different markets and vehicle types.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Cost Breakdown Structure
Each estimate item includes:
- Damage type and part name
- Part cost derived from predefined ranges
- Labor hours and labor rate based on severity
- Paint materials cost based on severity
- Subtotal per item

Aggregated totals include:
- Total parts cost
- Total labor cost (labor hours × labor rate + paint materials)
- Overall total cost
- Estimated repair days based on total labor hours

**Section sources**
- [repairEstimateService.ts:60-102](file://backend/src/services/repairEstimateService.ts#L60-L102)
- [repairEstimateService.ts:120-127](file://backend/src/services/repairEstimateService.ts#L120-L127)

### Adjustment Factors for Different Vehicle Types
Current implementation applies severity-based adjustments uniformly. To customize for vehicle types:
- Extend cost tables with vehicle class keys (e.g., compact, SUV, luxury)
- Adjust labor hours and parts ranges per vehicle class
- Integrate vehicle detection results to select appropriate adjustment factors

[No sources needed since this section proposes conceptual enhancements]

### Configure Pricing Models and Add New Parts Catalogs
To add new parts or adjust pricing:
- Update cost tables with new damage types, part categories, and severity ranges
- Define labor rates and paint materials for new severities or market regions
- Ensure damage analysis prompts return compatible damage types and affected parts lists

**Section sources**
- [repairEstimateService.ts:4-58](file://backend/src/services/repairEstimateService.ts#L4-L58)

### Customize Estimation Rules for Different Markets
Approach:
- Introduce market-specific multipliers or base rates
- Store market configuration in environment variables or database
- Apply market rules during cost calculation and payout computation

[No sources needed since this section proposes conceptual enhancements]

### Estimate Accuracy Metrics
Recommended metrics to track:
- Mean absolute percentage error (MAPE) comparing estimated vs actual repair costs
- Coverage accuracy: proportion of claims where estimated payout matches final payout
- Time-to-estimate: latency from submission to estimate availability
- AI parsing success rate: percentage of analyses returning valid JSON

[No sources needed since this section provides general guidance]