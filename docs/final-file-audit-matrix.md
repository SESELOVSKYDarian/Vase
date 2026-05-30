# Final File Audit Matrix

Date: 2026-05-29

## Keep

| File/Area | Decision | Reason |
|---|---|---|
| `src/components/ui/crud-modal.tsx` | Keep | Core modal-first primitive reused across admin sections. |
| `src/components/ui/action-toast.tsx` | Keep | Standard mutation feedback mechanism. |
| `src/components/admin/admin-support-tickets-workspace.tsx` | Keep (refactor later) | High-value orchestration layer for support operations. |
| `src/components/admin/admin-clients-payments-workspace.tsx` | Keep (refactor later) | Consolidates payment/client operations required by business flow. |
| `src/components/admin/admin-meetings-workspace.tsx` | Keep | New canonical admin meetings UI with modal CRUD. |
| `src/app/(platform)/app/admin/meetings/*` | Keep | Dedicated meetings section resolves prior route coupling with customizations. |
| `src/server/queries/v2-dashboards.ts` | Keep | Canonical incremental V2 dashboard query layer. |
| `src/server/queries/access-contract.ts` | Keep | Required for centralized permission contract. |

## Refactor

| File/Area | Decision | Reason |
|---|---|---|
| `src/components/admin/admin-clients-payments-workspace.tsx` | Refactor | Large component; split into toolbar, clients table, payments table, and modal modules. |
| `src/components/admin/admin-support-tickets-workspace.tsx` | Refactor | Large modal orchestration; extract tab panels and row actions. |
| `src/app/(platform)/app/admin/actions.ts` | Refactor | Very large action file; split by domain (users, finance, meetings, deployments). |
| Prisma casts to `unknown as { ... }` in V2 bridges | Refactor | Replace with typed Prisma client after schema/client synchronization. |

## Candidate Cleanup (Safe, after verification)

| File/Area | Decision | Reason |
|---|---|---|
| Duplicated label paths in admin nav (support/knowledge) | Clean naming | Avoid UX ambiguity in sidebar labels. |
| Temporary migration/backfill scripts (`scripts/backfill-v2-bridges.ts`) | Keep with docs | Keep but document as one-off/admin-run script to avoid accidental runtime use. |
| Legacy-to-V2 adapter comments | Expand docs | Clarify coexistence boundaries to avoid future duplicate implementations. |

## Architecture Validation Notes

- Business and Labs separation is preserved by routes and link constants:
  - Business workspace: `/app/business`
  - Labs workspace: `/app/labs`
  - External business editor origin: `https://editor.vase.ar`
- No migration reset strategy was introduced; coexistence remains incremental.
