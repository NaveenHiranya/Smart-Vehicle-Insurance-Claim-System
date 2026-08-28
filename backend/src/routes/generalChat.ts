import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { startChatWithFallback } from '../utils/gemini.js';

const router = Router();
router.use(authMiddleware);

const SYSTEM_PROMPT = `You are the Flash Claim Assistant, a helpful AI for Flash Claim — a vehicle insurance claims platform in Sri Lanka.

You can answer questions about:
- How to file a claim (steps, required documents)
- How damage assessment and repair estimation works
- Insurance policies, coverage types, deductibles
- What documents are needed (license, registration, accident report)
- How to track claim status
- How garages are assigned and how garage estimates work
- General vehicle insurance questions relevant to Sri Lanka
- Currency is Sri Lankan Rupees (Rs. / LKR)

Keep answers concise, clear, and friendly. Use bullet points when listing steps. If a question is unrelated to vehicle insurance or the Flash Claim system, politely redirect.`;

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

    const history = [
      { role: 'user', parts: [{ text: `System:\n${SYSTEM_PROMPT}` }] },
      { role: 'model', parts: [{ text: "Hello! I'm the Flash Claim Assistant. How can I help you today?" }] },
      ...sessionHistory[userId],
    ];

    const { sendMessage } = await startChatWithFallback(history);
    const result = await sendMessage(message.trim());
    const reply = result.response.text();

    // Keep last 10 exchanges (20 messages) in memory
    sessionHistory[userId].push(
      { role: 'user', parts: [{ text: message.trim() }] },
      { role: 'model', parts: [{ text: reply }] }
    );
    if (sessionHistory[userId].length > 20) {
      sessionHistory[userId] = sessionHistory[userId].slice(-20);
    }

    res.json({ reply });
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
