# Vase Rest acceptance record

## Verified in repository

- PostgreSQL/Prisma is the only active cloud persistence path.
- Owner access uses Vase context; staff access uses branch-scoped PIN sessions.
- Active Rest and Edge sources are guarded against Supabase, legacy imports,
  hard-coded prototype authentication, fake provider success, and mock stores.
- Orders, promotions, tables, reservations, kitchen, cash, inventory, customer
  accounts, payments, fiscal documents, delivery commands, printing, and Edge
  synchronization use persisted state and idempotent commands.
- Offline commands use SQLite WAL/outbox and are revalidated independently by
  PostgreSQL on synchronization.
- Branch configuration supports tenant, branch-group, and branch inheritance.
- The Windows package has pinned inputs, signature verification, health deadline,
  automatic update checks, and MSI rollback.

The exact command evidence belongs in the release record:

```text
npm test -- --run
npm test --workspace @vase/rest-edge
npm run typecheck --workspace @vase/rest
npm run typecheck --workspace @vase/rest-edge
npm run build --workspace @vase/rest
npx prisma validate --schema apps/vase-rest/prisma/schema.prisma
```

## Evidence that cannot be simulated

The following remain `PENDING_EXTERNAL_EVIDENCE` until performed against the
real provider, authority, hardware, or infrastructure:

| Gate | Required evidence |
| --- | --- |
| ARCA | Homologation and production authorization for the tenant CUIT/POS |
| Mercado Pago | Production OAuth/webhook/reconciliation and terminal test |
| Delivery | Approved provider contract plus official sandbox/production tests |
| ESC/POS | Network and Windows spooler output from supported physical printers |
| Windows | Signed MSI clean install, upgrade, failed-health rollback, uninstall |
| PostgreSQL | Encrypted backup restored and reconciled in an isolated environment |
| Pilot | Real branch report proving no lost/duplicated orders or money movements |
| Upstream advisories | Upgrade evidence when Next/Auth publish patched releases |

No row may be marked accepted from a mock, sample order, fabricated CAE, local
success stub, or unverified provider response.
