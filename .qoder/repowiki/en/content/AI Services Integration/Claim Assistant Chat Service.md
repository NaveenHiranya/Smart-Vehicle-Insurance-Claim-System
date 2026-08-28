# Claim Assistant Chat Service

<cite>
**Referenced Files in This Document**
- [index.ts](file://backend/src/index.ts)
- [claims.ts](file://backend/src/routes/claims.ts)
- [claimAssistantService.ts](file://backend/src/services/claimAssistantService.ts)
- [gemini.ts](file://backend/src/utils/gemini.ts)
- [damageAnalysisService.ts](file://backend/src/services/damageAnalysisService.ts)
- [repairEstimateService.ts](file://backend/src/services/repairEstimateService.ts)
- [documentVerificationService.ts](file://backend/src/services/documentVerificationService.ts)
- [schema.prisma](file://backend/prisma/schema.prisma)
- [auth.ts](file://backend/src/middleware/auth.ts)
- [ClaimDetailPage.tsx](file://frontend/src/pages/ClaimDetailPage.tsx)
- [api.ts](file://frontend/src/services/api.ts)
</cite>

## Update Summary
**Changes Made**
- Updated chat functionality to use `startChatWithFallback()` for enhanced resilience against model failures
- Added automatic model fallback mechanism with logging of which model was used
- Maintained same conversational flow while improving reliability and error handling
- Enhanced model cascade system with retry logic and backoff strategies

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
This document explains the AI-powered chat assistant service that provides conversational support during vehicle insurance claims. It covers how conversation context is maintained across interactions, how natural language processing understands user queries about claim status, required documents, and policy coverage, and how responses are generated with appropriate disclaimers. The system now includes enhanced resilience through automatic model fallback mechanisms that ensure reliable operation even when primary models fail. It also details the conversation flows for common scenarios (filing new claims, checking status updates, resolving issues), integration with claim data for personalized assistance, and safety measures to prevent incorrect legal or financial advice.

## Project Structure
The backend exposes REST endpoints under /api/claims, including chat endpoints that persist messages and call an AI model to generate contextual responses. The frontend integrates a chat sidebar on the claim detail page, sending messages to the backend and displaying both user and assistant messages.

```mermaid
graph TB
FE["Frontend<br/>ClaimDetailPage.tsx"] --> API["Express App<br/>index.ts"]
API --> ClaimsRoutes["Claims Routes<br/>routes/claims.ts"]
ClaimsRoutes --> AssistantSvc["Claim Assistant Service<br/>services/claimAssistantService.ts"]
AssistantSvc --> Gemini["Gemini Client with Fallback<br/>utils/gemini.ts"]
ClaimsRoutes --> DB["Database<br/>prisma/schema.prisma"]
ClaimsRoutes --> DamageSvc["Damage Analysis<br/>services/damageAnalysisService.ts"]
ClaimsRoutes --> RepairSvc["Repair Estimate<br/>services/repairEstimateService.ts"]
ClaimsRoutes --> DocSvc["Document Verification<br/>services/documentVerificationService.ts"]
```

**Diagram sources**
- [index.ts:25-45](file://backend/src/index.ts#L25-L45)
- [claims.ts:400-447](file://backend/src/routes/claims.ts#L400-L447)
- [claimAssistantService.ts:1-128](file://backend/src/services/claimAssistantService.ts#L1-L128)
- [gemini.ts:1-142](file://backend/src/utils/gemini.ts#L1-L142)
- [damageAnalysisService.ts:50-153](file://backend/src/services/damageAnalysisService.ts#L50-L153)
- [repairEstimateService.ts:104-199](file://backend/src/services/repairEstimateService.ts#L104-L199)
- [documentVerificationService.ts:41-107](file://backend/src/services/documentVerificationService.ts#L41-L107)
- [schema.prisma:71-201](file://backend/prisma/schema.prisma#L71-L201)

**Section sources**
- [index.ts:25-45](file://backend/src/index.ts#L25-L45)
- [claims.ts:400-447](file://backend/src/routes/claims.ts#L400-L447)
- [ClaimDetailPage.tsx:57-67](file://frontend/src/pages/ClaimDetailPage.tsx#L57-L67)

## Core Components
- Conversation management: Persists per-claim chat history and reconstructs context from claim data before calling the AI model with enhanced fallback capabilities.
- Natural language understanding: Uses a system prompt and claim-specific context to guide the model's responses about status, documents, and coverage with automatic model switching.
- Response generation: Returns structured messages and persists them for UI rendering; includes guidance to avoid giving definitive legal/financial advice with improved error handling.
- Data integration: Reads vehicle, policy, damage assessment, repair estimate, payout, and document statuses to tailor answers.
- Safety measures: System prompt instructs cautious, non-binding guidance and directs users to contact their provider for authoritative decisions.
- **Enhanced Resilience**: Automatic model fallback system that tries multiple Gemini models in priority order, logs which model was used, and handles various failure scenarios gracefully.

**Section sources**
- [claimAssistantService.ts:1-128](file://backend/src/services/claimAssistantService.ts#L1-L128)
- [gemini.ts:1-142](file://backend/src/utils/gemini.ts#L1-L142)
- [schema.prisma:188-201](file://backend/prisma/schema.prisma#L188-L201)

## Architecture Overview
The chat flow begins at the frontend, which posts a message to the claims chat endpoint. The route validates ownership via authentication middleware, loads the claim and recent chat history, builds a rich context block, and calls the assistant service. The assistant service constructs a chat session using the enhanced `startChatWithFallback()` function, which automatically tries multiple Gemini models in priority order if the primary model fails. The system logs which model was successfully used for each session and maintains the same conversational flow while providing improved reliability.

```mermaid
sequenceDiagram
participant FE as "Frontend<br/>ClaimDetailPage.tsx"
participant API as "Express<br/>index.ts"
participant RT as "Claims Routes<br/>routes/claims.ts"
participant AS as "Assistant Service<br/>claimAssistantService.ts"
participant GM as "Gemini Client<br/>gemini.ts"
participant DB as "Database<br/>schema.prisma"
FE->>RT : POST /api/claims/ : id/chat {message}
RT->>RT : authMiddleware()
RT->>DB : Find claim by id + userId
RT-->>AS : getChatResponse(claimId, message)
AS->>DB : Load claim + related entities + last 20 messages
AS->>GM : startChatWithFallback(history)
GM->>GM : Try primary model (gemini-3.1-flash-lite)
alt Primary model fails
GM->>GM : Try fallback models (cascade)
GM-->>AS : sendMessage(userMessage)
else Primary model succeeds
GM-->>AS : sendMessage(userMessage)
end
AS->>DB : Save USER message
AS->>DB : Save ASSISTANT message
AS-->>RT : {userMessage, assistantMessage}
RT-->>FE : JSON response
FE->>FE : Render updated chat
```

**Diagram sources**
- [claims.ts:423-447](file://backend/src/routes/claims.ts#L423-L447)
- [claimAssistantService.ts:20-128](file://backend/src/services/claimAssistantService.ts#L20-L128)
- [gemini.ts:97-139](file://backend/src/utils/gemini.ts#L97-L139)
- [schema.prisma:71-201](file://backend/prisma/schema.prisma#L71-L201)

## Detailed Component Analysis

### Conversation Management System
- Context construction: Aggregates claim status, vehicle details, incident info, policy coverage, damage assessment summary, repair estimate totals, estimated payout, and document verification statuses into a single context string.
- History handling: Loads up to 20 recent messages per claim, reverses order for proper chat sequencing, and maps roles to model/user format for the AI session.
- Persistence: Stores each user and assistant message with role and timestamp, enabling persistent multi-turn conversations per claim.
- **Enhanced Model Selection**: Uses `startChatWithFallback()` to automatically select the best available Gemini model based on rate limits and availability, with detailed logging of which model was used.

```mermaid
flowchart TD
Start(["getChatResponse"]) --> LoadClaim["Load claim + relations + last 20 messages"]
LoadClaim --> BuildContext["Build context from claim fields"]
BuildContext --> BuildHistory["Map stored messages to chat history"]
BuildHistory --> StartChat["Start AI chat with fallback system"]
StartChat --> TryPrimary["Try primary model (gemini-3.1-flash-lite)"]
TryPrimary --> |Success| SendMsg["Send user message"]
TryPrimary --> |Failure| TryFallback["Try fallback models in cascade"]
TryFallback --> SendMsg
SendMsg --> GetResp["Receive assistant response"]
GetResp --> LogModel["Log which model was used"]
LogModel --> PersistUser["Persist USER message"]
PersistUser --> PersistAssist["Persist ASSISTANT message"]
PersistAssist --> Return(["Return messages"])
```

**Diagram sources**
- [claimAssistantService.ts:20-128](file://backend/src/services/claimAssistantService.ts#L20-L128)
- [gemini.ts:97-139](file://backend/src/utils/gemini.ts#L97-L139)

**Section sources**
- [claimAssistantService.ts:20-128](file://backend/src/services/claimAssistantService.ts#L20-L128)
- [gemini.ts:97-139](file://backend/src/utils/gemini.ts#L97-L139)
- [schema.prisma:188-201](file://backend/prisma/schema.prisma#L188-L201)

### Natural Language Processing Capabilities
- System prompt: Defines the assistant's role, responsibilities, tone, and boundaries (e.g., suggest contacting the provider when unsure).
- Context injection: Supplies claim-specific facts so the model can answer questions about status, documents, and coverage accurately.
- **Enhanced Model Usage**: Uses configurable Gemini model instances with automatic fallback capabilities, retry logic, and comprehensive error handling. The system now supports multiple Gemini models in a priority cascade and logs which model was successfully used for each session.

```mermaid
classDiagram
class ClaimAssistantService {
+getChatResponse(claimId, userMessage)
}
class GeminiClient {
+startChatWithFallback(history)
+generateContentWithFallback(content)
+getGeminiModel(modelName)
}
class Database {
+findUnique(Claim)
+create(ChatMessage)
}
class ModelCascade {
+MODEL_CASCADE : string[]
+MAX_RETRIES_PER_MODEL : number
+isRetryable(err) : boolean
}
ClaimAssistantService --> GeminiClient : "uses enhanced fallback"
GeminiClient --> ModelCascade : "implements cascade logic"
ClaimAssistantService --> Database : "reads/writes"
```

**Diagram sources**
- [claimAssistantService.ts:1-128](file://backend/src/services/claimAssistantService.ts#L1-L128)
- [gemini.ts:1-142](file://backend/src/utils/gemini.ts#L1-L142)
- [schema.prisma:71-201](file://backend/prisma/schema.prisma#L71-L201)

**Section sources**
- [claimAssistantService.ts:1-128](file://backend/src/services/claimAssistantService.ts#L1-L128)
- [gemini.ts:1-142](file://backend/src/utils/gemini.ts#L1-L142)

### Response Generation System
- Personalized replies: Uses claim context to explain current status, next steps, missing documents, and coverage implications.
- Disclaimers and safety: System prompt instructs cautious guidance and defers to the insurer for binding decisions.
- Message persistence: Both user and assistant messages are saved to maintain continuity across sessions.
- **Enhanced Error Handling**: Improved resilience through automatic model switching and retry logic ensures consistent response generation even when individual models fail.

```mermaid
sequenceDiagram
participant FE as "Frontend"
participant RT as "Claims Route"
participant AS as "Assistant Service"
participant GM as "Gemini with Fallback"
participant DB as "Database"
FE->>RT : POST /claims/ : id/chat
RT->>AS : getChatResponse
AS->>DB : Load context + history
AS->>GM : startChatWithFallback(history)
GM->>GM : Try primary model
alt Primary model fails
GM->>GM : Try fallback models
end
GM-->>AS : sendMessage(userMessage)
AS->>DB : Create USER message
AS->>DB : Create ASSISTANT message
AS-->>RT : {userMessage, assistantMessage}
RT-->>FE : JSON
```

**Diagram sources**
- [claims.ts:423-447](file://backend/src/routes/claims.ts#L423-L447)
- [claimAssistantService.ts:95-128](file://backend/src/services/claimAssistantService.ts#L95-L128)
- [gemini.ts:97-139](file://backend/src/utils/gemini.ts#L97-L139)

**Section sources**
- [claimAssistantService.ts:95-128](file://backend/src/services/claimAssistantService.ts#L95-L128)

### Conversation Flow Design for Common Scenarios
- Filing a new claim: Frontend guides users through uploading images and submitting; background AI analyzes damage and generates estimates; chat assistant explains next steps and required documents.
- Checking status updates: Users ask about current status; assistant reads claim status and related entities to provide clear updates.
- Resolving issues: If documents are unreadable or missing, assistant suggests re-uploading or clarifies requirements based on verification results.
- **Enhanced Reliability**: All conversation scenarios benefit from automatic model fallback, ensuring consistent service availability even during high traffic or model outages.

```mermaid
flowchart TD
A["User asks about claim"] --> B{"What is the question?"}
B --> |Status| C["Read claim.status + timeline"]
B --> |Documents| D["Check document types & verificationStatus"]
B --> |Coverage| E["Read policy.coverageType + deductible"]
C --> F["Explain next steps & ETA"]
D --> G["List missing/issue docs + actions"]
E --> H["Summarize coverage impact & deductible"]
F --> I["Use enhanced chat with fallback"]
G --> I
H --> I
I --> J["Persist & display response"]
```

**Diagram sources**
- [claimAssistantService.ts:41-84](file://backend/src/services/claimAssistantService.ts#L41-L84)
- [claims.ts:423-447](file://backend/src/routes/claims.ts#L423-L447)
- [gemini.ts:97-139](file://backend/src/utils/gemini.ts#L97-L139)

**Section sources**
- [claimAssistantService.ts:41-84](file://backend/src/services/claimAssistantService.ts#L41-L84)
- [claims.ts:423-447](file://backend/src/routes/claims.ts#L423-L447)

### Integration with Claim Data
- Entities used: Vehicle, policy, damage assessment, repair estimate, insurance payout, documents, and chat messages.
- Real-time personalization: Responses reflect current state (e.g., severity, drivability, estimated payout) to tailor guidance.
- **Enhanced Data Processing**: All data integration benefits from improved reliability through the fallback system, ensuring consistent access to claim information regardless of underlying model performance.

```mermaid
erDiagram
CLAIM ||--o{ CHATMESSAGE : "has many"
CLAIM ||--|| VEHICLE : "belongs to"
CLAIM ||--|| INSURANCEPOLICY : "linked to"
CLAIM ||--|| DAMAGEASSESSMENT : "has one"
CLAIM ||--|| REPAIRESTIMATE : "has one"
CLAIM ||--|| INSURANCEPAYOUT : "has one"
CLAIM ||--o{ DOCUMENT : "has many"
```

**Diagram sources**
- [schema.prisma:71-201](file://backend/prisma/schema.prisma#L71-L201)

**Section sources**
- [schema.prisma:71-201](file://backend/prisma/schema.prisma#L71-L201)

### Safety Measures and Disclaimers
- System prompt enforces cautious, non-binding guidance and encourages contacting the insurer for definitive decisions.
- Frontend displays safety warnings for severe damage assessments.
- Error paths avoid exposing internal errors to clients; generic error messages are returned.
- **Enhanced Safety Through Reliability**: The fallback system ensures that safety-critical operations remain available even during partial system failures, maintaining consistent safety standards.

**Section sources**
- [claimAssistantService.ts:4-18](file://backend/src/services/claimAssistantService.ts#L4-L18)
- [ClaimDetailPage.tsx:158-167](file://frontend/src/pages/ClaimDetailPage.tsx#L158-L167)
- [claims.ts:423-447](file://backend/src/routes/claims.ts#L423-L447)

## Dependency Analysis
- Authentication: All claims routes require a valid JWT via middleware.
- External services: Gemini model with enhanced fallback system is used for chat responses, damage analysis, and document verification.
- Data layer: Prisma schema defines relationships between claims, vehicles, policies, assessments, estimates, payouts, documents, and chat messages.
- **Enhanced Dependencies**: The system now depends on robust model fallback logic that manages multiple Gemini models with automatic switching and retry capabilities.

```mermaid
graph LR
Auth["auth.ts"] --> Claims["claims.ts"]
Claims --> Assistant["claimAssistantService.ts"]
Claims --> Damage["damageAnalysisService.ts"]
Claims --> Repair["repairEstimateService.ts"]
Claims --> Docs["documentVerificationService.ts"]
Assistant --> Gemini["gemini.ts with fallback"]
Damage --> Gemini
Docs --> Gemini
Claims --> Schema["schema.prisma"]
Gemini --> Models["Multiple Gemini Models"]
```

**Diagram sources**
- [auth.ts:5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [claims.ts:1-15](file://backend/src/routes/claims.ts#L1-L15)
- [claimAssistantService.ts:1-128](file://backend/src/services/claimAssistantService.ts#L1-L128)
- [damageAnalysisService.ts:1-154](file://backend/src/services/damageAnalysisService.ts#L1-L154)
- [repairEstimateService.ts:1-199](file://backend/src/services/repairEstimateService.ts#L1-L199)
- [documentVerificationService.ts:1-107](file://backend/src/services/documentVerificationService.ts#L1-L107)
- [gemini.ts:1-142](file://backend/src/utils/gemini.ts#L1-L142)
- [schema.prisma:71-201](file://backend/prisma/schema.prisma#L71-L201)

**Section sources**
- [auth.ts:5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [claims.ts:1-15](file://backend/src/routes/claims.ts#L1-L15)

## Performance Considerations
- Chat history window: Only the last 20 messages are loaded to control payload size and latency.
- Background processing: Damage analysis triggers asynchronously after submission to avoid blocking the submit flow.
- Efficient queries: Selective includes reduce over-fetching while still providing necessary context for the assistant.
- **Enhanced Performance**: The model cascade system optimizes performance by trying the fastest available model first (gemini-3.1-flash-lite with highest rate limits) and falling back to higher-quality models only when needed. Automatic retry logic with exponential backoff prevents overwhelming external APIs during transient failures.

## Troubleshooting Guide
- Missing environment variables: Startup validates required env vars and exits if any are absent.
- Authentication failures: Middleware rejects requests without a valid Bearer token.
- Chat errors: Route catches exceptions and returns a generic error; ensure claim exists and message is provided.
- File access issues: Damage analysis and document verification read files from disk; ensure upload paths exist and are accessible.
- **Enhanced Troubleshooting**: Monitor console logs for model fallback activity - look for messages like `[chatAssistant] Used model: gemini-X` to identify which model was successfully used. Check for fallback warnings indicating when primary models failed and fallback models were activated.

**Section sources**
- [index.ts:15-22](file://backend/src/index.ts#L15-L22)
- [auth.ts:5-22](file://backend/src/middleware/auth.ts#L5-L22)
- [claims.ts:423-447](file://backend/src/routes/claims.ts#L423-L447)
- [damageAnalysisService.ts:50-83](file://backend/src/services/damageAnalysisService.ts#L50-L83)
- [documentVerificationService.ts:41-74](file://backend/src/services/documentVerificationService.ts#L41-L74)
- [gemini.ts:61-85](file://backend/src/utils/gemini.ts#L61-L85)

## Conclusion
The claim assistant chat service delivers personalized, context-aware support throughout the claims lifecycle with enhanced reliability and resilience. It maintains conversation history per claim, leverages AI with automatic model fallback to understand and respond to user queries, and integrates deeply with claim data to provide accurate guidance. The new fallback system ensures consistent service availability by automatically switching between multiple Gemini models based on availability and rate limits, while logging which model was used for each session. Built-in safeguards and disclaimers help ensure responsible communication, while robust error handling and background processing improve reliability and performance. The enhanced architecture provides better fault tolerance and maintains the same high-quality conversational experience even during partial system failures.