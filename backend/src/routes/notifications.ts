import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { listForUser, unreadCount, markRead, markAllRead } from '../services/notificationService.js';

const router = Router();
router.use(authMiddleware);

// GET /api/notifications — list + unread count in one call
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const [items, unread] = await Promise.all([listForUser(userId), unreadCount(userId)]);
    res.json({ items, unread });
  } catch (error) {
    console.error('Notifications list error:', error);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await markAllRead(req.userId!);
    res.json({ ok: true });
  } catch (error) {
    console.error('Mark-all-read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications read.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await markRead(req.userId!, req.params.id as string);
    res.json({ ok: true });
  } catch (error) {
    console.error('Mark-read error:', error);
    res.status(500).json({ error: 'Failed to mark notification read.' });
  }
});

export default router;
