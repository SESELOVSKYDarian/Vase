# Vase Rest Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Vase Rest prototype with a production-grade, multi-tenant restaurant product integrated into the Vase platform, backed by PostgreSQL and supported by a Windows Edge service for offline branch operation.

**Architecture:** Build the cloud product as an independent Next.js 16 workspace with server-only domain services and a dedicated PostgreSQL database. Integrate identity, entitlements, pricing, health, and support through versioned contracts, then add a Node/TypeScript Edge service with SQLite WAL, certificate enrollment, event replication, and local printing. Keep the legacy `noctua` and `backend-reservas` trees as read-only migration references until every production acceptance gate passes.

**Tech Stack:** Next.js 16.2.1 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma 6/PostgreSQL, Zod 4, Vitest 4, Playwright, Node.js 22, SQLite WAL, Windows Service, AES-256-GCM, Mercado Pago APIs, ARCA WSAA/WSFEv1, official delivery provider APIs.

**Approved design:** `docs/superpowers/specs/2026-07-28-vase-rest-product-design.md`

---

## Delivery sequence

This program is intentionally ordered so every phase leaves a buildable, testable product:

1. Platform registration and cloud foundation
2. Tenant, branches, entitlements, and owner onboarding
3. Local staff, devices, configuration scopes, and product shell
4. Catalog, inventory, salon, reservations, orders, and KDS
5. Edge continuity, synchronization, Windows service, and printing
6. Cash, payments, Mercado Pago, and ARCA
7. Delivery providers, analytics, support, administration, and GA hardening

Do not begin a later phase while the current phase's focused tests, workspace typecheck, Prisma validation, and build are failing.

## Phase 1 — Platform registration and cloud foundation

### Task 1: Preserve the prototype safely

**Files:**
- Review: `apps/vase-rest/**`
- Modify: `apps/vase-rest/.gitignore`
- Create: `docs/migrations/vase-rest-legacy-inventory.md`

- [ ] Run `git status --short --ignored apps/vase-rest` and `rg -n "(service_role|SUPABASE_.*KEY|BEGIN (RSA |EC )?PRIVATE KEY|access[_-]?token|client_secret)" apps/vase-rest --glob "!**/package-lock.json" --glob "!**/*.example"`; confirm no credential value is eligible for commit.
- [ ] Document the legacy pages, stores, services, database tables, mocks, unsafe auth paths, and production replacement owner in `docs/migrations/vase-rest-legacy-inventory.md`.
- [ ] Extend the Rest ignore file for local SQLite files, certificates, Edge enrollment artifacts, provider fixtures containing personal data, and generated installers.
- [ ] Run `git diff --check` and confirm only documentation/ignore changes are staged with the legacy source.
- [ ] Commit the untouched prototype plus inventory as `chore(rest): preserve legacy prototype for migration`.

### Task 2: Register Rest in shared platform contracts

**Files:**
- Modify: `packages/config/src/index.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/rest.ts`
- Modify: `tests/v3-contracts.test.ts`
- Modify: `tests/v3-workspace-structure.test.ts`

- [ ] Add failing assertions for service key `vase-rest`, product key `rest`, workspace `apps/vase-rest`, domain `rest.vase.ar`, package `@vase/rest`, and database service `postgres-rest`.
- [ ] Add Zod contracts for `RestPlan`, `RestPlanLimits`, `RestEntitlement`, `RestSessionContext`, `RestServiceStatus`, `RestEdgeEnrollment`, `RestSyncEvent`, and `RestHealth`.
- [ ] Fix the default plan map to the approved limits: Starter `1/15/5/1`, Growth `3/60/20/3`, Pro `10/250/75/10`; require explicit limits for Enterprise.
- [ ] Export the contracts from `packages/contracts/src/index.ts` and register Rest in `packages/config/src/index.ts`.
- [ ] Run `npx vitest run tests/v3-contracts.test.ts tests/v3-workspace-structure.test.ts` and confirm both pass.
- [ ] Commit as `feat(rest): register platform contracts`.

### Task 3: Replace the root Rest package with a V3 workspace

**Files:**
- Modify: `apps/vase-rest/package.json`
- Create: `apps/vase-rest/tsconfig.json`
- Create: `apps/vase-rest/next.config.ts`
- Create: `apps/vase-rest/postcss.config.mjs`
- Create: `apps/vase-rest/app/layout.tsx`
- Create: `apps/vase-rest/app/page.tsx`
- Create: `apps/vase-rest/app/globals.css`
- Create: `apps/vase-rest/app/icon.svg`
- Create: `apps/vase-rest/app/lib/db.ts`
- Create: `apps/vase-rest/prisma/schema.prisma`
- Create: `apps/vase-rest/prisma/migrations/20260728010000_rest_foundation/migration.sql`
- Create: `apps/vase-rest/.env.example`
- Create: `apps/vase-rest/README.md`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Add a failing workspace test that expects `@vase/rest` scripts for dev on port 3009, build, start, typecheck, Prisma generation, and migration deployment.
- [ ] Configure the workspace with the root-pinned Next/React versions and dependencies on `@vase/auth`, `@vase/contracts`, `@vase/internal-api`, Prisma, Zod, bcryptjs, clsx, lucide-react, recharts, and Tailwind.
- [ ] Create the initial PostgreSQL schema for `RestTenant`, `RestEntitlementProjection`, `Branch`, `BranchGroup`, `BranchGroupMember`, and `AuditEvent`, all with tenant-scoped unique constraints and indexes.
- [ ] Create the initial dark Vase shell using carbon, graphite, jade, sage, Manrope, and IBM Plex Mono; do not import the legacy purple theme.
- [ ] Add `.env.example` entries for `DATABASE_URL`, shared auth/session values, internal URLs/tokens, encryption keys, Redis, public URL, and port.
- [ ] Run `npm install --package-lock-only`, `npx prisma validate --schema apps/vase-rest/prisma/schema.prisma`, and `npm run typecheck --workspace @vase/rest`.
- [ ] Commit as `feat(rest): create cloud workspace`.

