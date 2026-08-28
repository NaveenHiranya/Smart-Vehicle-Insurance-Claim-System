import { getGeminiModel } from '../utils/gemini.js';
import prisma from '../utils/prisma.js';

const SYSTEM_PROMPT = `You are the Flash Claim Assistant, a helpful and knowledgeable AI that assists policyholders with their vehicle insurance claims in Sri Lanka.

Your responsibilities:
1. Answer questions about the claim status and next steps
2. Explain damage assessment results in plain language
3. Break down repair cost estimates in Sri Lankan Rupees (LKR/Rs.) and explain charges
4. Identify missing or incomplete documents
5. Guide users through the claim process step by step
6. Provide safety advice related to vehicle damage
7. Answer general insurance-related questions relevant to Sri Lanka

Be concise, professional, and empathetic. Use simple language.
All monetary values should be referenced in Sri Lankan Rupees (Rs. / LKR).
If you're unsure about something, say so and suggest the user contact their insurance provider directly.
Format your responses clearly with bullet points or numbered lists when appropriate.`;

export async function getChatResponse(claimId: string, userMessage: string) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      vehicle: true,
      policy: true,
      damageAssessment: true,
      repairEstimate: true,
      insurancePayout: true,
      documents: true,
      chatMessages: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!claim) {
    throw new Error('Claim not found');
  }

  // Build context from claim data
  const contextParts: string[] = [];

  contextParts.push(`Claim Status: ${claim.status}`);
  contextParts.push(`Vehicle: ${claim.vehicle.year} ${claim.vehicle.make} ${claim.vehicle.model} (${claim.vehicle.color})`);
  contextParts.push(`Incident Date: ${claim.incidentDate.toISOString().split('T')[0]}`);
  contextParts.push(`Incident Location: ${claim.incidentLocation}`);
  contextParts.push(`Description: ${claim.incidentDescription}`);

  if (claim.policy) {
    contextParts.push(`Insurance: ${claim.policy.providerName} - Policy #${claim.policy.policyNumber}`);
    contextParts.push(`Coverage: ${claim.policy.coverageType}, Deductible: Rs. ${claim.policy.deductible.toLocaleString()}`);
  }

  if (claim.damageAssessment) {
    const damages = claim.damageAssessment.damages as any[];
    contextParts.push(`Damage Assessment: ${damages.length} damage(s) detected, Overall Severity: ${claim.damageAssessment.overallSeverity}`);
    contextParts.push(`Drivability: ${claim.damageAssessment.drivabilityAssessment}`);
    damages.forEach((d: any, i: number) => {
      contextParts.push(`  Damage ${i + 1}: ${d.type} (${d.severity}) at ${d.location} - ${d.description}`);
    });
  }

  if (claim.repairEstimate) {
    contextParts.push(`Repair Estimate: Total Rs. ${claim.repairEstimate.totalCost.toLocaleString()} (Parts: Rs. ${claim.repairEstimate.totalPartsCost.toLocaleString()}, Labor: Rs. ${claim.repairEstimate.totalLaborCost.toLocaleString()})`);
    contextParts.push(`Estimated Repair Time: ${claim.repairEstimate.estimatedDays} day(s)`);
  }

  if (claim.insurancePayout) {
    contextParts.push(`Insurance Payout: Estimated Rs. ${claim.insurancePayout.estimatedPayout.toLocaleString()} (Deductible: Rs. ${claim.insurancePayout.deductible.toLocaleString()})`);
  }

  const docStatuses: string[] = [];
  const requiredDocs = ['LICENSE', 'REGISTRATION', 'ACCIDENT_REPORT'];
  for (const docType of requiredDocs) {
    const doc = claim.documents.find((d: any) => d.type === docType);
    if (doc) {
      docStatuses.push(`${docType}: ${doc.verificationStatus}`);
    } else {
      docStatuses.push(`${docType}: NOT UPLOADED`);
    }
  }
  contextParts.push(`Documents: ${docStatuses.join(', ')}`);

  const context = contextParts.join('\n');

  // Build conversation history
  const history = claim.chatMessages
    .reverse()
    .map((msg: any) => ({
      role: msg.role === 'USER' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

  const model = getGeminiModel();

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: `System Context:\n${SYSTEM_PROMPT}\n\nClaim Information:\n${context}` }] },
      { role: 'model', parts: [{ text: "I understand the claim context. I'm ready to assist the policyholder with their claim. How can I help?" }] },
      ...history,
    ],
  });

  const result = await chat.sendMessage(userMessage);
  const assistantResponse = result.response.text();

  // Save user message
  await prisma.chatMessage.create({
    data: {
      claimId,
      role: 'USER',
      content: userMessage,
    },
  });

  // Save assistant message
  const assistantMsg = await prisma.chatMessage.create({
    data: {
      claimId,
      role: 'ASSISTANT',
      content: assistantResponse,
    },
  });

  return {
    userMessage: { role: 'USER', content: userMessage },
    assistantMessage: { role: 'ASSISTANT', content: assistantResponse, id: assistantMsg.id, createdAt: assistantMsg.createdAt },
  };
}
