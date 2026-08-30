# Vehicle Management Page

<cite>
**Referenced Files in This Document**
- [VehiclesPage.tsx](file://frontend/src/pages/VehiclesPage.tsx)
- [index.ts (types)](file://frontend/src/types/index.ts)
- [vehicles.ts](file://backend/src/routes/vehicles.ts)
- [vehicleDetectionService.ts](file://backend/src/services/vehicleDetectionService.ts)
- [upload.ts](file://backend/src/middleware/upload.ts)
- [schema.prisma](file://backend/prisma/schema.prisma)
- [PoliciesPage.tsx](file://frontend/src/pages/PoliciesPage.tsx)
- [policies.ts](file://backend/src/routes/policies.ts)
- [index.ts (backend types)](file://backend/src/types/index.ts)
</cite>

## Update Summary
**Changes Made**
- Enhanced vehicle listing interface with comprehensive insurance status display showing verification states (verified, rejected, pending)
- Added detailed per-vehicle policy information including coverage details, deductible amounts, premium costs, and expiration dates
- Implemented claim availability indicators based on vehicle verification status
- Integrated insurance policy management with automatic re-verification when policies are updated or deleted
- Enhanced vehicle detail page with complete insurance policy card and verification status messaging
- **Updated**: Enhanced with VehicleType enum support for Sri Lankan vehicle classifications (CAR, SUV_PICKUP, VAN, LORRY_TRUCK, BUS, MOTORCYCLE, THREE_WHEELER, TRACTOR, OTHER)
- **Updated**: Updated VehiclesPage component with proper type casting and VEHICLE_TYPE_LABELS mapping for consistent display

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Vehicle Type Classification System](#vehicle-type-classification-system)
7. [Insurance Status Display System](#insurance-status-display-system)
8. [Policy Management Integration](#policy-management-integration)
9. [Dependency Analysis](#dependency-analysis)
10. [Performance Considerations](#performance-considerations)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Conclusion](#conclusion)

## Introduction
This document explains the Vehicles page that enables users to register and manage vehicles, view a list of their vehicles, inspect vehicle details, and file claims for a selected vehicle. The system now includes comprehensive insurance status tracking with verification states, detailed policy information display, and claim availability controls based on insurance verification. It covers:
- Listing vehicles with counts, quick navigation, and insurance verification status badges
- Viewing detailed vehicle information including make, model, year, VIN, license plate, color, mileage, and comprehensive insurance policy details
- Registering new vehicles via a form with validation, optional AI-assisted auto-fill from uploaded images, and optional insurance policy selection
- Data fetching patterns, error handling, and success feedback mechanisms
- Integration with vehicle detection services powered by Gemini
- Comprehensive insurance status display showing verification states (verified, rejected, pending), claim availability indicators, and per-vehicle policy information including coverage details and expiration dates
- **Enhanced**: Vehicle type classification system supporting Sri Lankan vehicle classifications with proper type safety and consistent display labels
- How vehicle data is structured across frontend types and backend schema

## Project Structure
The vehicle management feature spans both frontend and backend with enhanced insurance integration:
- Frontend pages and services handle UI, state, API calls, user interactions, and insurance status display
- Backend routes expose REST endpoints for CRUD operations, AI detection, and insurance policy management
- Prisma schema defines the Vehicle model with verification status, InsurancePolicy relationships, and PolicyTemplate associations
- Upload middleware handles image storage and validation for vehicle photos and AI detection

```mermaid
graph TB
subgraph "Frontend"
VP["VehiclesPage.tsx"]
PP["PoliciesPage.tsx"]
API["api.ts"]
Types["types/index.ts"]
BT["Backend Types"]
end
subgraph "Backend"
VR["routes/vehicles.ts"]
PR["routes/policies.ts"]
VDS["services/vehicleDetectionService.ts"]
UPL["middleware/upload.ts"]
PRISMA["prisma/schema.prisma"]
end
VP --> API
PP --> API
API --> VR
API --> PR
VR --> VDS
VR --> UPL
PR --> PRISMA
VR --> PRISMA
VP --> Types
PP --> Types
Types --> BT
```

**Diagram sources**
- [VehiclesPage.tsx:1-549](file://frontend/src/pages/VehiclesPage.tsx#L1-L549)
- [PoliciesPage.tsx:1-196](file://frontend/src/pages/PoliciesPage.tsx#L1-L196)
- [api.ts:1-40](file://frontend/src/services/api.ts#L1-L40)
- [vehicles.ts:1-204](file://backend/src/routes/vehicles.ts#L1-L204)
- [policies.ts:1-213](file://backend/src/routes/policies.ts#L1-L213)
- [vehicleDetectionService.ts:1-89](file://backend/src/services/vehicleDetectionService.ts#L1-L89)
- [upload.ts:1-54](file://backend/src/middleware/upload.ts#L1-L54)
- [schema.prisma:1-299](file://backend/prisma/schema.prisma#L1-L299)

**Section sources**
- [VehiclesPage.tsx:1-549](file://frontend/src/pages/VehiclesPage.tsx#L1-L549)
- [PoliciesPage.tsx:1-196](file://frontend/src/pages/PoliciesPage.tsx#L1-L196)
- [vehicles.ts:1-204](file://backend/src/routes/vehicles.ts#L1-L204)
- [schema.prisma:1-299](file://backend/prisma/schema.prisma#L1-L299)

## Core Components
- **Enhanced Vehicle listing interface**: Displays all user-owned vehicles with key fields, claim count, and comprehensive insurance verification status badges (Verified, Rejected, Pending)
- **Comprehensive Vehicle detail display**: Shows make, model, year, VIN, license plate, color, mileage, detailed insurance policy information including coverage type, deductible, premium amount, coverage percentage, and expiration date; supports deletion
- **Vehicle registration form**: Validates required fields, supports optional VIN and mileage, integrates AI detection via image upload to auto-fill fields, and includes optional insurance policy selection during registration
- **Data fetching**: Uses a centralized Axios instance to call backend endpoints with authentication headers and redirects on 401
- **Error handling**: Centralized 401 redirect; route-level errors returned as JSON messages; UI shows inline errors or alerts
- **Success feedback**: Inline success banner and automatic redirection after successful registration
- **Insurance status management**: Automatic re-verification triggers when policies are updated or deleted, ensuring claim availability reflects current insurance status
- **Enhanced Vehicle Type Support**: Proper type-safe vehicle classification with Sri Lankan vehicle types and consistent label mapping

**Section sources**
- [VehiclesPage.tsx:8-78](file://frontend/src/pages/VehiclesPage.tsx#L8-L78)
- [VehiclesPage.tsx:80-202](file://frontend/src/pages/VehiclesPage.tsx#L80-L202)
- [VehiclesPage.tsx:204-549](file://frontend/src/pages/VehiclesPage.tsx#L204-L549)
- [PoliciesPage.tsx:7-196](file://frontend/src/pages/PoliciesPage.tsx#L7-L196)
- [api.ts:1-40](file://frontend/src/services/api.ts#L1-L40)
- [vehicles.ts:34-204](file://backend/src/routes/vehicles.ts#L34-L204)

## Architecture Overview
The Vehicles page follows a client-server architecture with clear separation of concerns and enhanced insurance integration:
- The React page fetches and renders vehicle data via a typed API client with comprehensive insurance status display
- Backend routes enforce authentication and delegate to Prisma for persistence with insurance policy relationships
- Image uploads are handled by middleware before being processed by the detection service
- Detection results are used to pre-populate the registration form with proper vehicle type classification
- Insurance policy management automatically triggers re-verification processes when policies are modified

```mermaid
sequenceDiagram
participant User as "User"
participant FE as "VehiclesPage.tsx"
participant PP as "PoliciesPage.tsx"
participant API as "api.ts"
participant BE as "vehicles.ts"
participant PR as "policies.ts"
participant ML as "vehicleDetectionService.ts"
participant FS as "upload.ts"
participant DB as "Prisma Schema"
User->>FE : Open "Add Vehicle"
FE->>API : POST /vehicles/detect (FormData image)
API->>BE : POST /vehicles/detect
BE->>FS : Multer uploadImage.single('image')
FS-->>BE : File saved to disk
BE->>ML : detectVehicleFromImage(imagePath)
ML-->>BE : {make,model,year,color,licensePlate,vehicleType,confidence,...}
BE-->>API : JSON detection result
API-->>FE : Detection payload with vehicleType
FE->>FE : Auto-fill form fields from detection
User->>FE : Submit registration form with optional insurance
FE->>API : POST /vehicles (JSON body with insurance)
API->>BE : POST /vehicles
BE->>DB : Create Vehicle record with optional InsurancePolicy
DB-->>BE : Created vehicle with verificationStatus
BE-->>API : 201 + vehicle with verificationStatus
API-->>FE : Redirect to vehicle detail
Note over FE,DB : Insurance status displayed as Verified/Rejected/Pending
```

**Diagram sources**
- [VehiclesPage.tsx:204-549](file://frontend/src/pages/VehiclesPage.tsx#L204-L549)
- [PoliciesPage.tsx:29-57](file://frontend/src/pages/PoliciesPage.tsx#L29-L57)
- [api.ts:1-40](file://frontend/src/services/api.ts#L1-L40)
- [vehicles.ts:15-94](file://backend/src/routes/vehicles.ts#L15-L94)
- [policies.ts:183-213](file://backend/src/routes/policies.ts#L183-L213)
- [vehicleDetectionService.ts:46-89](file://backend/src/services/vehicleDetectionService.ts#L46-L89)
- [upload.ts:17-47](file://backend/src/middleware/upload.ts#L17-L47)
- [schema.prisma:32-100](file://backend/prisma/schema.prisma#L32-L100)

## Detailed Component Analysis

### Enhanced Vehicle Listing Interface
- Loads the current user's vehicles on mount and displays them in a responsive grid with comprehensive insurance status badges
- Each card shows make/model/year, license plate, color, mileage (if present), claim count, and verification status (Verified/Rejected/Pending)
- Empty state guides users to add a vehicle
- Navigation to detail page and registration form
- Verification status badges use color-coded indicators: green for verified, red for rejected, amber for pending
- **Enhanced**: Vehicle type icons dynamically change based on vehicle classification (car, truck, bus, motorcycle, etc.)

Data flow:
- GET /api/vehicles returns a list enriched with claim counts and insurance policy information
- Errors during fetch are caught and loading state is reset

**Updated** Enhanced with comprehensive insurance status display showing verification states and claim availability indicators, plus vehicle type-specific icons

**Section sources**
- [VehiclesPage.tsx:8-78](file://frontend/src/pages/VehiclesPage.tsx#L8-L78)
- [vehicles.ts:96-113](file://backend/src/routes/vehicles.ts#L96-L113)

### Comprehensive Vehicle Detail Display
- Fetches a single vehicle by ID and includes related claims and insurance policy details
- Displays core attributes: make, model, year, VIN, license plate, color, mileage
- Shows detailed insurance policy card with coverage type, deductible, premium amount, coverage percentage, and expiration date
- Provides a link to file a claim for this vehicle (only when verified)
- Supports deletion with confirmation and navigation back to the list
- Includes verification status messaging with specific guidance for each state
- **Enhanced**: Vehicle type display uses proper type casting and label mapping for consistent presentation

Error handling:
- If the vehicle is not found, the user is redirected to the vehicles list

**Updated** Enhanced with comprehensive insurance policy display, verification status messaging, and proper vehicle type handling

**Section sources**
- [VehiclesPage.tsx:80-202](file://frontend/src/pages/VehiclesPage.tsx#L80-L202)
- [vehicles.ts:115-144](file://backend/src/routes/vehicles.ts#L115-L144)

### Vehicle Registration Form
- Fields: vehicleType, make, model, year, license plate, color (required); vin, mileage (optional)
- Validation: HTML5 required and numeric constraints enforced; backend validates presence of required fields
- AI-assisted auto-fill:
  - Drag-and-drop or browse to upload a vehicle photo
  - Sends FormData to /vehicles/detect
  - On success, populates form fields where detection confidence is acceptable
  - Displays confidence level and additional info when available
  - **Enhanced**: Vehicle type is properly set from detection results with type safety
- Optional insurance policy selection during registration
- Submission workflow:
  - POST /vehicles with form values and optional insurance
  - On success, show a success banner and redirect to the newly created vehicle detail page
  - On error, display inline error message

```mermaid
flowchart TD
Start(["Open Add Vehicle"]) --> Upload["Upload vehicle image"]
Upload --> Detect{"Detect with AI?"}
Detect --> |Yes| CallAPI["POST /vehicles/detect"]
CallAPI --> Result{"Success?"}
Result --> |Yes| Fill["Auto-fill form fields<br/>with vehicleType"]
Result --> |No| ShowErr["Show detection error"]
Detect --> |No| Manual["Fill manually"]
Fill --> Insurance{"Add Insurance?"}
Manual --> Insurance
Insurance --> |Yes| SelectPlan["Select insurance plan"]
Insurance --> |No| Submit["Submit form"]
SelectPlan --> Submit
Submit --> Validate["Validate required fields"]
Post["POST /vehicles"]
Validate --> Post
Post --> Resp{"201 Created?"}
Resp --> |Yes| Success["Show success banner<br/>Redirect to detail"]
Resp --> |No| Err["Show error message"]
```

**Diagram sources**
- [VehiclesPage.tsx:204-549](file://frontend/src/pages/VehiclesPage.tsx#L204-L549)
- [vehicles.ts:34-94](file://backend/src/routes/vehicles.ts#L34-L94)

**Section sources**
- [VehiclesPage.tsx:204-549](file://frontend/src/pages/VehiclesPage.tsx#L204-L549)
- [vehicles.ts:34-94](file://backend/src/routes/vehicles.ts#L34-L94)

### Data Fetching Patterns
- Centralized Axios instance sets base URL and attaches Authorization header automatically
- Handles 401 responses by clearing auth state and redirecting to login
- For image uploads, Content-Type is left unset so the browser sets multipart boundary

**Section sources**
- [api.ts:1-40](file://frontend/src/services/api.ts#L1-L40)

### Error Handling and Success Feedback
- Frontend catches network and server errors, displaying inline messages or alerts
- Backend returns consistent JSON error objects with descriptive messages
- Success states include banners and automatic navigation
- Insurance policy updates trigger automatic re-verification status changes

**Updated** Enhanced with insurance policy change handling and automatic re-verification

**Section sources**
- [VehiclesPage.tsx:67-73](file://frontend/src/pages/VehiclesPage.tsx#L67-L73)
- [VehiclesPage.tsx:190-202](file://frontend/src/pages/VehiclesPage.tsx#L190-L202)
- [vehicles.ts:17-31](file://backend/src/routes/vehicles.ts#L17-L31)
- [vehicles.ts:59-62](file://backend/src/routes/vehicles.ts#L59-L62)
- [policies.ts:183-213](file://backend/src/routes/policies.ts#L183-L213)

### Integration with Vehicle Detection Service
- Upload middleware validates allowed image types and enforces size limits
- Detection service reads the uploaded image, sends it to Gemini with a strict prompt, and parses the response into a structured object
- Fallback behavior ensures a safe default when parsing fails
- **Enhanced**: Vehicle type classification is validated against the allowed VehicleType enum values

```mermaid
classDiagram
class UploadMiddleware {
+single(field)
+limits.fileSize
+fileFilter()
}
class DetectionService {
+detectVehicleFromImage(imagePath) VehicleDetectionResult
}
class Routes {
+POST /vehicles/detect
+POST /vehicles
+GET /vehicles
+GET /vehicles/ : id
+PUT /vehicles/ : id
+DELETE /vehicles/ : id
}
UploadMiddleware <.. Routes : "used by"
DetectionService <.. Routes : "called by"
```

**Diagram sources**
- [upload.ts:17-47](file://backend/src/middleware/upload.ts#L17-L47)
- [vehicleDetectionService.ts:46-89](file://backend/src/services/vehicleDetectionService.ts#L46-L89)
- [vehicles.ts:15-63](file://backend/src/routes/vehicles.ts#L15-L63)

**Section sources**
- [upload.ts:1-54](file://backend/src/middleware/upload.ts#L1-L54)
- [vehicleDetectionService.ts:1-89](file://backend/src/services/vehicleDetectionService.ts#L1-L89)
- [vehicles.ts:15-32](file://backend/src/routes/vehicles.ts#L15-L32)

### Data Model and Display Mapping
- Frontend Vehicle type mirrors backend Vehicle model, including optional fields, relations, and verification status
- Backend schema defines Vehicle with userId, make, model, year, vin, licensePlate, color, mileage, photos, verification status, and timestamps
- Detail page maps these fields directly to UI labels and values with comprehensive insurance policy display
- **Enhanced**: VehicleType enum provides type-safe vehicle classification with proper label mapping

**Updated** Enhanced with verification status fields, insurance policy relationships, and vehicle type classification

```mermaid
erDiagram
USER ||--o{ VEHICLE : owns
VEHICLE ||--o{ CLAIM : has
VEHICLE ||--|| INSURANCEPOLICY : insures
INSURANCEPOLICY }o--|| POLICYTEMPLATE : uses
VEHICLE {
string id PK
string userId FK
string make
string model
int year
string vin
string licensePlate
string color
int mileage
string photos
VehicleVerification verificationStatus
datetime verifiedAt
string verificationNotes
datetime createdAt
datetime updatedAt
}
INSURANCEPOLICY {
string id PK
string userId FK
string providerName
string policyNumber
string coverageType
float deductible
float premiumAmount
float coveragePercent
datetime startDate
datetime endDate
}
POLICYTEMPLATE {
string id PK
string name
string coverageType
float deductible
float coveragePercent
float annualFee
boolean isActive
}
```

**Diagram sources**
- [schema.prisma:10-100](file://backend/prisma/schema.prisma#L10-L100)

**Section sources**
- [index.ts (types):44-86](file://frontend/src/types/index.ts#L44-L86)
- [schema.prisma:32-100](file://backend/prisma/schema.prisma#L32-L100)

## Vehicle Type Classification System

### Sri Lankan Vehicle Classifications
The system implements a comprehensive vehicle type classification system specifically designed for Sri Lankan roads and traffic patterns:

- **CAR**: Hatchback, sedan, coupe vehicles
- **SUV_PICKUP**: SUVs, crossovers, pickup trucks
- **VAN**: Minivans, KDH-type vans
- **LORRY_TRUCK**: Lorries, trucks, heavy commercial vehicles
- **BUS**: Buses, coaches, public transport vehicles
- **MOTORCYCLE**: Motorcycles, scooters, mopeds
- **THREE_WHEELER**: Three-wheelers, tuk-tuks, auto-rickshaws
- **TRACTOR**: Agricultural tractors and farm equipment
- **OTHER**: Any vehicle type not fitting the above categories

### Type Safety and Consistent Display
- **Frontend Type Definition**: The `VehicleType` union type ensures type safety across the application
- **Label Mapping**: The `VEHICLE_TYPE_LABELS` constant provides consistent human-readable labels for all vehicle types
- **Dynamic Icons**: Vehicle type icons automatically adjust based on the vehicle classification (car, truck, bus, motorcycle, tractor)
- **AI Detection Integration**: The vehicle detection service classifies vehicles into these exact types using Gemini AI

### Implementation Details
- **Form Dropdown**: Vehicle type selection dropdown uses the predefined options array
- **Display Formatting**: All vehicle type displays use the label mapping for consistency
- **Validation**: Backend validates vehicle types against the allowed enum values
- **Repair Estimation**: Vehicle type affects repair cost calculations and pricing multipliers

**Section sources**
- [VehiclesPage.tsx:10-22](file://frontend/src/pages/VehiclesPage.tsx#L10-L22)
- [index.ts (types):48-62](file://frontend/src/types/index.ts#L48-L62)
- [vehicleDetectionService.ts:32-49](file://backend/src/services/vehicleDetectionService.ts#L32-L49)
- [vehicles.ts:56-57](file://backend/src/routes/vehicles.ts#L56-L57)

## Insurance Status Display System

### Verification States and Visual Indicators
The system implements a comprehensive insurance verification status system with three distinct states:

- **VERIFIED**: Green badge with checkmark icon - indicates vehicle and insurance policy have been verified by the insurance company, enabling claim filing
- **REJECTED**: Red badge with X icon - indicates verification was unsuccessful, requiring user action or support contact
- **PENDING**: Amber badge with alert icon - indicates verification is in progress, claims are temporarily unavailable

### Claim Availability Controls
- When verification status is VERIFIED, users can file claims through an active button
- When verification status is REJECTED or PENDING, claim filing is disabled with appropriate messaging
- The system automatically updates claim availability based on verification status changes

### Insurance Policy Information Display
Each vehicle detail page includes a comprehensive insurance policy card showing:
- Policy provider name and template name
- Coverage type and policy number
- Coverage percentage and deductible amount
- Premium amount and validity period
- Active/Expired status based on end date comparison

**Section sources**
- [VehiclesPage.tsx:25-45](file://frontend/src/pages/VehiclesPage.tsx#L25-L45)
- [VehiclesPage.tsx:145-163](file://frontend/src/pages/VehiclesPage.tsx#L145-L163)
- [PoliciesPage.tsx:103-115](file://frontend/src/pages/PoliciesPage.tsx#L103-L115)

## Policy Management Integration

### Automatic Re-verification Process
When insurance policies are updated or deleted, the system automatically triggers re-verification:
- Policy updates set vehicle verification status to PENDING and clear verified timestamp
- Policy deletion resets vehicle verification status to PENDING if it was previously VERIFIED
- This ensures claim availability accurately reflects current insurance status

### Policy Activation Workflow
Users can activate insurance plans for their vehicles through the Policies page:
- Select from available built-in insurance plans
- View plan details including coverage, deductible, and annual fee
- Activate plan with confirmation dialog
- Plan becomes associated with the vehicle and requires verification

### Policy Deletion Handling
Deleting an insurance policy triggers automatic re-verification:
- Vehicle verification status is reset to PENDING
- Claims become unavailable until new policy is activated and verified
- Users receive clear feedback about the impact of policy deletion

**Section sources**
- [policies.ts:183-213](file://backend/src/routes/policies.ts#L183-L213)
- [PoliciesPage.tsx:29-57](file://frontend/src/pages/PoliciesPage.tsx#L29-L57)
- [admin.ts:280-319](file://backend/src/routes/admin.ts#L280-L319)

## Dependency Analysis
- Frontend dependencies:
  - VehiclesPage depends on api client, types, and insurance status components
  - PoliciesPage depends on api client and vehicle/policy types
  - api client depends on environment configuration and local storage for tokens
- Backend dependencies:
  - vehicles routes depend on auth middleware, upload middleware, Prisma client, and detection service
  - policies routes depend on auth middleware and Prisma client for policy management
  - detection service depends on filesystem access and Gemini integration
  - upload middleware manages storage directories and file filtering

**Updated** Enhanced with policy management dependencies and automatic re-verification triggers

```mermaid
graph LR
VP["VehiclesPage.tsx"] --> API["api.ts"]
PP["PoliciesPage.tsx"] --> API
API --> VR["vehicles.ts"]
API --> PR["policies.ts"]
VR --> AUTH["auth middleware"]
VR --> UPL["upload.ts"]
VR --> VDS["vehicleDetectionService.ts"]
VR --> PRISMA["Prisma Client"]
PR --> PRISMA
VDS --> FS["Filesystem"]
VDS --> GEMINI["Gemini API"]
```

**Diagram sources**
- [VehiclesPage.tsx:1-6](file://frontend/src/pages/VehiclesPage.tsx#L1-L6)
- [PoliciesPage.tsx:1-5](file://frontend/src/pages/PoliciesPage.tsx#L1-L5)
- [api.ts:1-40](file://frontend/src/services/api.ts#L1-L40)
- [vehicles.ts:1-11](file://backend/src/routes/vehicles.ts#L1-L11)
- [policies.ts:1-10](file://backend/src/routes/policies.ts#L1-L10)
- [vehicleDetectionService.ts:1-4](file://backend/src/services/vehicleDetectionService.ts#L1-L4)
- [upload.ts:1-15](file://backend/src/middleware/upload.ts#L1-L15)

**Section sources**
- [VehiclesPage.tsx:1-6](file://frontend/src/pages/VehiclesPage.tsx#L1-L6)
- [PoliciesPage.tsx:1-5](file://frontend/src/pages/PoliciesPage.tsx#L1-L5)
- [api.ts:1-40](file://frontend/src/services/api.ts#L1-L40)
- [vehicles.ts:1-11](file://backend/src/routes/vehicles.ts#L1-L11)
- [policies.ts:1-10](file://backend/src/routes/policies.ts#L1-L10)
- [vehicleDetectionService.ts:1-4](file://backend/src/services/vehicleDetectionService.ts#L1-L4)
- [upload.ts:1-15](file://backend/src/middleware/upload.ts#L1-L15)

## Performance Considerations
- Minimize re-renders by keeping vehicle lists lightweight; only include necessary relations (e.g., claim counts, insurance policy summaries)
- Use optimistic UI updates sparingly; rely on server responses for consistency
- Limit image sizes via upload middleware to reduce bandwidth and processing time
- Cache vehicle lists at the application level if needed to avoid repeated fetches
- Optimize insurance policy queries to include only necessary template information
- Implement efficient verification status updates to minimize database writes
- **Enhanced**: Vehicle type classification adds minimal overhead while providing significant value for user experience and accurate repair estimates

## Troubleshooting Guide
Common issues and resolutions:
- No image uploaded for detection: Ensure a valid image is selected; backend returns a 400 error if missing
- Invalid image format: Only JPEG, PNG, and WebP are allowed; adjust file type accordingly
- Authentication failures: A 401 response clears token and redirects to login; ensure a valid token is stored
- Vehicle not found: Verify the vehicle ID and ownership; backend returns 404 if not found
- Parsing errors from detection: If Gemini response cannot be parsed, a safe fallback is returned; retry with a clearer image
- Insurance policy not activating: Check that the selected template is active and available; verify user permissions
- Verification status not updating: Ensure policy changes are properly propagated; check backend logs for errors
- Claim filing unavailable: Verify vehicle has VERIFIED status and active insurance policy; check for any pending re-verification
- **Enhanced**: Vehicle type issues - ensure vehicle type is one of the supported Sri Lankan classifications; check AI detection confidence levels

**Updated** Enhanced with insurance policy troubleshooting scenarios and vehicle type classification issues

**Section sources**
- [vehicles.ts:17-31](file://backend/src/routes/vehicles.ts#L17-L31)
- [upload.ts:30-41](file://backend/src/middleware/upload.ts#L30-L41)
- [api.ts:26-37](file://frontend/src/services/api.ts#L26-L37)
- [vehicles.ts:101-103](file://backend/src/routes/vehicles.ts#L101-L103)
- [vehicleDetectionService.ts:73-89](file://backend/src/services/vehicleDetectionService.ts#L73-L89)
- [policies.ts:183-213](file://backend/src/routes/policies.ts#L183-L213)

## Conclusion
The Vehicles page provides a complete lifecycle for vehicle management with comprehensive insurance status tracking and enhanced vehicle type classification:
- List, view details, and delete vehicles with integrated insurance policy display and vehicle type-specific icons
- Register new vehicles with robust validation, optional AI-assisted auto-fill, optional insurance policy selection, and proper vehicle type classification
- Reliable data fetching with centralized error handling and success feedback
- Clear integration points between frontend components, backend routes, upload middleware, and the vehicle detection service
- Comprehensive insurance status display showing verification states (verified, rejected, pending), claim availability indicators, and per-vehicle policy information including coverage details and expiration dates
- Automatic re-verification process ensuring claim availability accurately reflects current insurance status
- **Enhanced**: Vehicle type classification system supporting Sri Lankan vehicle classifications with proper type safety, consistent display labels, and dynamic visual indicators

**Updated** Enhanced with comprehensive insurance status management, policy integration capabilities, and robust vehicle type classification system

[No sources needed since this section summarizes without analyzing specific files]