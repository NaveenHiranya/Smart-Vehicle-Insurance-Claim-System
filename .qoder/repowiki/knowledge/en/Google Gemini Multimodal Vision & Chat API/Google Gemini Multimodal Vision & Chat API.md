---
kind: external_dependency
name: Google Gemini Multimodal Vision & Chat API
slug: google-gemini
category: external_dependency
category_hints:
    - vendor_identity
    - sdk_real_api
scope:
    - '**'
---

### Identity
Google Gemini multimodal AI accessed via the `@google/generative-ai` SDK (`GoogleGenerativeAI`).

### Role in this repo
- Damage analysis: image upload → Gemini vision model detects dents, scratches, cracks, broken lights, bumper damage, glass damage, panel deformation and classifies severity (MINOR/MODERATE/SEVERE) plus drivability assessment.
- Document verification: uploaded license/registration/accident report/repair estimate scanned for readability and required fields.
- Claim assistant chat: contextual Q&A over a claim's images, documents, and estimated costs.

### Integration points
- `backend/src/utils/gemini.ts` — singleton `GoogleGenerativeAI` initialized from `GEMINI_API_KEY`; default model is `gemini-2.5-flash`.
- `backend/src/services/damageAnalysisService.ts` — sends full-vehicle + close-up images to Gemini for structured damage JSON.
- `backend/src/services/documentVerificationService.ts` — sends document images to Gemini for verification result.
- `backend/src/services/claimAssistantService.ts` — sends claim context + user messages to Gemini for chat responses.

### Durable usage notes
- The API key is injected via `process.env.GEMINI_API_KEY` (see `.env.example`); do not hardcode it.
- Verify exact method/params against the official `@google/generative-ai` docs when extending or upgrading the SDK.