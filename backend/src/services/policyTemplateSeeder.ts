import prisma from '../utils/prisma.js';

// Default built-in insurance plans (LKR) — created automatically on startup so
// fresh environments (including production) always offer them.
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

// Idempotent: skips plans that already exist (matched by name + insurance type),
// so it is safe on every startup and never overwrites admin-created edits.
export async function seedPolicyTemplates(): Promise<void> {
  let created = 0;
  for (const t of DEFAULT_TEMPLATES) {
    const existing = await prisma.policyTemplate.findFirst({
      where: { name: t.name, coverageType: t.coverageType },
    });
    if (existing) continue;
    await prisma.policyTemplate.create({ data: t });
    created++;
  }
  if (created > 0) {
    const total = await prisma.policyTemplate.count();
    console.log(`Policy templates seeded: created ${created}, total ${total}.`);
  }
}
