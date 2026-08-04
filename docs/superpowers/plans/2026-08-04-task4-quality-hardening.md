# Task 4 Quality Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the six Task 4 quality blockers while preserving atomic client provisioning and backward compatibility.

**Architecture:** Add an additive primary-owner invariant, centralize canonical Labs and Rest entitlement decisions in pure helpers, and make provisioning preserve historical timestamps and emit safe access diffs. Every behavior change starts with a failing regression test and remains inside the existing transaction boundaries.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 6/MySQL, Zod, Vitest, ESLint.

---

### Task 1: Stable primary-owner invariant

**Files:**
- Modify: `apps/vase-app/prisma/schema.prisma`
- Create: `apps/vase-app/prisma/migrations/20260804110000_tenant_primary_owner/migration.sql`
- Modify: `apps/vase-app/src/server/services/client-product-access.ts`
- Test: `apps/vase-app/src/tests/client-product-schema.test.ts`
- Test: `apps/vase-app/src/tests/client-product-access-service.test.ts`

- [ ] Add failing schema/service tests for the named one-to-one relation, additive migration, MEMBER/MANAGER exclusion, ambiguous OWNER rejection, legacy OWNER claim, and new-owner consistency.
- [ ] Run the focused tests and confirm failures are caused by the missing invariant.
- [ ] Add `primaryOwnerUserId String? @unique`, the named relations, and a migration that backfills only one-to-one OWNER rows before adding the unique key and foreign key.
- [ ] Replace arbitrary membership lookup with primary-owner lookup plus exactly-one legacy OWNER resolution. Use a conditional claim and an owner-keyed upsert/create path; translate ownership conflicts to domain errors.
- [ ] Re-run the focused tests until green.

Core schema shape:

```prisma
primaryOwnerUserId String? @unique
primaryOwner User? @relation("TenantPrimaryOwner", fields: [primaryOwnerUserId], references: [id], onDelete: SetNull)
```

### Task 2: Canonical Labs round-trip and ranking

**Files:**
- Modify: `apps/vase-app/src/lib/admin/client-product-access.ts`
- Modify: `apps/vase-app/src/lib/admin/user-access.ts`
- Create: `apps/vase-app/src/server/services/labs-entitlement-state.ts`
- Modify: `apps/vase-app/src/server/services/client-product-access.ts`
- Modify: `apps/vase-app/src/server/services/labs-admin.ts`
- Modify: `apps/vase-app/src/app/api/internal/labs/session-context/route.ts`
- Test: `apps/vase-app/src/tests/client-product-access-service.test.ts`
- Test: `apps/vase-app/src/tests/admin-user-access.test.ts`
- Test: `apps/vase-app/src/tests/labs-entitlement-roundtrip.test.ts`

- [ ] Add failing tests for uppercase canonical limits, `messenger -> FACEBOOK`, plan versus override metadata, producer-to-both-consumers round-trip, and `GROWTH > PRO > STARTER`.
- [ ] Run the tests and confirm the expected failures.
- [ ] Add a canonical plan-limit mapper and shared stored-workspace resolver. Product provisioning clears override metadata; Labs Admin recognizes an override only from complete metadata.
- [ ] Correct both legacy rank tables and use the shared resolver in session-context and Labs Admin.
- [ ] Re-run the focused tests until green.

Canonical mapper:

```ts
return {
  WHATSAPP: entitlement.channels.whatsapp,
  INSTAGRAM: entitlement.channels.instagram,
  FACEBOOK: entitlement.channels.messenger,
};
```

### Task 3: Rest Trial entitlement and activation history

**Files:**
- Create: `apps/vase-app/src/lib/rest/contract-entitlement.ts`
- Modify: `apps/vase-app/src/server/services/rest-session-context.ts`
- Modify: `apps/vase-app/src/server/services/rest-admin.ts`
- Modify: `apps/vase-app/src/server/queries/modules.ts`
- Modify: `apps/vase-app/src/server/services/client-product-access.ts`
- Test: `apps/vase-app/src/tests/rest-admin-service.test.ts`
- Test: `apps/vase-app/src/tests/client-product-access-service.test.ts`
- Test: `apps/vase-app/src/tests/rest-trial-entitlement.test.ts`

- [ ] Add failing tests proving Trial works in the helper, module query, admin list, SET_USER_ACCESS, session context, and TenantModule flow; add no-op/reactivation/material-transition timestamp tests.
- [ ] Run and inspect the failures.
- [ ] Implement `isRestContractEntitled(status) => status === "ACTIVE" || status === "TRIAL"` and use it at every gate.
- [ ] Preserve `activatedAt` when active state, status, and pricing are unchanged; set it to `now` for create/reactivation/material transitions.
- [ ] Re-run focused tests until green.

### Task 4: Safe product-access audit diff

**Files:**
- Modify: `apps/vase-app/src/lib/admin/client-product-access.ts`
- Modify: `apps/vase-app/src/app/(platform)/app/admin/actions.ts`
- Test: `apps/vase-app/src/tests/client-product-access.test.ts`
- Test: `apps/vase-app/src/tests/master-user-client-access-action.test.ts`

- [ ] Add failing tests for before/after status, Labs plan, Rest pricing version, feature identity/change kinds, and omission of raw TEXT values.
- [ ] Run and confirm failures.
- [ ] Implement a deterministic safe summary/diff and add it to create/update audit metadata inside the existing transaction.
- [ ] Re-run tests until green.

Feature diff shape:

```ts
{ featureId, change: "VALUE_CHANGED", beforeEnabled: true, afterEnabled: true }
```

### Task 5: Verification and commit

**Files:** all files above.

- [ ] Run all focused app and root entitlement tests.
- [ ] Run `npm run prisma:generate --workspace @vase/app` and `npx prisma validate --schema apps/vase-app/prisma/schema.prisma`.
- [ ] Run app typecheck and targeted ESLint.
- [ ] Run `git diff --check`, inspect the final diff and ensure the worktree contains no unrelated changes.
- [ ] Commit with `fix(admin): harden client product provisioning` and report both commit SHA and command evidence.
