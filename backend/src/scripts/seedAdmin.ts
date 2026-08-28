import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@autoshield.com';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Ensure isAdmin is set if user already exists
    await prisma.user.update({ where: { email }, data: { isAdmin: true } });
    console.log('Admin user already exists — ensured isAdmin=true.');
    return;
  }

  const passwordHash = await bcrypt.hash('Admin@1234', 12);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
    },
  });

  console.log('Admin user created:');
  console.log('  Email:    admin@autoshield.com');
  console.log('  Password: Admin@1234');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