### Task 4: Add deploy and health infrastructure

**Files:**
- Create: `apps/vase-rest/app/lib/rest-readiness.ts`
- Create: `apps/vase-rest/app/api/health/live/route.ts`
- Create: `apps/vase-rest/app/api/health/ready/route.ts`
- Create: `apps/vase-rest/app/api/internal/admin/health/route.ts`
- Create: `apps/vase-rest/scripts/validate-runtime-env.js`
- Create: `apps/vase-rest/Dockerfile`
- Modify: `.env.easypanel.example`
- Modify: `docs/v3/easypanel.md`
- Modify: `tests/v3-health-routes.test.ts`
- Create: `tests/v3-rest-readiness.test.ts`
- Create: `tests/vase-rest-deploy.test.ts`

- [ ] Add failing tests for live status, database readiness, protected internal admin health, required runtime variables, port 3009, and Prisma migration deployment in the container command.
- [ ] Implement readiness with bounded database timeout and redacted check names.
- [ ] Build the Docker image using the root lockfile/workspace and run `prisma migrate deploy` before `next start`.
- [ ] Document EasyPanel service `vase-rest-app`, domain `rest.vase.ar`, port `3009`, and database `postgres-rest`.
- [ ] Run the three focused tests and `npm run build --workspace @vase/rest`.
- [ ] Commit as `feat(rest): add production deploy health`.

## Phase 2 — Tenant, entitlements, and owner onboarding

### Task 5: Add Rest plans and contracts to Vase App

**Files:**
- Modify: `apps/vase-app/prisma/schema.prisma`
- Create: `apps/vase-app/prisma/migrations/20260728020000_rest_plans_and_contracts/migration.sql`
- Modify: `apps/vase-app/src/config/modules.ts`
- Modify: `apps/vase-app/src/server/services/modules.ts`
- Create: `apps/vase-app/src/server/services/rest-entitlements.ts`
- Create: `apps/vase-app/src/server/services/rest-session-context.ts`
- Create: `apps/vase-app/src/app/api/internal/rest/session-context/route.ts`
- Create: `apps/vase-app/src/app/api/internal/admin/rest/plans/route.ts`
- Create: `tests/v3-rest-module.test.ts`
- Create: `tests/v3-rest-session-context.test.ts`
- Create: `tests/v3-rest-entitlements.test.ts`

- [ ] Add failing tests for module ID `vase_rest`, key `rest`, product enum `REST`, launcher route `https://rest.vase.ar`, automatic activation, and signed session context.
- [ ] Add versioned `RestPricingVersion`, `TenantRestContract`, and plan/limit fields; published versions are immutable and contracts retain their accepted version.
- [ ] Implement context resolution from global user, requested tenant, active membership, tenant Rest contract, plan, and limits.
- [ ] Protect internal routes with `SERVICE_TO_SERVICE_TOKEN` and parse all responses with shared Rest contracts.
- [ ] Run the focused tests and `npx prisma validate --schema apps/vase-app/prisma/schema.prisma`.
- [ ] Commit as `feat(app): add Vase Rest contracts`.

### Task 6: Add editable Rest plans to Vase Admin

**Files:**
- Create: `apps/vase-admin/app/rest-admin-workspace.tsx`
- Modify: `apps/vase-admin/app/page.tsx`
- Create: `apps/vase-admin/app/api/rest/plans/route.ts`
- Create: `apps/vase-admin/app/api/rest/health/route.ts`
- Modify: `apps/vase-admin/.env.example`
- Create: `tests/v3-rest-admin-plans.test.ts`
- Create: `tests/v3-rest-admin-health.test.ts`

- [ ] Add failing tests that Admin can list drafts, create a complete version, publish it once, reject incomplete/negative limits, and cannot mutate a published version.
- [ ] Implement the Admin UI for currency, monthly prices, branch/employee/device/Edge limits, effective date, draft validation, publish confirmation, and health summary.
- [ ] Proxy all mutations to Vase App internal endpoints with the service token; do not connect Admin to the App or Rest databases.
- [ ] Run focused tests and `npm run typecheck --workspace @vase/admin`.
- [ ] Commit as `feat(admin): manage Vase Rest plans`.

### Task 7: Resolve the owner session in Rest

