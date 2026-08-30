import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { startChatWithFallback } from '../utils/gemini.js';
import { SYSTEM_KNOWLEDGE, RESPONSE_RULES, FILING_A_PROBLEM, parseAssistantReply } from '../services/assistantKnowledge.js';
import { getUserSnapshot } from '../services/assistantDataService.js';
import prisma from '../utils/prisma.js';

const router = Router();
router.use(authMiddleware);

// In-memory short conversation history per session (keyed by userId)
const sessionHistory: Record<string, Array<{ role: string; parts: [{ text: string }] }>> = {};

// POST /api/general-chat
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    const userId = req.userId!;
    if (!sessionHistory[userId]) sessionHistory[userId] = [];

    // Fetch the user's live data so the assistant can answer with real numbers
    const userData = await getUserSnapshot(userId);

    const systemPrompt = [
      SYSTEM_KNOWLEDGE,
      '',
      FILING_A_PROBLEM,
      '',
      RESPONSE_RULES,
      '',
      userData,
    ].join('\n');

    const history = [
      { role: 'user', parts: [{ text: `System:\n${systemPrompt}` }] },
      { role: 'model', parts: [{ text: "Hello! I'm the Flash Claim Assistant. I know your account and can help with your vehicles, claims, policies and anything about the Flash Claim system. How can I help you today?" }] },
      ...sessionHistory[userId],
    ];

    const { sendMessage } = await startChatWithFallback(history);
    const result = await sendMessage(message.trim());
    const rawReply = result.response.text();

    // Extract navigation suggestions, strip markdown emphasis, capture any
    // problem report the assistant filed
    const { reply, suggestions, ticket } = parseAssistantReply(rawReply);

    // Persist a filed problem as a support ticket for the admin panel. The
    // claim link is only kept when the claim actually belongs to this user.
    let ticketCreated = false;
    if (ticket) {
      try {
        let claimId: string | null = null;
        if (ticket.claimId) {
          const claim = await prisma.claim.findUnique({
            where: { id: ticket.claimId, userId },
            select: { id: true },
          });
          claimId = claim?.id ?? null;
        }
        await prisma.supportTicket.create({
          data: {
            userId,
            claimId,
            subject: ticket.subject,
            message: ticket.message,
          },
        });
        ticketCreated = true;
      } catch (e) {
        // A failed ticket write must never break the chat reply
        console.error('Support ticket creation failed:', e);
      }
    }

    // Keep last 10 exchanges (20 messages) in memory
    sessionHistory[userId].push(
      { role: 'user', parts: [{ text: message.trim() }] },
      { role: 'model', parts: [{ text: reply }] }
    );
    if (sessionHistory[userId].length > 20) {
      sessionHistory[userId] = sessionHistory[userId].slice(-20);
    }

    res.json({ reply, suggestions, ticketCreated });
  } catch (error) {
    console.error('General chat error:', error);
    res.status(500).json({ error: 'Failed to get response.' });
  }
});

// DELETE /api/general-chat/history  (clear session)
router.delete('/history', (req: AuthRequest, res: Response) => {
  if (req.userId) delete sessionHistory[req.userId];
  res.json({ ok: true });
});

export default router;
