# Labs Order Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Labs orders financially accurate, operable from a Vase-style detail modal, and capable of notifying the customer automatically when ready.

**Architecture:** Enrich local order snapshots from the tenant catalog before persistence, keep operational state separate from Business source state, and expose a tenant-scoped Route Handler backed by an idempotent order operation service. The server page serializes order data into a focused Client Component that owns modal interaction and refreshes after mutations.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, Vitest, Tailwind/global Vase design tokens.

---

### Task 1: Catalog-backed local order snapshot

**Files:**
- Create: `apps/vase-labs/app/lib/local-order-snapshot.ts`
- Modify: `apps/vase-labs/app/lib/channel-ai-runner.ts`
- Modify: `apps/vase-labs/app/lib/conversation-order-orchestrator.ts`
- Test: `tests/v3-labs-local-order-snapshot.test.ts`
- Test: `tests/v3-labs-conversation-order-orchestrator.test.ts`

- [ ] Write failing tests for catalog price snapshots, totals, missing products and customer-safe order copy.
- [ ] Run the focused tests and confirm failures are caused by the missing behavior.
- [ ] Implement catalog enrichment, deterministic public order numbers and corrected Spanish copy.
- [ ] Run both focused test files and confirm they pass.

### Task 2: Operational state persistence

**Files:**
- Modify: `apps/vase-labs/prisma/schema.prisma`
- Create: `apps/vase-labs/prisma/migrations/20260726000000_add_order_operations/migration.sql`
- Create: `apps/vase-labs/app/lib/order-operations.ts`
- Test: `tests/v3-labs-order-operations.test.ts`

- [ ] Write failing service tests for valid transitions, idempotent ready notifications and failed sends.
- [ ] Run the focused tests and confirm the service is missing.
- [ ] Add operational fields, event history and the dependency-injected operation service.
- [ ] Generate Prisma Client and run the service tests.

### Task 3: Tenant-scoped order API and delivery adapter

**Files:**
- Create: `apps/vase-labs/app/api/labs/orders/[orderId]/status/route.ts`
- Create: `apps/vase-labs/app/lib/order-operation-runtime.ts`
- Test: `tests/v3-labs-order-status-route.test.ts`

- [ ] Write failing route contract tests for authentication, validation, success and notification retry.
- [ ] Run the route tests and confirm expected failures.
- [ ] Implement the Route Handler and runtime adapter using the existing official channel sender and message audit records.
- [ ] Run route and operation tests.

### Task 4: Vase-style orders workspace

**Files:**
- Modify: `apps/vase-labs/app/app/owner/labs/orders/page.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/orders/orders-workspace.tsx`
- Modify: `apps/vase-labs/app/globals.css`
- Test: `tests/v3-labs-orders-workspace.test.ts`

- [ ] Write failing structural tests for the modal, totals, statuses and contextual actions.
- [ ] Run the UI tests and confirm the new controls are absent.
- [ ] Implement serialized server data, responsive order list, accessible modal, status actions and notification feedback.
- [ ] Run the UI tests and TypeScript validation.

### Task 5: Full verification

**Files:**
- Verify all files above.

- [ ] Run all focused Labs order, inbox and channel tests.
- [ ] Run `npx tsc -p apps/vase-labs/tsconfig.json --noEmit`.
- [ ] Run `npm run build --workspace @vase/labs`.
- [ ] Run `git diff --check` and inspect the final scoped diff.