**Files:**
- Create: `apps/vase-rest/app/lib/shared-session.ts`
- Create: `apps/vase-rest/app/lib/app-session-context.ts`
- Create: `apps/vase-rest/app/lib/request-context.ts`
- Create: `apps/vase-rest/app/lib/tenant-provisioning.ts`
- Create: `apps/vase-rest/app/api/internal/app/entitlements/route.ts`
- Create: `tests/v3-rest-shared-session.test.ts`
- Create: `tests/v3-rest-context-client.test.ts`
- Create: `tests/v3-rest-tenant-provisioning.test.ts`

- [ ] Add failing tests for shared/local cookie decoding, expiry, missing service token, inactive contract, cross-tenant request, and idempotent tenant provisioning.
- [ ] Reuse `@vase/auth` cookie names and NextAuth JWT decoding; resolve tenant/role only through Vase App.
- [ ] Upsert the local tenant and entitlement projection using `globalTenantId`, plan version, status, and limits.
- [ ] Return stable error codes for required session, expired session, forbidden tenant, inactive Rest, and App unavailable.
- [ ] Run focused tests and commit as `feat(rest): resolve owner tenant context`.

### Task 8: Build branch onboarding

**Files:**
- Create: `apps/vase-rest/app/(owner)/onboarding/page.tsx`
- Create: `apps/vase-rest/app/(owner)/onboarding/onboarding-workspace.tsx`
- Create: `apps/vase-rest/app/lib/branches/branch-service.ts`
- Create: `apps/vase-rest/app/lib/branches/branch-repository.ts`
- Create: `apps/vase-rest/app/api/v1/branches/route.ts`
- Create: `apps/vase-rest/app/api/v1/branches/[branchId]/route.ts`
- Create: `tests/v3-rest-branches.test.ts`
- Create: `tests/v3-rest-onboarding-ui.test.ts`

- [ ] Add failing tests for tenant-scoped create/list/update, slug uniqueness per tenant, plan branch limit, inactive branch, and cross-tenant IDs.
- [ ] Implement branch creation as a transaction and derive `globalTenantId` from request context.
- [ ] Build the first onboarding steps for business identity, branches, timezone `America/Argentina/Buenos_Aires`, and branch groups.
- [ ] Run tests, typecheck Rest, and commit as `feat(rest): add branch onboarding`.

## Phase 3 — Staff, devices, scopes, and product shell

### Task 9: Implement local employees and branch roles

**Files:**
- Modify: `apps/vase-rest/prisma/schema.prisma`
- Create: `apps/vase-rest/prisma/migrations/20260728030000_rest_staff_roles/migration.sql`
- Create: `apps/vase-rest/app/lib/staff/capabilities.ts`
- Create: `apps/vase-rest/app/lib/staff/staff-service.ts`
- Create: `apps/vase-rest/app/lib/staff/pin-auth.ts`
- Create: `apps/vase-rest/app/api/v1/staff/route.ts`
- Create: `apps/vase-rest/app/api/v1/staff/[staffId]/route.ts`
- Create: `tests/v3-rest-staff-permissions.test.ts`
- Create: `tests/v3-rest-pin-auth.test.ts`

- [ ] Add failing tests for Owner, Manager, Cashier, Waiter, Kitchen, Stock, and Delivery capabilities, including different roles at two branches.
- [ ] Add `LocalEmployee`, `StaffBranchRole`, `Device`, and `StaffSession`; hash PINs with bcryptjs, rate-limit attempts, and never return a PIN hash.
- [ ] Enforce employee and device plan limits before creation while preserving existing sessions at the limit.
- [ ] Add disable, PIN rotation, session revocation, and audit events.
- [ ] Run tests and commit as `feat(rest): add local staff access`.

### Task 10: Implement Edge/device enrollment

**Files:**
- Modify: `apps/vase-rest/prisma/schema.prisma`
- Create: `apps/vase-rest/prisma/migrations/20260728031000_rest_device_enrollment/migration.sql`
- Create: `apps/vase-rest/app/lib/devices/enrollment-service.ts`
- Create: `apps/vase-rest/app/api/v1/devices/enrollments/route.ts`
- Create: `apps/vase-rest/app/api/v1/devices/enrollments/[code]/complete/route.ts`
- Create: `tests/v3-rest-device-enrollment.test.ts`

- [ ] Add failing tests for one-time code expiry, branch binding, plan limits, certificate fingerprint, replay, and revocation.
- [ ] Store only hashed enrollment codes and public certificate metadata.
- [ ] Issue a signed enrollment response containing tenant, branch, Edge ID, allowed capabilities, sync URL, and expiry.
- [ ] Run tests and commit as `feat(rest): add secure device enrollment`.

### Task 11: Add scoped configuration inheritance

**Files:**
- Modify: `apps/vase-rest/prisma/schema.prisma`
- Create: `apps/vase-rest/prisma/migrations/20260728032000_rest_scoped_configuration/migration.sql`
- Create: `apps/vase-rest/app/lib/scopes/scope-types.ts`
- Create: `apps/vase-rest/app/lib/scopes/effective-scope.ts`
- Create: `apps/vase-rest/app/lib/scopes/scope-service.ts`
- Create: `apps/vase-rest/app/api/v1/settings/scopes/route.ts`
- Create: `tests/v3-rest-effective-scope.test.ts`
- Create: `tests/v3-rest-scope-service.test.ts`

