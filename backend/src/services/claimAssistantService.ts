import { startChatWithFallback } from '../utils/gemini.js';
import prisma from '../utils/prisma.js';
import { SYSTEM_KNOWLEDGE, RESPONSE_RULES, parseAssistantReply } from './assistantKnowledge.js';

const CLAIM_CHAT_RULES = `CLAIM-SPECIFIC ASSISTANT
You are helping the policyholder with ONE specific claim. The claim data follows below. Use it together with the general Flash Claim knowledge to answer questions about this claim's status, damage assessment, repair costs, documents and next steps.

${RESPONSE_RULES}`;

const SYSTEM_PROMPT = [SYSTEM_KNOWLEDGE, '', CLAIM_CHAT_RULES].join('\n');

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

  const { sendMessage, modelUsed } = await startChatWithFallback([
    { role: 'user', parts: [{ text: `System Context:\n${SYSTEM_PROMPT}\n\nClaim Information:\n${context}` }] },
    { role: 'model', parts: [{ text: "I understand the claim context. I'm ready to assist the policyholder with their claim. How can I help?" }] },
    ...history,
  ]);
  console.log(`[chatAssistant] Used model: ${modelUsed}`);

  const result = await sendMessage(userMessage);
  const { reply, suggestions } = parseAssistantReply(result.response.text());

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
      content: reply,
    },
  });

  return {
    userMessage: { role: 'USER', content: userMessage },
    assistantMessage: { role: 'ASSISTANT', content: reply, id: assistantMsg.id, createdAt: assistantMsg.createdAt },
    suggestions,
  };
}
