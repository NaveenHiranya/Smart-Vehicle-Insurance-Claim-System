import dotenv from 'dotenv';
import prisma from '../utils/prisma.js';
import { seedPolicyTemplates } from '../services/policyTemplateSeeder.js';

dotenv.config();

// Manual entry point — seeding also runs automatically on server startup (src/index.ts)
seedPolicyTemplates()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
