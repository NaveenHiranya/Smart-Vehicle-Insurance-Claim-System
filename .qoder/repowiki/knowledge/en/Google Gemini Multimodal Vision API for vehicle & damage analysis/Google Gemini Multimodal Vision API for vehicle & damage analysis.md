---
kind: external_dependency
name: Google Gemini Multimodal Vision API for vehicle & damage analysis
slug: google-gemini
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
---

### Google Gemini (Generative AI)
- Role: The sole external AI service used by AutoShield AI. It powers vehicle image detection (make/model/year/color/license plate), damage assessment, document verification, repair cost estimation, and the claim assistant chat.
- Integration point: `backend/src/utils/gemini.ts` initializes the client; `backend/src/services/{vehicleDetectionService,damageAnalysisService,documentVerificationService,repairEstimateService,claimAssistantService}.ts` call it via the `@google/generative-ai` SDK.
- Auth: Key is read from the `GEMINI_API_KEY` environment variable at runtime (read lazily per call so a hot-reloaded `.env` is always picked up). Obtain keys at https://aistudio.google.com/app/apikey.
- Model: The code references `gemini-2.5-flash`; if that model name is unavailable in your account, swap to another multimodal model supported by the SDK.