- [ ] Add failing tests for tenant, branch-group, and branch precedence, reset-to-inherited, revision conflict, impact preview, and cross-tenant isolation.
- [ ] Persist one versioned policy per configuration family and scope; reject last-write-wins updates with stale revisions.
- [ ] Return effective value, source scope, source revision, and override status to the UI.
- [ ] Run tests and commit as `feat(rest): add branch configuration scopes`.

### Task 12: Build the role-aware Vase Rest shell

**Files:**
- Create: `apps/vase-rest/app/(product)/layout.tsx`
- Create: `apps/vase-rest/app/(product)/rest-shell.tsx`
- Create: `apps/vase-rest/app/(product)/navigation.ts`
- Create: `apps/vase-rest/app/(product)/owner/page.tsx`
- Create: `apps/vase-rest/app/(product)/staff/login/page.tsx`
- Create: `apps/vase-rest/app/(product)/staff/page.tsx`
- Create: `apps/vase-rest/app/components/ui/button.tsx`
- Create: `apps/vase-rest/app/components/ui/card.tsx`
- Create: `apps/vase-rest/app/components/ui/badge.tsx`
- Create: `apps/vase-rest/app/components/ui/field.tsx`
- Create: `tests/v3-rest-role-navigation.test.ts`
- Create: `tests/v3-rest-design-shell.test.ts`

- [ ] Add failing tests for role-filtered navigation, active branch, offline/stale banner, keyboard focus, semantic status labels, and absence of legacy purple tokens.
- [ ] Build the dark operational shell and role-specific entry routes from the approved design.
- [ ] Keep all colors in shared CSS variables and all forms visibly labeled.
- [ ] Run tests, typecheck, and build Rest; commit as `feat(rest): add product experience shell`.

## Phase 4 — Restaurant operations

### Task 13: Implement catalog, recipes, and scoped prices

**Files:**
- Modify: `apps/vase-rest/prisma/schema.prisma`
- Create: `apps/vase-rest/prisma/migrations/20260728040000_rest_catalog_recipes/migration.sql`
- Create: `apps/vase-rest/app/lib/catalog/catalog-service.ts`
- Create: `apps/vase-rest/app/lib/catalog/recipe-service.ts`
- Create: `apps/vase-rest/app/lib/catalog/pricing-service.ts`
- Create: `apps/vase-rest/app/api/v1/catalog/route.ts`
- Create: `apps/vase-rest/app/(product)/owner/catalog/page.tsx`
- Create: `tests/v3-rest-catalog.test.ts`
- Create: `tests/v3-rest-recipes.test.ts`
- Create: `tests/v3-rest-pricing.test.ts`

- [ ] Add failing tests for categories, products, modifier groups, recipe quantities, branch availability, inherited prices, branch overrides, and decimal money handling.
- [ ] Add catalog aggregates with tenant keys, immutable SKU identity, optimistic revisions, and scoped projections.
- [ ] Implement owner catalog UI with source badges for inherited/overridden values.
- [ ] Run tests and commit as `feat(rest): add catalog recipes pricing`.

### Task 14: Implement warehouses and inventory

**Files:**
- Modify: `apps/vase-rest/prisma/schema.prisma`
- Create: `apps/vase-rest/prisma/migrations/20260728041000_rest_inventory/migration.sql`
- Create: `apps/vase-rest/app/lib/inventory/inventory-service.ts`
- Create: `apps/vase-rest/app/lib/inventory/allocation-service.ts`
- Create: `apps/vase-rest/app/api/v1/inventory/route.ts`
- Create: `apps/vase-rest/app/(product)/stock/page.tsx`
- Create: `tests/v3-rest-inventory.test.ts`
- Create: `tests/v3-rest-offline-allocation.test.ts`

- [ ] Add failing tests for receipts, recipe consumption, waste, correction, reversal, shared warehouse links, safety stock, and branch offline allocation exhaustion.
- [ ] Record stock only through append-only movements and transactional balance updates; never mutate a balance without a movement.
- [ ] Block offline sale availability when its branch allocation is exhausted.
- [ ] Build inventory history and alert UI; run tests and commit as `feat(rest): add inventory allocations`.

### Task 15: Implement floors, tables, and reservations

**Files:**
- Modify: `apps/vase-rest/prisma/schema.prisma`
- Create: `apps/vase-rest/prisma/migrations/20260728042000_rest_salon_reservations/migration.sql`
- Create: `apps/vase-rest/app/lib/salon/table-service.ts`
- Create: `apps/vase-rest/app/lib/reservations/reservation-service.ts`
- Create: `apps/vase-rest/app/(product)/waiter/salon/page.tsx`
- Create: `apps/vase-rest/app/(product)/waiter/reservations/page.tsx`
- Create: `tests/v3-rest-tables.test.ts`
- Create: `tests/v3-rest-reservations.test.ts`

