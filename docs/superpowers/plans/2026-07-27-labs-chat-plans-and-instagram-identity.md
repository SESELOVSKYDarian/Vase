# Labs Chat, Plans and Instagram Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct Labs plan budgets, Inbox scroll stability, repeated product images and Instagram customer identities.

**Architecture:** Keep plan defaults and legacy-value migration server-side, preserve loaded Inbox thread state during queue polling, persist sent image URLs in outbound message metadata, and enrich Instagram messages through a best-effort Graph profile resolver before conversation persistence.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/MySQL, Meta Graph API, Vitest.

---

### Task 1: Correct plan budgets

**Files:**
- Modify: `apps/vase-labs/app/lib/ai-budget.ts`
- Create: `apps/vase-labs/prisma/migrations/20260727010000_adjust_ai_plan_budgets/migration.sql`
- Modify: `tests/v3-labs-ai-budget.test.ts`

- [ ] Add assertions that Starter, Growth and Pro resolve to USD 5, 10 and 20.
- [ ] Run `npx vitest run tests/v3-labs-ai-budget.test.ts` and confirm Growth/Pro fail with 15/40.
- [ ] Change `planBudgetsUsd` and add a conditional migration for legacy defaults only.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Stabilize Inbox polling and scroll

**Files:**
- Create: `apps/vase-labs/app/app/owner/labs/inbox/inbox-conversation-merge.ts`
- Modify: `apps/vase-labs/app/app/owner/labs/inbox/inbox-workstation.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/inbox/inbox-scroll-policy.ts`
- Create: `tests/v3-labs-inbox-conversation-merge.test.ts`
- Modify: `tests/v3-labs-inbox-scroll-policy.test.ts`

- [ ] Add failing tests proving queue refresh preserves loaded messages and initial open scrolls once.
- [ ] Run both focused test files and confirm failures.
- [ ] Merge queue summaries into current conversations instead of replacing messages, and distinguish initial conversation open from polling.
- [ ] Re-run both files and confirm stable history behavior.

### Task 3: Deduplicate product images per conversation

**Files:**
- Modify: `apps/vase-labs/app/lib/ai-orchestrator.ts`
- Modify: `apps/vase-labs/app/lib/channel-ai-runner.ts`
- Modify: `tests/v3-labs-channel-ai-runner.test.ts`
- Modify: `tests/v3-labs-operation-services.test.ts`

- [ ] Add a failing test where a prior assistant message already contains the same image URL.
- [ ] Run the focused test and confirm the duplicate is still sent.
- [ ] Load previous outbound image metadata, filter the generated URLs, and persist the final attachment list with the new message.
- [ ] Re-run the orchestrator and runner tests.

### Task 4: Resolve Instagram customer names

**Files:**
- Create: `apps/vase-labs/app/lib/meta-customer-profile.ts`
- Modify: `apps/vase-labs/app/lib/channel-webhook-service.ts`
- Modify: `apps/vase-labs/app/api/v1/meta/webhooks/[channel]/route.ts`
- Modify: `apps/vase-labs/app/api/v1/channels/instagram/[tenantSlug]/webhook/route.ts`
- Create: `tests/v3-labs-meta-customer-profile.test.ts`
- Modify: `tests/v3-labs-channel-webhook-service.test.ts`

- [ ] Add failing tests for name, username fallback and non-blocking Graph failure.
- [ ] Run the focused tests and confirm the resolver/enrichment is absent.
- [ ] Implement a server-only resolver using existing encrypted channel credentials and enrich the parsed inbound message before persistence.
- [ ] Re-run webhook/profile tests and confirm the conversation receives the resolved name.

### Task 5: Full verification

**Files:**
- Verify all files above.

- [ ] Run all focused Labs tests touched by the change.
- [ ] Run `npx tsc -p apps/vase-labs/tsconfig.json --noEmit`.
- [ ] Run `npm run build --workspace @vase/labs`.
- [ ] Run `git diff --check` and inspect the scoped diff.
