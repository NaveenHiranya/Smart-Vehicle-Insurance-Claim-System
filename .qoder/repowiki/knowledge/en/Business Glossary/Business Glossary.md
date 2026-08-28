---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### Claim
- Definition：A policyholder's reported vehicle incident, capturing incident date/location/description, weather conditions, police-report flag, and linked vehicle/policy. A Claim progresses through states DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → COMPLETED.
- Aliases：claim、insurance claim

### Damage Assessment
- Definition：AI-generated analysis of uploaded vehicle images identifying visible damage types (dents, scratches, cracks, broken lights, bumper, glass, panel deformation), assigning each a severity level (MINOR/MODERATE/SEVERE), and producing an overall drivability assessment.
- Aliases：damage analysis、damage detection

### Repair Estimate
- Definition：Itemized cost breakdown generated from the damage assessment, including parts cost, labor cost, total cost, and estimated repair days. Stored alongside the damage assessment and feeds into payout calculation.
- Aliases：repair cost estimate、estimate

### Insurance Payout
- Definition：Calculated reimbursement amount derived from the repair estimate after applying the policy's deductible and coverage terms; stored per claim and linked to both the claim and its repair estimate.
- Aliases：payout、estimated payout

### Document Verification
- Definition：AI-powered review of uploaded supporting documents (driver's license, vehicle registration, accident report, repair estimate) that checks readability, presence of required information, and flags issues; results recorded as PENDING/VERIFIED/ISSUES_FOUND/UNREADABLE.
- Aliases：doc verification、document check

### Full-Vehicle Photo / Damage Close-Up
- Definition：Two distinct image categories submitted with a claim: full-vehicle photos capture the overall condition of the car from multiple angles, while damage close-ups isolate individual damaged areas for detailed AI inspection.
- Aliases：full vehicle photo、close-up photo、damage photo

### Claim Assistant
- Definition：Context-aware AI chat service bound to a specific claim, able to answer questions about the claim status, explain estimated costs, identify missing documents, and guide users through next steps.
- Aliases：claim chat、assistant

### Claim Status
- Definition：Lifecycle state machine for a claim: DRAFT (in-progress creation), SUBMITTED (sent for review), UNDER_REVIEW (being evaluated), APPROVED (accepted), REJECTED (denied), COMPLETED (finalized).
- Aliases：status、claim lifecycle
