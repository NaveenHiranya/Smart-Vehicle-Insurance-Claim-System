---
kind: external_dependency
name: PostgreSQL Database
slug: postgresql
category: external_dependency
category_hints:
    - vendor_identity
    - client_constraint
scope:
    - '**'
---

### Identity
PostgreSQL relational database, configured as the Prisma datasource.

### Role in this repo
Persistent store for all domain entities: User, Vehicle, InsurancePolicy, Claim, ClaimImage, DamageAssessment, RepairEstimate, InsurancePayout, Document, ChatMessage.

### Integration points
- `backend/prisma/schema.prisma` — declares `datasource db { provider = "postgresql" }` with URL read from `DATABASE_URL`.
- `backend/.env.example` — sample connection string pointing at local Postgres on port 5432, database `autoshield_ai`, schema `public`.

### Durable usage notes
- All migrations are driven by Prisma (`prisma migrate dev`, `prisma push`); never alter the schema manually outside Prisma.
- The default example uses a local Docker-style Postgres; production deployments must supply a valid `DATABASE_URL` with appropriate credentials and TLS if needed.