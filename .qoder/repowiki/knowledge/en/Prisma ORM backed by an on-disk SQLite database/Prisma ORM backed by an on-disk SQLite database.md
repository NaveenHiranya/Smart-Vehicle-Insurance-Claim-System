---
kind: external_dependency
name: Prisma ORM backed by an on-disk SQLite database
slug: prisma-sqlite
category: external_dependency
category_hints:
    - migration_status
    - client_constraint
scope:
    - '**'
---

### Prisma + SQLite
- Role: Data layer for all entities (User, Vehicle, InsurancePolicy, Claim, Document, ChatMessage, etc.).
- Database: SQLite file (`DATABASE_URL=file:./dev.db`). Chosen because PostgreSQL was not installed locally; SQLite stores JSON natively and needs no server process.
- Migration: Use `npx prisma db push` (dev) or `npx prisma migrate dev` against the SQLite file. The schema defines enums `ClaimStatus`, `ImageType`, `SeverityLevel`, `DocumentType`, `VerificationStatus`, `ChatRole`.
- Persistence: Uploaded files live in `backend/uploads/` (images, documents); this directory must be mounted as persistent storage when deploying (Railway Volume / Render Disk / VPS path).