- [ ] Add failing tests for floor/zone coordinates, branch isolation, table merge/split, occupancy transitions, reservation overlap, multi-table assignment, cancellation, and capacity.
- [ ] Port only the useful touch interactions from the legacy Mesa components into focused components backed by server domain commands.
- [ ] Make every state transition versioned and audited.
- [ ] Run tests and commit as `feat(rest): add salon reservations`.

### Task 16: Implement orders and KDS

**Files:**
- Modify: `apps/vase-rest/prisma/schema.prisma`
- Create: `apps/vase-rest/prisma/migrations/20260728043000_rest_orders_kds/migration.sql`
- Create: `apps/vase-rest/app/lib/orders/order-service.ts`
- Create: `apps/vase-rest/app/lib/kds/kitchen-service.ts`
- Create: `apps/vase-rest/app/(product)/waiter/orders/[orderId]/page.tsx`
- Create: `apps/vase-rest/app/(product)/kitchen/page.tsx`
- Create: `tests/v3-rest-orders.test.ts`
- Create: `tests/v3-rest-kds.test.ts`

- [ ] Add failing tests for opening, adding customized items, courses, notes, submit-to-station, partial preparation, ready, served, cancel, split, merge, and duplicate command IDs.
- [ ] Implement transactional order totals and kitchen ticket routing by station/category.
- [ ] Deduct recipe inventory only at the approved configured transition and restore it idempotently on eligible cancellation.
- [ ] Build touch-first waiter and full-screen KDS workstations; run tests and commit as `feat(rest): add orders kitchen`.

## Phase 5 — Edge continuity and printing

### Task 17: Create the Edge service

