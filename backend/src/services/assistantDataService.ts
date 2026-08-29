import prisma from '../utils/prisma.js';

// Read-only account snapshot for the AI assistants. Every query is hard-scoped
// to the authenticated user, and this module only ever calls find* — there is
// deliberately no create/update/delete path the chat could reach, even if the
// prompt is tricked. The assistant can quote the data back to the user and
// use it to guide them, but the only writes it makes are its own chat-log
// entries (in claimAssistantService.ts, not here).
export async function getUserSnapshot(userId: string): Promise<string> {
  const [user, vehicles, policies, claims] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        nic: true,
        createdAt: true,
      },
    }),
    prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        color: true,
        licensePlate: true,
        vehicleType: true,
        verificationStatus: true,
        valuation: true,
        insurancePolicy: {
          select: { coverageType: true, policyNumber: true },
        },
      },
    }),
    prisma.insurancePolicy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        providerName: true,
        policyNumber: true,
        coverageType: true,
        deductible: true,
        coveragePercent: true,
        premiumAmount: true,
        startDate: true,
        endDate: true,
        vehicle: {
          select: { make: true, model: true, licensePlate: true },
        },
      },
    }),
    prisma.claim.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        createdAt: true,
        incidentDate: true,
        incidentLocation: true,
        vehicle: {
          select: { make: true, model: true, licensePlate: true },
        },
        repairEstimate: { select: { totalCost: true, estimatedDays: true } },
        garageEstimate: { select: { totalCost: true, estimatedDays: true } },
        insurancePayout: { select: { estimatedPayout: true } },
        finalClaimableValue: true,
      },
    }),
  ]);

  if (!user) return 'YOUR DATA: account not found.';

  const lines: string[] = ['YOUR DATA (live, read-only account snapshot for the authenticated user):'];

  lines.push(
    `Account: ${user.firstName} ${user.lastName} (${user.email}), member since ${user.createdAt.toISOString().split('T')[0]}.`
  );

  lines.push(`Vehicles (${vehicles.length}):`);
  if (vehicles.length === 0) {
    lines.push('  none registered yet.');
  } else {
    for (const v of vehicles) {
      const policy = v.insurancePolicy
        ? `, policy ${v.insurancePolicy.coverageType} #${v.insurancePolicy.policyNumber}`
        : ', no policy attached yet';
      lines.push(
        `  - ${v.year} ${v.make} ${v.model} (${v.color}), plate ${v.licensePlate || 'n/a'}, type ${v.vehicleType}, verification ${v.verificationStatus}${
          v.valuation ? `, valuation Rs. ${v.valuation.toLocaleString()}` : ''
        }${policy} [id ${v.id}]`
      );
    }
  }

  lines.push(`Insurance policies (${policies.length}):`);
  if (policies.length === 0) {
    lines.push('  none.');
  } else {
    for (const p of policies) {
      const vehicle = p.vehicle
        ? ` for ${p.vehicle.make} ${p.vehicle.model} (${p.vehicle.licensePlate})`
        : '';
      lines.push(
        `  - ${p.providerName} #${p.policyNumber}, ${p.coverageType}, deductible Rs. ${p.deductible.toLocaleString()}, covers ${p.coveragePercent}%${vehicle}, valid ${p.startDate.toISOString().split('T')[0]} to ${p.endDate.toISOString().split('T')[0]}`
      );
    }
  }

  lines.push(`Recent claims (${claims.length}, newest first):`);
  if (claims.length === 0) {
    lines.push('  none.');
  } else {
    for (const c of claims) {
      const cost = c.garageEstimate?.totalCost ?? c.repairEstimate?.totalCost;
      const settled = c.finalClaimableValue ?? c.insurancePayout?.estimatedPayout;
      lines.push(
        `  - ${c.vehicle.make} ${c.vehicle.model} (${c.vehicle.licensePlate}), incident ${c.incidentDate.toISOString().split('T')[0]} at ${c.incidentLocation || 'n/a'}, status ${c.status}${
          cost ? `, estimate Rs. ${cost.toLocaleString()}` : ''
        }${settled ? `, claimable Rs. ${settled.toLocaleString()}` : ''} [id ${c.id}]`
      );
    }
  }

  return lines.join('\n');
}
