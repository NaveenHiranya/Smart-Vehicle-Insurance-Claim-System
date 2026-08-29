import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { startChatWithFallback } from '../utils/gemini.js';
import { SYSTEM_KNOWLEDGE, RESPONSE_RULES, parseAssistantReply } from '../services/assistantKnowledge.js';
import { getUserSnapshot } from '../services/assistantDataService.js';

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

    // Extract navigation suggestions and strip markdown emphasis
    const { reply, suggestions } = parseAssistantReply(rawReply);

    // Keep last 10 exchanges (20 messages) in memory
    sessionHistory[userId].push(
      { role: 'user', parts: [{ text: message.trim() }] },
      { role: 'model', parts: [{ text: reply }] }
    );
    if (sessionHistory[userId].length > 20) {
      sessionHistory[userId] = sessionHistory[userId].slice(-20);
    }

    res.json({ reply, suggestions });
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
