# Policy Management System

<cite>
**Referenced Files in This Document**
- [schema.prisma](file://backend/prisma/schema.prisma)
- [policies.ts](file://backend/src/routes/policies.ts)
- [claims.ts](file://backend/src/routes/claims.ts)
- [damageAnalysisService.ts](file://backend/src/services/damageAnalysisService.ts)
- [repairEstimateService.ts](file://backend/src/services/repairEstimateService.ts)
- [auth.ts](file://backend/src/middleware/auth.ts)
- [index.ts (types)](file://backend/src/types/index.ts)
- [PoliciesPage.tsx](file://frontend/src/pages/PoliciesPage.tsx)
- [api.ts](file://frontend/src/services/api.ts)
- [index.ts (frontend types)](file://frontend/src/types/index.ts)
- [policyTemplateSeeder.ts](file://backend/src/services/policyTemplateSeeder.ts)
- [payoutService.ts](file://backend/src/services/payoutService.ts)
- [admin.ts](file://backend/src/routes/admin.ts)
- [AdminPoliciesPage.tsx](file://frontend/src/pages/admin/AdminPoliciesPage.tsx)
- [index.ts (backend main)](file://backend/src/index.ts)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive policy template system with built-in insurance plans
- Implemented automated policy activation flow for users
- Enhanced policy management endpoints with GET/POST /api/policies/templates and POST /api/policies/activate
- Added coverage percentage calculation engine for payouts
- Integrated policy templates with admin management interface
- Updated payout calculation to use coverage percentages from templates

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
This document describes the enhanced policy management system for vehicle insurance within a claim processing application. The system now includes a comprehensive policy template system with built-in insurance plans (Full Comprehensive, Standard Comprehensive, Third Party Plus, Third Party Only), automated policy activation flow, and enhanced policy management capabilities. It covers policy creation through templates, coverage selection, premium calculation, lifecycle states, renewal considerations, validation rules, and integration with claims and payout calculations using coverage percentages.

## Project Structure
The system is organized into backend API routes, services, middleware, Prisma data models, and a React frontend that manages user interactions for policies and claims.

```mermaid
graph TB
subgraph "Frontend"
FE_Policies["PoliciesPage.tsx"]
FE_Admin["AdminPoliciesPage.tsx"]
FE_API["api.ts"]
end
subgraph "Backend"
AuthMW["auth.ts"]
Routes_Policies["routes/policies.ts"]
Routes_Admin["routes/admin.ts"]
Routes_Claims["routes/claims.ts"]
Service_Template["services/policyTemplateSeeder.ts"]
Service_Damage["services/damageAnalysisService.ts"]
Service_Estimate["services/repairEstimateService.ts"]
Service_Payout["services/payoutService.ts"]
DB["Prisma Schema (schema.prisma)"]
end
FE_Policies --> FE_API
FE_Admin --> FE_API
FE_API --> Routes_Policies
FE_API --> Routes_Admin
FE_API --> Routes_Claims
Routes_Policies --> AuthMW
Routes_Admin --> AuthMW
Routes_Claims --> AuthMW
Routes_Policies --> DB
Routes_Admin --> DB
Routes_Claims --> DB
Routes_Claims --> Service_Damage
Service_Damage --> Service_Estimate
Service_Estimate --> Service_Payout
Service_Template --> DB
```

**Diagram sources**
- [PoliciesPage.tsx:1-82](file://frontend/src/pages/PoliciesPage.tsx#L1-L82)
- [AdminPoliciesPage.tsx:1-195](file://frontend/src/pages/admin/AdminPoliciesPage.tsx#L1-L195)
- [api.ts:1-36](file://frontend/src/services/api.ts#L1-L36)
- [policies.ts:1-194](file://backend/src/routes/policies.ts#L1-L194)
- [admin.ts:140-339](file://backend/src/routes/admin.ts#L140-L339)
- [claims.ts:1-450](file://backend/src/routes/claims.ts#L1-L450)
- [policyTemplateSeeder.ts:1-56](file://backend/src/services/policyTemplateSeeder.ts#L1-L56)
- [damageAnalysisService.ts:1-154](file://backend/src/services/damageAnalysisService.ts#L1-L154)
- [repairEstimateService.ts:1-199](file://backend/src/services/repairEstimateService.ts#L1-L199)
- [payoutService.ts:1-67](file://backend/src/services/payoutService.ts#L1-L67)
- [schema.prisma:52-86](file://backend/prisma/schema.prisma#L52-L86)

**Section sources**
- [schema.prisma:10-86](file://backend/prisma/schema.prisma#L10-L86)
- [policies.ts:1-194](file://backend/src/routes/policies.ts#L1-L194)
- [claims.ts:1-450](file://backend/src/routes/claims.ts#L1-L450)
- [PoliciesPage.tsx:1-82](file://frontend/src/pages/PoliciesPage.tsx#L1-L82)
- [api.ts:1-36](file://frontend/src/services/api.ts#L1-L36)

## Core Components
- **Policy Template System**: Built-in insurance plans with predefined coverage levels, deductibles, and annual fees
  - Full Comprehensive: 100% coverage after Rs. 25,000 deductible, Rs. 85,000 annual fee
  - Standard Comprehensive: 80% coverage after Rs. 50,000 deductible, Rs. 55,000 annual fee
  - Third Party Plus: 50% coverage after Rs. 75,000 deductible, Rs. 28,000 annual fee
  - Third Party Only: 30% coverage after Rs. 100,000 deductible, Rs. 15,000 annual fee
- **Automated Policy Activation**: One-click activation of built-in plans with automatic policy creation
- **Enhanced Policy CRUD**: Traditional policy management with template-based creation
- **Coverage Percentage Engine**: Dynamic payout calculation based on plan coverage percentages
- **Claims Integration**: Claims automatically linked to active policies with coverage-aware payout calculation

Key responsibilities:
- Templates: Define standard insurance plans with coverage parameters
- Policies: Store individual policy instances linked to templates or custom configurations
- Payout Calculation: Apply deductibles and coverage percentages to determine claim payouts
- Admin Management: Create, edit, activate/deactivate policy templates

**Section sources**
- [schema.prisma:52-86](file://backend/prisma/schema.prisma#L52-L86)
- [policyTemplateSeeder.ts:5-38](file://backend/src/services/policyTemplateSeeder.ts#L5-L38)
- [policies.ts:12-72](file://backend/src/routes/policies.ts#L12-L72)
- [payoutService.ts:11-66](file://backend/src/services/payoutService.ts#L11-L66)

## Architecture Overview
The enhanced policy management workflow integrates template-based plan activation with automated policy creation and coverage-aware claim processing.

```mermaid
sequenceDiagram
participant UI as "Frontend (PoliciesPage)"
participant API as "Backend (policies.ts)"
participant DB as "Database (Prisma)"
participant CL as "Claims Route (claims.ts)"
participant PS as "Payout Service"
Note over UI,DB : Template-Based Policy Activation
UI->>API : GET /api/policies/templates
API->>DB : Query active templates
DB-->>API : Return built-in plans
API-->>UI : Templates (Full Comprehensive, etc.)
UI->>API : POST /api/policies/activate {templateId}
API->>DB : Create InsurancePolicy from template
DB-->>API : Policy created with coveragePercent
API-->>UI : 201 Created
Note over UI,DB : Claim Processing with Coverage
UI->>CL : POST /claims {vehicleId, policyId?, ...}
CL->>DB : Create Claim (optional policyId)
CL->>PS : recalculatePayout(claimId)
PS->>DB : Get policy.coveragePercent
PS->>DB : Calculate coveredAmount = (totalCost - deductible) × (coveragePercent/100)
DB-->>PS : Updated payout with coverage applied
CL-->>UI : Claim + coverage-aware payout
```

**Diagram sources**
- [policies.ts:12-72](file://backend/src/routes/policies.ts#L12-L72)
- [claims.ts:20-57](file://backend/src/routes/claims.ts#L20-L57)
- [payoutService.ts:11-66](file://backend/src/services/payoutService.ts#L11-L66)
- [policyTemplateSeeder.ts:42-56](file://backend/src/services/policyTemplateSeeder.ts#L42-L56)

## Detailed Component Analysis

### Policy Template System
**Updated** Added comprehensive policy template system with four built-in insurance plans that are automatically seeded on startup.

- **Built-in Plans**: 
  - Full Comprehensive: 100% coverage, Rs. 25,000 deductible, Rs. 85,000 annual fee
  - Standard Comprehensive: 80% coverage, Rs. 50,000 deductible, Rs. 55,000 annual fee  
  - Third Party Plus: 50% coverage, Rs. 75,000 deductible, Rs. 28,000 annual fee
  - Third Party Only: 30% coverage, Rs. 100,000 deductible, Rs. 15,000 annual fee
- **Template Management**: Admins can create, edit, activate/deactivate, and delete policy templates
- **Automatic Seeding**: Default templates are created on server startup using idempotent seeding
- **Coverage Percentages**: Each template defines the percentage of repair costs covered after deductible

```mermaid
flowchart TD
Start(["Server Startup"]) --> Seed["seedPolicyTemplates()"]
Seed --> Check{"Templates exist?"}
Check -- No --> Create["Create default templates"]
Check -- Yes --> Skip["Skip existing templates"]
Create --> Log["Log created count"]
Skip --> Ready["System ready"]
Log --> Ready
```

**Diagram sources**
- [policyTemplateSeeder.ts:42-56](file://backend/src/services/policyTemplateSeeder.ts#L42-L56)
- [index.ts:67-78](file://backend/src/index.ts#L67-L78)

**Section sources**
- [policyTemplateSeeder.ts:1-56](file://backend/src/services/policyTemplateSeeder.ts#L1-L56)
- [index.ts:67-78](file://backend/src/index.ts#L67-L78)
- [schema.prisma:52-66](file://backend/prisma/schema.prisma#L52-L66)

### Automated Policy Activation Flow
**Updated** Users can now activate built-in insurance plans with a single click, automatically creating policies with appropriate coverage terms.

- **Activation Endpoint**: `POST /api/policies/activate` accepts templateId and creates corresponding policy
- **Automatic Configuration**: Policy fields (coverageType, deductible, premiumAmount, coveragePercent) are populated from template
- **User Fee Synchronization**: User's annualFee field is updated to match activated plan's annualFee
- **One-Year Duration**: Activated policies run for one year from activation date
- **Confirmation Workflow**: Frontend shows plan details before activation confirmation

```mermaid
flowchart TD
UserClick["User clicks Activate Plan"] --> Confirm["Show plan details & confirm"]
Confirm --> |Yes| API["POST /api/policies/activate"]
Confirm --> |No| Cancel["Cancel activation"]
API --> Validate["Validate templateId exists & active"]
Validate --> Create["Create InsurancePolicy from template"]
Create --> Sync["Update user.annualFee"]
Sync --> Success["Return created policy"]
```

**Diagram sources**
- [policies.ts:26-72](file://backend/src/routes/policies.ts#L26-L72)
- [PoliciesPage.tsx:25-37](file://frontend/src/pages/PoliciesPage.tsx#L25-L37)

**Section sources**
- [policies.ts:26-72](file://backend/src/routes/policies.ts#L26-L72)
- [PoliciesPage.tsx:25-37](file://frontend/src/pages/PoliciesPage.tsx#L25-L37)

### Enhanced Policy Creation Workflow
**Updated** Policy creation now supports both traditional manual entry and template-based activation.

- **Template-Based Creation**: `POST /api/policies/activate` creates policies from built-in plans
- **Manual Creation**: `POST /api/policies` continues to support custom policy creation
- **Template Selection**: Frontend displays available templates grouped by insurance type
- **Field Mapping**: Template fields map directly to policy fields (coverageType, deductible, premiumAmount, coveragePercent)

```mermaid
flowchart TD
Start(["Create Policy"]) --> Choice{"Creation Method"}
Choice -- Template --> TemplateFlow["GET /api/policies/templates"]
Choice -- Manual --> ManualFlow["Fill form fields"]
TemplateFlow --> Select["Select built-in plan"]
Select --> Activate["POST /api/policies/activate"]
ManualFlow --> Validate["Validate required fields"]
Activate --> Success["Policy created from template"]
Validate --> Persist["Persist InsurancePolicy"]
Persist --> Success
```

**Diagram sources**
- [policies.ts:12-102](file://backend/src/routes/policies.ts#L12-L102)
- [PoliciesPage.tsx:13-21](file://frontend/src/pages/PoliciesPage.tsx#L13-L21)

**Section sources**
- [policies.ts:12-102](file://backend/src/routes/policies.ts#L12-L102)
- [PoliciesPage.tsx:13-21](file://frontend/src/pages/PoliciesPage.tsx#L13-L21)

### Coverage Calculation Engine
**Updated** Enhanced payout calculation now uses coverage percentages from policy templates to determine claim payouts.

- **Coverage Percentage Application**: Payout = max(0, totalCost - deductible) × (coveragePercent / 100)
- **Vehicle Valuation Cap**: Final payout capped at vehicle valuation if set
- **Template Integration**: Coverage percentages come from activated policy templates
- **Dynamic Recalculation**: Payouts recalculated when estimates change or policies are updated

```mermaid
flowchart TD
Claim["Claim Submitted"] --> GetPolicy["Get linked policy"]
GetPolicy --> CalcBase["Calculate baseTotal (garage/AI estimate)"]
CalcBase --> Deductible["Apply deductible: max(0, baseTotal - deductible)"]
Deductible --> Coverage["Apply coverage %: afterDeductible × (coveragePercent/100)"]
Coverage --> Cap{"Vehicle valuation set?"}
Cap -- Yes --> CapCalc["Cap at vehicle valuation"]
Cap -- No --> Finalize["Finalize payout"]
CapCalc --> Finalize
Finalize --> Store["Store InsurancePayout"]
```

**Diagram sources**
- [payoutService.ts:11-66](file://backend/src/services/payoutService.ts#L11-L66)
- [claims.ts:290-314](file://backend/src/routes/claims.ts#L290-L314)

**Section sources**
- [payoutService.ts:11-66](file://backend/src/services/payoutService.ts#L11-L66)
- [claims.ts:290-314](file://backend/src/routes/claims.ts#L290-L314)

### Risk Assessment Factors and Pricing Algorithms
**Updated** Risk factors now include coverage percentage from policy templates in addition to damage severity and type.

- **Template-Based Pricing**: Annual fees determined by selected policy template
- **Coverage Level Impact**: Higher coverage percentages result in higher premiums
- **Deductible Relationship**: Lower deductibles typically correlate with higher coverage percentages
- **Risk Categories**: Different template categories (Comprehensive vs Third Party) have distinct pricing structures

**Section sources**
- [policyTemplateSeeder.ts:5-38](file://backend/src/services/policyTemplateSeeder.ts#L5-L38)
- [payoutService.ts:28-35](file://backend/src/services/payoutService.ts#L28-L35)

### Policy Status Management
**Updated** Policy status is now managed through template activation and expiration dates rather than explicit status fields.

- **Active Status**: Determined by comparing endDate with current date
- **Template Linking**: Policies maintain reference to source template via templateId
- **Expiration Handling**: Policies past their end date are treated as expired in UI
- **Template Deactivation**: Inactive templates cannot be used for new activations

**Section sources**
- [schema.prisma:68-86](file://backend/prisma/schema.prisma#L68-L86)
- [PoliciesPage.tsx:72-82](file://frontend/src/pages/PoliciesPage.tsx#L72-L82)

### Renewal Processing Automation
**Updated** Renewal workflows now leverage the template system for consistent policy terms.

- **Template-Based Renewals**: New policies created from existing templates ensure consistent terms
- **Annual Fee Updates**: User annualFee automatically synced with activated plan
- **Coverage Continuity**: Renewed policies maintain same coverage percentage as original
- **Admin-Assisted Renewals**: Admins can assign templates to users for standardized renewals

**Section sources**
- [policies.ts:61-65](file://backend/src/routes/policies.ts#L61-L65)
- [admin.ts:222-226](file://backend/src/routes/admin.ts#L222-L226)

### Policy Validation Rules
**Updated** Enhanced validation now includes coverage percentage constraints and template-specific validations.

- **Coverage Percentage Range**: Must be between 1-100% for all policy types
- **Template Validation**: Activated policies must reference active templates
- **Deductible Constraints**: Non-negative values enforced for all policies
- **Annual Fee Validation**: Non-negative values required for premium amounts
- **Template Field Overrides**: Admins can override template values during policy assignment

**Section sources**
- [policies.ts:28-40](file://backend/src/routes/policies.ts#L28-L40)
- [admin.ts:175-181](file://backend/src/routes/admin.ts#L175-L181)

### Examples: Custom Policy Types, Coverage Options, New Pricing Models
**Updated** The template system provides a foundation for extending policy types and pricing models.

- **Custom Templates**: Admins can create new policy templates with unique coverage combinations
- **Tiered Coverage**: Multiple templates per insurance type allow for different coverage tiers
- **Dynamic Pricing**: Templates enable flexible pricing based on coverage levels and risk factors
- **Market Segmentation**: Different templates can target various customer segments with tailored offerings

**Section sources**
- [AdminPoliciesPage.tsx:6-18](file://frontend/src/pages/admin/AdminPoliciesPage.tsx#L6-L18)
- [policyTemplateSeeder.ts:5-38](file://backend/src/services/policyTemplateSeeder.ts#L5-L38)

## Dependency Analysis
**Updated** Enhanced dependencies now include template management and coverage calculation services.

- **Template Dependencies**: Policy creation depends on PolicyTemplate model and seeder service
- **Coverage Dependencies**: Payout calculation depends on policy.coveragePercent field
- **Admin Dependencies**: Template management requires admin authentication and CRUD operations
- **Frontend Dependencies**: Policy pages depend on template APIs and activation endpoints

```mermaid
graph LR
Auth["auth.ts"] --> Pol["policies.ts"]
Auth --> Admin["admin.ts"]
Pol --> DB["schema.prisma"]
Admin --> DB
Pol --> Template["policyTemplateSeeder.ts"]
Template --> DB
Pol --> Payout["payoutService.ts"]
Payout --> DB
```

**Diagram sources**
- [auth.ts:5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [policies.ts:1-194](file://backend/src/routes/policies.ts#L1-L194)
- [admin.ts:140-339](file://backend/src/routes/admin.ts#L140-L339)
- [policyTemplateSeeder.ts:1-56](file://backend/src/services/policyTemplateSeeder.ts#L1-L56)
- [payoutService.ts:1-67](file://backend/src/services/payoutService.ts#L1-L67)
- [schema.prisma:52-86](file://backend/prisma/schema.prisma#L52-L86)

**Section sources**
- [auth.ts:5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [policies.ts:1-194](file://backend/src/routes/policies.ts#L1-L194)
- [admin.ts:140-339](file://backend/src/routes/admin.ts#L140-L339)

## Performance Considerations
**Updated** Performance considerations now include template caching and coverage calculation optimization.

- **Template Caching**: Active templates can be cached to reduce database queries
- **Coverage Calculation Optimization**: Coverage percentage calculations are lightweight but should be batched for multiple claims
- **Template Seeding Efficiency**: Idempotent seeding prevents unnecessary database operations on startup
- **Policy Lookup Optimization**: Include template relationships efficiently to avoid N+1 queries

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
**Updated** Common issues now include template-related problems and coverage calculation errors.

- **Template Not Found**: Ensure template exists and is active before activation
- **Coverage Percentage Errors**: Verify coverage percent is between 1-100%
- **Template Activation Failures**: Check template validity and user permissions
- **Payout Calculation Issues**: Verify policy has valid coveragePercent and deductible values
- **Template Seeding Problems**: Check database connectivity and seed script execution

**Section sources**
- [policies.ts:28-40](file://backend/src/routes/policies.ts#L28-L40)
- [admin.ts:175-181](file://backend/src/routes/admin.ts#L175-L181)
- [payoutService.ts:28-35](file://backend/src/services/payoutService.ts#L28-L35)

## Conclusion
The enhanced policy management system now provides a comprehensive solution for insurance policy administration through template-based plan management, automated activation workflows, and coverage-aware payout calculations. The system supports both traditional policy creation and modern template-based approaches, enabling flexible policy management while maintaining consistency through standardized templates. The integration of coverage percentages allows for nuanced claim processing that reflects actual insurance policy terms.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Enhanced Data Model Overview
```mermaid
erDiagram
USER {
uuid id PK
string email UK
boolean isAdmin
datetime createdAt
datetime updatedAt
float annualFee
}
VEHICLE {
uuid id PK
string userId FK
string make
string model
int year
string licensePlate
string color
int mileage
json photos
datetime createdAt
datetime updatedAt
float valuation
}
POLICY_TEMPLATE {
uuid id PK
string name
string coverageType
string description
float deductible
float coveragePercent
float annualFee
boolean isActive
datetime createdAt
datetime updatedAt
}
INSURANCE_POLICY {
uuid id PK
string userId FK
string providerName
string policyNumber
string coverageType
float deductible
float premiumAmount
float coveragePercent
string templateId FK
datetime startDate
datetime endDate
datetime createdAt
datetime updatedAt
}
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
datetime createdAt
datetime updatedAt
}
DAMAGE_ASSESSMENT {
uuid id PK
string claimId FK
json damages
string drivabilityAssessment
enum overallSeverity
json aiRawResponse
datetime assessedAt
}
REPAIR_ESTIMATE {
uuid id PK
string claimId FK
string damageAssessmentId FK
json items
float totalPartsCost
float totalLaborCost
float totalCost
int estimatedDays
datetime createdAt
}
INSURANCE_PAYOUT {
uuid id PK
string claimId FK
string repairEstimateId FK
float deductible
float coveredAmount
float estimatedPayout
string notes
datetime createdAt
}
USER ||--o{ VEHICLE : owns
USER ||--o{ INSURANCE_POLICY : has
USER ||--o{ CLAIM : submits
VEHICLE ||--o{ CLAIM : involved_in
POLICY_TEMPLATE ||--o{ INSURANCE_POLICY : generates
INSURANCE_POLICY ||--o{ CLAIM : covers
CLAIM ||--|| DAMAGE_ASSESSMENT : has
CLAIM ||--|| REPAIR_ESTIMATE : has
REPAIR_ESTIMATE ||--|| INSURANCE_PAYOUT : generates
```

**Diagram sources**
- [schema.prisma:10-86](file://backend/prisma/schema.prisma#L10-L86)
- [schema.prisma:99-192](file://backend/prisma/schema.prisma#L99-L192)