**Files:**
- Create: `services/vase-rest-edge/package.json`
- Create: `services/vase-rest-edge/tsconfig.json`
- Create: `services/vase-rest-edge/src/server.ts`
- Create: `services/vase-rest-edge/src/config.ts`
- Create: `services/vase-rest-edge/src/db.ts`
- Create: `services/vase-rest-edge/src/schema.sql`
- Create: `services/vase-rest-edge/src/health.ts`
- Create: `services/vase-rest-edge/tests/health.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Add failing tests for SQLite WAL initialization, exclusive writer lock, local TLS requirement, health status, clean restart, and missing enrollment.
- [ ] Register `services/*` as workspaces without changing the isolated Python transcription service.
- [ ] Implement schema migrations with a local migration ledger and transaction.
- [ ] Run Edge tests and typecheck; commit as `feat(rest-edge): create branch service`.

### Task 18: Implement Edge enrollment and PIN sessions

**Files:**
- Create: `services/vase-rest-edge/src/enrollment.ts`
- Create: `services/vase-rest-edge/src/certificates.ts`
- Create: `services/vase-rest-edge/src/staff-projection.ts`
- Create: `services/vase-rest-edge/src/pin-session.ts`
- Create: `services/vase-rest-edge/tests/enrollment.test.ts`
- Create: `services/vase-rest-edge/tests/pin-session.test.ts`

- [ ] Add failing tests for one-time enrollment, certificate pinning, revoked device, offline PIN verification, lockout, role projection, and session expiry.
- [ ] Persist private key material with Windows-protected file permissions and never log it.
- [ ] Verify signed staff projections before applying them locally.
- [ ] Run tests and commit as `feat(rest-edge): add enrollment staff sessions`.

### Task 19: Implement the sync protocol and outbox

**Files:**
- Create: `services/vase-rest-edge/src/events.ts`
- Create: `services/vase-rest-edge/src/outbox.ts`
- Create: `services/vase-rest-edge/src/sync-client.ts`
- Create: `apps/vase-rest/app/lib/edge/sync-service.ts`
- Create: `apps/vase-rest/app/api/v1/edge/sync/route.ts`
- Create: `tests/v3-rest-edge-sync.test.ts`
- Create: `services/vase-rest-edge/tests/sync.test.ts`

- [ ] Add failing tests for ordered upload, duplicate event, aggregate version conflict, partial acknowledgement, retry after crash, signed config delta, snapshot recovery, and revoked Edge.
- [ ] Store accepted local commands and outbox entries in one SQLite transaction.
- [ ] Store cloud event receipt and aggregate mutation in one PostgreSQL transaction.
- [ ] Return prior receipts for duplicate IDs and stable conflict payloads for stale aggregate versions.
- [ ] Run cloud and Edge sync tests; commit as `feat(rest): add offline event sync`.

### Task 20: Route branch workstations through Edge

**Files:**
- Create: `apps/vase-rest/app/lib/edge/local-edge-client.ts`
- Create: `apps/vase-rest/app/lib/edge/connection-state.ts`
- Modify: `apps/vase-rest/app/(product)/rest-shell.tsx`
- Modify: `apps/vase-rest/app/(product)/waiter/salon/page.tsx`
- Modify: `apps/vase-rest/app/(product)/kitchen/page.tsx`
- Create: `tests/v3-rest-edge-connection-state.test.ts`
- Create: `tests/e2e/rest-offline-branch.spec.ts`

- [ ] Add failing tests for paired Edge discovery, certificate mismatch, local command routing, WAN loss, stale cloud banner, reconnection, and exactly-once consolidated state.
- [ ] Make local operational routes fail closed if the paired Edge cannot be authenticated; do not silently mutate cloud and fork branch state.
- [ ] Verify two browser contexts on the LAN observe the same table/KDS state while WAN requests are blocked.
- [ ] Run focused Vitest and Playwright tests; commit as `feat(rest): connect workstations to Edge`.

### Task 21: Implement ESC/POS printing

**Files:**
- Create: `services/vase-rest-edge/src/printing/printer-adapter.ts`
- Create: `services/vase-rest-edge/src/printing/usb-printer.ts`
- Create: `services/vase-rest-edge/src/printing/network-printer.ts`
- Create: `services/vase-rest-edge/src/printing/print-queue.ts`
- Create: `services/vase-rest-edge/src/printing/receipt-template.ts`
- Create: `services/vase-rest-edge/tests/printing.test.ts`
- Create: `apps/vase-rest/app/(product)/owner/settings/printers/page.tsx`
- Create: `tests/v3-rest-printer-settings.test.ts`

- [ ] Add failing tests for category/station routing, USB/network errors, durable retries, duplicate jobs, reprint permission, and confirmed success.
- [ ] Keep KDS tickets independent from printer success and surface failed jobs to authorized roles.
- [ ] Add owner printer discovery/configuration/test page without exposing Edge secrets.
- [ ] Run tests with a fake adapter, then a representative ESC/POS hardware certification script; commit as `feat(rest-edge): add kitchen printing`.

### Task 22: Package the Windows service and updater

**Files:**
- Create: `services/vase-rest-edge/installer/Product.wxs`
- Create: `services/vase-rest-edge/scripts/build-windows.ps1`
- Create: `services/vase-rest-edge/src/updater.ts`
- Create: `services/vase-rest-edge/tests/updater.test.ts`
- Create: `docs/operations/vase-rest-edge.md`

- [ ] Add failing tests for manifest signature, wrong channel, interrupted download, migration failure, rollback, and preserved local operation.
- [ ] Build a signed MSI that installs the Node service, data directory ACLs, firewall rule limited to private networks, and uninstall retention prompt.
- [ ] Implement staged update checks with signed manifest, SHA-256 verification, health deadline, and rollback.
- [ ] Document installation, pairing, diagnostics, backup, recovery, and removal.
- [ ] Run updater tests and a clean Windows VM install/upgrade/rollback certification; commit as `feat(rest-edge): package managed Windows service`.

## Phase 6 — Cash, payments, and fiscal operation

### Task 23: Implement cash and manual payments

**Files:**
- Modify: `apps/vase-rest/prisma/schema.prisma`
- Create: `apps/vase-rest/prisma/migrations/20260728060000_rest_cash_payments/migration.sql`
- Create: `apps/vase-rest/app/lib/cash/cash-service.ts`
- Create: `apps/vase-rest/app/lib/payments/payment-service.ts`
- Create: `apps/vase-rest/app/(product)/cashier/page.tsx`
- Create: `tests/v3-rest-cash.test.ts`
- Create: `tests/v3-rest-manual-payments.test.ts`

- [ ] Add failing tests for opening float, one open drawer per branch/station, movements, cash/transfer/external terminal/external wallet/customer account, closure, variance, reversal, and permission.
- [ ] Persist monetary values as decimals and all financial transitions in PostgreSQL transactions with idempotency.
- [ ] Require provider/reference/operator fields for non-cash external tenders.
- [ ] Run tests and commit as `feat(rest): add cash manual payments`.

### Task 24: Integrate Mercado Pago Point and QR

**Files:**
- Create: `apps/vase-rest/app/lib/secrets/encryption.ts`
- Create: `apps/vase-rest/app/lib/payments/mercado-pago-client.ts`
- Create: `apps/vase-rest/app/lib/payments/mercado-pago-service.ts`
- Create: `apps/vase-rest/app/api/v1/integrations/mercado-pago/oauth/callback/route.ts`
- Create: `apps/vase-rest/app/api/v1/webhooks/mercado-pago/route.ts`
- Create: `apps/vase-rest/app/(product)/owner/settings/payments/page.tsx`
- Create: `tests/v3-rest-mercado-pago.test.ts`
- Create: `tests/v3-rest-mercado-pago-webhook.test.ts`

- [ ] Add failing tests using official sandbox fixtures for OAuth state, tenant/branch account binding, Point payment, QR order, signed webhook, repeated webhook, ambiguous timeout reconciliation, cancellation, and refund.
- [ ] Encrypt refresh/access credentials with versioned AES-256-GCM and return only redacted state.
- [ ] Reconcile provider status before permitting a second attempt after an ambiguous response.
- [ ] Pass sandbox certification and commit as `feat(rest): integrate Mercado Pago`.

### Task 25: Integrate ARCA WSAA and WSFEv1

**Files:**
- Create: `apps/vase-rest/app/lib/fiscal/arca-types.ts`
- Create: `apps/vase-rest/app/lib/fiscal/wsaa-client.ts`
- Create: `apps/vase-rest/app/lib/fiscal/wsfe-client.ts`
- Create: `apps/vase-rest/app/lib/fiscal/fiscal-service.ts`
- Create: `apps/vase-rest/app/(product)/owner/settings/fiscal/page.tsx`
- Create: `apps/vase-rest/app/(product)/cashier/documents/page.tsx`
- Create: `tests/v3-rest-wsaa.test.ts`
- Create: `tests/v3-rest-wsfe.test.ts`
- Create: `tests/v3-rest-fiscal-state.test.ts`

- [ ] Add failing tests from official homologation responses for token/sign, last authorized number, invoices A/B/C, credit/debit notes, observations, partial rejection, timeout reconciliation, CAE, expiry, and QR data.
- [ ] Encrypt certificates/private keys and validate CUIT, environment, certificate expiry, point of sale, and authorized voucher types before activation.
- [ ] Serialize fiscal requests per tax identity/point-of-sale/voucher type and query the last authorized number after ambiguous failures.
- [ ] Never issue a local CAE or mark a document authorized without a valid WSFE response.
- [ ] Pass ARCA homologation and production smoke certification; commit as `feat(rest): integrate ARCA fiscal documents`.

### Task 26: Add customer accounts, refunds, and reconciliation

**Files:**
- Modify: `apps/vase-rest/prisma/schema.prisma`
- Create: `apps/vase-rest/prisma/migrations/20260728061000_rest_accounts_reconciliation/migration.sql`
- Create: `apps/vase-rest/app/lib/accounts/customer-account-service.ts`
- Create: `apps/vase-rest/app/lib/payments/reconciliation-service.ts`
- Create: `apps/vase-rest/app/(product)/cashier/accounts/page.tsx`
- Create: `tests/v3-rest-customer-accounts.test.ts`
- Create: `tests/v3-rest-reconciliation.test.ts`

- [ ] Add failing tests for charge, payment, adjustment, reversal, balance, refund linkage, provider mismatch, and export formula-injection protection.
- [ ] Use append-only account movements and derive balances transactionally.
- [ ] Build reconciliation views for manual, Mercado Pago, and fiscal status discrepancies.
- [ ] Run tests and commit as `feat(rest): add accounts reconciliation`.

## Phase 7 — Delivery, analytics, administration, and GA

### Task 27: Create the delivery integration framework

**Files:**
- Modify: `apps/vase-rest/prisma/schema.prisma`
- Create: `apps/vase-rest/prisma/migrations/20260728070000_rest_delivery_connections/migration.sql`
- Create: `apps/vase-rest/app/lib/delivery/provider-adapter.ts`
- Create: `apps/vase-rest/app/lib/delivery/delivery-service.ts`
- Create: `apps/vase-rest/app/lib/delivery/webhook-service.ts`
- Create: `apps/vase-rest/app/(product)/owner/settings/delivery/page.tsx`
- Create: `apps/vase-rest/app/(product)/delivery/page.tsx`
- Create: `tests/v3-rest-delivery-service.test.ts`
- Create: `tests/v3-rest-delivery-webhooks.test.ts`

- [ ] Add failing tests for connection states, encrypted credentials, store binding, signature/replay, provider order mapping, idempotent receipt, accept/reject/update/cancel, and provider outage.
- [ ] Define one adapter contract returning normalized orders and stable provider errors; never fall back to local sample orders.
- [ ] Build settings that clearly distinguish unconfigured, sandbox, pending approval, active, degraded, revoked, and certification required.
- [ ] Run tests and commit as `feat(rest): add delivery provider framework`.

### Task 28: Certify PedidosYa, Rappi, Glovo, and Uber Eats

**Files:**
- Create: `apps/vase-rest/app/lib/delivery/providers/pedidos-ya.ts`
- Create: `apps/vase-rest/app/lib/delivery/providers/rappi.ts`
- Create: `apps/vase-rest/app/lib/delivery/providers/glovo.ts`
- Create: `apps/vase-rest/app/lib/delivery/providers/uber-eats.ts`
- Create: `tests/fixtures/rest-delivery/pedidos-ya/*.json`
- Create: `tests/fixtures/rest-delivery/rappi/*.json`
- Create: `tests/fixtures/rest-delivery/glovo/*.json`
- Create: `tests/fixtures/rest-delivery/uber-eats/*.json`
- Create: `tests/v3-rest-delivery-providers.test.ts`
- Create: `docs/integrations/vase-rest-delivery.md`

- [ ] Obtain the official partner contract, sandbox, webhook verification method, production approval checklist, and permission scopes for each provider before writing its adapter.
- [ ] Add redacted official sandbox fixtures and failing contract tests for authentication, order receipt, retrieval, acceptance/rejection, preparation update, cancellation, and retry semantics.
- [ ] Implement each adapter only against its approved contract and pass the provider's sandbox certification.
- [ ] Record certification date, API version, enabled markets, required scopes, and operational escalation path.
- [ ] Commit PedidosYa as `feat(rest): certify PedidosYa delivery`.
- [ ] Commit Rappi as `feat(rest): certify Rappi delivery`.
- [ ] Commit Glovo as `feat(rest): certify Glovo delivery`.
- [ ] Commit Uber Eats as `feat(rest): certify Uber Eats delivery`.

This task has a hard external dependency. If a provider does not grant Vase access, its state remains `pending approval`; no guessed endpoint or simulated success is permitted.

### Task 29: Add analytics, exports, and Workplace support

**Files:**
- Create: `apps/vase-rest/app/lib/analytics/analytics-service.ts`
- Create: `apps/vase-rest/app/(product)/owner/analytics/page.tsx`
- Create: `apps/vase-rest/app/lib/support/workplace-client.ts`
- Create: `apps/vase-rest/app/(product)/support/page.tsx`
- Create: `apps/vase-rest/app/api/v1/support/route.ts`
- Create: `packages/contracts/src/rest-support.ts`
- Create: `tests/v3-rest-analytics.test.ts`
- Create: `tests/v3-rest-workplace-support.test.ts`

- [ ] Add failing tests for branch/consolidated totals, stale Edge watermark, timezone boundaries, refunds, account balances, CSV formula escaping, signed Workplace request, and no local developer role.
- [ ] Compute financial analytics from reconciled payments and fiscal records, not client-provided totals.
- [ ] Send support context through a signed internal contract and retain only the external ticket ID/status locally.
- [ ] Run tests and commit as `feat(rest): add analytics support`.

### Task 30: Add Rest operational control to Vase Admin

**Files:**
- Modify: `apps/vase-admin/app/rest-admin-workspace.tsx`
- Create: `apps/vase-admin/app/api/rest/tenants/route.ts`
- Create: `apps/vase-rest/app/api/internal/admin/tenants/route.ts`
- Create: `apps/vase-rest/app/api/internal/admin/edges/route.ts`
- Create: `tests/v3-rest-admin-operations.test.ts`

- [ ] Add failing tests for service-token protection, tenant entitlement summary, Edge version/heartbeat/lag, degraded integrations, and absence of direct database credentials.
- [ ] Return redacted operational projections only; never return tenant provider secrets, PIN hashes, certificate bodies, or payment details.
- [ ] Add filters and alerts for offline Edge, sync backlog, fiscal error, provider degradation, and failed print queue.
- [ ] Run tests and commit as `feat(admin): monitor Vase Rest operations`.

### Task 31: Remove legacy runtime and mocks

**Files:**
- Delete after parity: `apps/vase-rest/noctua`
- Delete after parity: `apps/vase-rest/backend-reservas`
- Delete after parity: `apps/vase-rest/supabase`
- Modify: `docs/migrations/vase-rest-legacy-inventory.md`
- Create: `tests/v3-rest-no-legacy-runtime.test.ts`

- [ ] Add a failing repository test that rejects Supabase dependencies, legacy runtime imports, `admin/1234`, `superadm_session`, simulated CAE, sample delivery orders, and mock fallback stores inside active Rest/Edge code.
- [ ] Verify every inventory row in the legacy migration document maps to a production module, an approved removal, or Workplace/Admin ownership.
- [ ] Delete the legacy trees only after focused parity and provider/fiscal gates are green.
- [ ] Run `npm install --package-lock-only`, the repository guard, Rest build, and Edge tests.
- [ ] Commit as `refactor(rest): retire legacy runtime`.

### Task 32: Production verification and rollout

**Files:**
- Create: `docs/production/VASE_REST_RUNBOOK.md`
- Create: `docs/production/VASE_REST_ACCEPTANCE.md`
- Modify: `PROJECT_CONTEXT.md`
- Modify: `README.md`
- Modify: `docs/production/TECHNICAL_ARCHITECTURE.md`
- Modify: `docs/production/OPERATIONS_RUNBOOK.md`

- [ ] Document backup/restore, secret rotation, Edge enrollment/revocation, update/rollback, printer diagnostics, ARCA ambiguity, Mercado Pago reconciliation, delivery outage, tenant suspension, and incident escalation.
- [ ] Run `npx prisma validate` for App, Admin, and Rest schemas.
- [ ] Run all Rest/Edge/App/Admin focused tests, then `npm run test:v3`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] Run Playwright with two tenants, two branches, all roles, WAN blocked, LAN Edge active, shared warehouse allocation, print failure, reconnection, and exactly-once reconciliation.
- [ ] Restore a production-shaped PostgreSQL backup and roll Edge forward/back on a clean Windows VM.
- [ ] Complete ARCA, Mercado Pago, printer, and each approved delivery certification record.
- [ ] Pilot one real branch and require zero lost/duplicated orders, payments, fiscal documents, stock movements, or print jobs before GA.
- [ ] Commit runbooks and acceptance evidence as `docs(rest): complete production readiness`.

## Global acceptance gates

- No browser-side database or service-role credential exists.
- No request can select a tenant or branch by changing an untrusted ID/header.
- No mock, sample order, simulated CAE, or provider fallback is reachable in production.
- Every financial, stock, sync, webhook, and print mutation is idempotent and audited.
- Branch devices remain synchronized through Edge during WAN loss and reconcile exactly once.
- Plan changes from Vase Admin are versioned; existing contracts remain stable.
- Rest, App, Admin, Workplace, and Edge communicate only through declared contracts.
- General availability is blocked until the production checklist and all applicable external certifications pass.
