# Labs Knowledge Source Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated Labs owners rename and safely delete knowledge sources, including clean removal of the external Business catalog before reconnecting.

**Architecture:** Add tenant-scoped repository operations and a dynamic item route for PATCH/DELETE. Make the grouped knowledge list interactive with edit and destructive-confirmation modals, refreshing the server page after successful mutations. External catalog cleanup runs in the same Prisma transaction as deleting the final external source.

**Tech Stack:** Next.js 16 route handlers and server/client components, React 19, Prisma, Zod, Vitest.

---

### Task 1: Tenant-scoped repository mutations

**Files:**
- Modify: `apps/vase-labs/app/lib/knowledge-repository.ts`
- Test: `tests/v3-labs-knowledge-source-management.test.ts`

- [ ] **Step 1: Write failing repository tests**

Create tests for `renameKnowledgeItem` and `deleteKnowledgeItem`: require the trusted assistant ID, return not-found for a mismatched assistant, and transactionally delete `CatalogProduct` and `CatalogSyncEvent` only when the removed item is the final `EXTERNAL_MANAGEMENT` source.

- [ ] **Step 2: Run the repository tests and confirm RED**

Run: `npx vitest run tests/v3-labs-knowledge-source-management.test.ts`

Expected: failure because the mutation functions do not exist.

- [ ] **Step 3: Implement the repository operations**

Add injectable functions with this contract:

```ts
renameKnowledgeItem(repository, assistantId, knowledgeId, title)
deleteKnowledgeItem(repository, assistantId, globalTenantId, knowledgeId)
```

The production delete repository must use `labsPrisma.$transaction`, delete the selected item only after an assistant-scoped lookup, count remaining external sources, and clear catalog products/events only when that count is zero.

- [ ] **Step 4: Run the repository tests and confirm GREEN**

Run: `npx vitest run tests/v3-labs-knowledge-source-management.test.ts`

Expected: all repository cases pass.

- [ ] **Step 5: Commit**

```bash
git add apps/vase-labs/app/lib/knowledge-repository.ts tests/v3-labs-knowledge-source-management.test.ts
git commit -m "feat(labs): add scoped knowledge source mutations"
```

### Task 2: Knowledge item API and duplicate prevention

**Files:**
- Create: `apps/vase-labs/app/api/labs/knowledge/[knowledgeId]/route.ts`
- Modify: `apps/vase-labs/app/api/labs/knowledge/route.ts`
- Modify: `apps/vase-labs/app/lib/knowledge-repository.ts`
- Test: `tests/v3-labs-knowledge-source-management.test.ts`
- Test: `tests/v3-labs-knowledge-routes.test.ts`

- [ ] **Step 1: Add failing route tests**

Cover valid title PATCH, confirmed DELETE, malformed title, missing item, cross-tenant item, authentication/authorization mapping, sanitized persistence errors, and duplicate `EXTERNAL_MANAGEMENT` creation returning `409`.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npx vitest run tests/v3-labs-knowledge-source-management.test.ts tests/v3-labs-knowledge-routes.test.ts`

Expected: failures for the missing item handlers and duplicate check.

- [ ] **Step 3: Implement route handlers**

Use `resolveLabsRequestContext` for assistant/global tenant identity. Validate PATCH with `z.object({ title: z.string().trim().min(1).max(160) })`. Map known errors to 400/401/403/404/409 and return sanitized 500 errors.

- [ ] **Step 4: Prevent duplicate external sources before catalog import**

Extend the POST handler dependency with `hasSource(assistantId, sourceType)`. For `EXTERNAL_MANAGEMENT`, return `KNOWLEDGE_SOURCE_ALREADY_EXISTS` before importing when a source already exists.

- [ ] **Step 5: Run route tests and confirm GREEN**

Run: `npx vitest run tests/v3-labs-knowledge-source-management.test.ts tests/v3-labs-knowledge-routes.test.ts`

Expected: all route tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/vase-labs/app/api/labs/knowledge apps/vase-labs/app/lib/knowledge-repository.ts tests/v3-labs-knowledge-source-management.test.ts tests/v3-labs-knowledge-routes.test.ts
git commit -m "feat(labs): expose knowledge source management API"
```

### Task 3: Edit and delete confirmation modals

**Files:**
- Modify: `apps/vase-labs/app/app/owner/labs/chatbots/knowledge-groups.tsx`
- Modify: `apps/vase-labs/app/globals.css`
- Test: `tests/v3-labs-knowledge-source-management.test.ts`

- [ ] **Step 1: Add failing UI contract tests**

Assert that the component exposes accessible Edit/Delete controls, an edit dialog, a delete confirmation dialog, the external-catalog warning, Cancel behavior, and calls the tenant-scoped item API before `router.refresh()`.

- [ ] **Step 2: Run the UI tests and confirm RED**

Run: `npx vitest run tests/v3-labs-knowledge-source-management.test.ts`

Expected: failure because the controls and dialogs are absent.

- [ ] **Step 3: Implement the client component**

Convert `KnowledgeGroups` to a client component. Add row actions using Lucide `Pencil` and `Trash2`, modal state for the selected item, title editing via PATCH, destructive confirmation via DELETE, disabled submitting states, accessible labels/focus, sanitized inline errors, and `router.refresh()` after success.

- [ ] **Step 4: Add cohesive styling**

Reuse the existing Labs surface, border, danger, modal backdrop, button, spacing, and typography variables. Keep actions visible but secondary to the source status, and make the destructive confirmation visually unmistakable.

- [ ] **Step 5: Run UI and route tests**

Run: `npx vitest run tests/v3-labs-knowledge-source-management.test.ts tests/v3-labs-knowledge-routes.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/vase-labs/app/app/owner/labs/chatbots/knowledge-groups.tsx apps/vase-labs/app/globals.css tests/v3-labs-knowledge-source-management.test.ts
git commit -m "feat(labs): add knowledge source edit and delete modals"
```

### Task 4: Verification and integration

**Files:**
- Verify all files changed above.

- [ ] **Step 1: Run focused suites**

Run: `npx vitest run tests/v3-labs-knowledge-source-management.test.ts tests/v3-labs-knowledge-routes.test.ts tests/v3-labs-catalog-backfill.test.ts tests/v3-labs-business-catalog-snapshot.test.ts tests/v3-labs-catalog-service.test.ts`

Expected: all focused tests pass.

- [ ] **Step 2: Run Labs typecheck and build**

Run: `npm run typecheck --workspace @vase/labs && npm run build --workspace @vase/labs`

Expected: both commands exit 0.

- [ ] **Step 3: Review tenant isolation and diff**

Run: `git diff --check main...HEAD` and inspect every query for resolved `assistantId` or `globalTenantId` scoping.

- [ ] **Step 4: Request code review and address Critical/Important findings**

Provide the design, base SHA, and head SHA to the reviewer. Rerun affected tests after corrections.

- [ ] **Step 5: Integrate into main after verification**

Fast-forward `main`, rerun the focused suites on the merged result, and push only when repository credentials authorize it.
