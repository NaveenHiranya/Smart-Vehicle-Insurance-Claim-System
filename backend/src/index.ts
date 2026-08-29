import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import policyRoutes from './routes/policies.js';
import claimRoutes from './routes/claims.js';
import adminRoutes from './routes/admin.js';
import garageAuthRoutes from './routes/garageAuth.js';
import garageRoutes from './routes/garage.js';
import generalChatRoutes from './routes/generalChat.js';
import prisma from './utils/prisma.js';
import { seedPolicyTemplates } from './services/policyTemplateSeeder.js';

dotenv.config();

// ── Startup validation ────────────────────────────────────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'GEMINI_API_KEY', 'DATABASE_URL'] as const;
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[startup] Copy backend/.env.example to backend/.env and fill in the values.');
  process.exit(1);
}
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/garage/auth', garageAuthRoutes);
app.use('/api/garage', garageRoutes);
app.use('/api/general-chat', generalChatRoutes);

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.user.count();
    res.json({ status: 'ok', service: 'Flash Claim API', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', service: 'Flash Claim API', db: 'unreachable' });
  }
});

// Error handler
app.use(errorHandler);

(async () => {
  // Built-in policy plans must exist in every environment — production databases
  // start empty otherwise. Seeding is idempotent and never blocks startup on failure.
  try {
    await seedPolicyTemplates();
  } catch (error) {
    console.error('[startup] Policy template seeding failed:', error);
  }
  app.listen(PORT, () => {
    console.log(`Flash Claim server running on port ${PORT}`);
  });
})();

export default app;
