---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### AutoShield AI
- Definition：The product name of this project — an AI-powered vehicle insurance claim and damage assessment platform that lets policyholders submit claims, upload photos, receive AI-driven damage assessments and repair estimates, and manage the end-to-end claim lifecycle.
- Aliases：Autoshield AI、AutoShield

### Claim Status
- Definition：The workflow state machine for a claim in this system. Valid states are DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED → COMPLETED. Admins can move a claim between these states via quick-action buttons or the status dropdown on the admin detail page.
- Aliases：claim state、status

### Damage Assessment
- Definition：The AI-generated analysis of a claim's vehicle photos that identifies visible defects (dents, scratches, cracks, broken lights, bumper/glass/panel damage), classifies each as MINOR/MODERATE/SEVERE, and produces a drivability assessment and overall severity rating.
- Aliases：damage analysis、AI damage assessment

### Repair Estimate
- Definition：An itemized breakdown produced after damage assessment, listing parts costs, labor costs, total cost, and estimated repair days. It feeds into the subsequent Insurance Payout calculation.
- Aliases：estimate、repair cost estimate

### Insurance Payout
- Definition：The final calculated amount the insurer would pay on a claim, derived from the Repair Estimate minus the user's policy deductible. Stored alongside notes for auditability.
- Aliases：payout、estimated payout

### Document Verification
- Definition：AI-powered review of uploaded claim documents (LICENSE, REGISTRATION, ACCIDENT_REPORT, REPAIR_ESTIMATE) that marks them as PENDING, VERIFIED, ISSUES_FOUND, or UNREADABLE based on readability and required-field checks.
- Aliases：doc verification、verificationStatus

### Admin Panel
- Definition：The protected `/admin/*` section of the frontend (Dashboard, Users, Claims, Claim Detail, Documents) accessible only to users whose `isAdmin` flag is true. Admins can approve/reject claims, view all documents, and manage users.
- Aliases：admin dashboard、admin

### Claim Progress Checklist
- Definition：A user-facing checklist shown on the claim detail page that tracks the full claim lifecycle (9 steps) with ✅ done, ⏳ pending, ❌ issue indicators, plus contextual Suggestions and a Documents Approved by Insurance status list.
- Aliases：progress checklist、todo list、suggestions
