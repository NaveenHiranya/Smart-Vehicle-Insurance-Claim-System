import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@flashclaim.com';
const ADMIN_PASSWORD = 'Admin@FlashClaim1';
// Legacy address from earlier deployments — migrated to ADMIN_EMAIL on first run
const LEGACY_EMAIL = 'admin@autoshield.com';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    // Ensure isAdmin is set if user already exists
    await prisma.user.update({ where: { email: ADMIN_EMAIL }, data: { isAdmin: true } });
    console.log('Admin user already exists — ensured isAdmin=true.');
    return;
  }

  // Credential change: rename the old admin row instead of creating a second
  // admin account, so the previous email/password stops working everywhere
  const legacy = await prisma.user.findUnique({ where: { email: LEGACY_EMAIL } });
  if (legacy) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.update({
      where: { email: LEGACY_EMAIL },
      data: { email: ADMIN_EMAIL, passwordHash, isAdmin: true },
    });
    console.log(`Admin user migrated to ${ADMIN_EMAIL} with new credentials.`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
    },
  });

  console.log(`Admin user created: ${ADMIN_EMAIL}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
