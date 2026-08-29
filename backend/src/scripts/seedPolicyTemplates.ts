import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Default built-in insurance plans (LKR) — idempotent: skips types that already exist
const DEFAULT_TEMPLATES = [
  {
    name: 'Full Comprehensive',
    coverageType: 'Comprehensive',
    description: 'Full coverage for own damage, theft, fire and third-party liability. Covers 100% of repair costs after the deductible.',
    deductible: 25000,
    coveragePercent: 100,
    annualFee: 85000,
  },
  {
    name: 'Standard Comprehensive',
    coverageType: 'Comprehensive',
    description: 'Comprehensive cover with an 80% payout share after the deductible — lower annual fee.',
    deductible: 50000,
    coveragePercent: 80,
    annualFee: 55000,
  },
  {
    name: 'Third Party Plus',
    coverageType: 'Third Party',
    description: 'Third-party liability with limited own-damage cover. Pays 50% of own repair costs after the deductible.',
    deductible: 75000,
    coveragePercent: 50,
    annualFee: 28000,
  },
  {
    name: 'Third Party Only',
    coverageType: 'Third Party',
    description: 'Mandatory third-party liability only. Own damage is not covered — payout applies to third-party damage.',
    deductible: 100000,
    coveragePercent: 30,
    annualFee: 15000,
  },
];

async function main() {
  let created = 0;
  for (const t of DEFAULT_TEMPLATES) {
    const existing = await prisma.policyTemplate.findFirst({
      where: { name: t.name, coverageType: t.coverageType },
    });
    if (existing) continue;
    await prisma.policyTemplate.create({ data: t });
    created++;
  }
  const total = await prisma.policyTemplate.count();
  console.log(`Policy templates seeded. Created ${created}, total ${total}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
