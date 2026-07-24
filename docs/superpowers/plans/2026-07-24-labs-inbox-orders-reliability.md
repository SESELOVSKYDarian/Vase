# Labs Inbox and Orders Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve conversational order state, accept safe natural confirmations, restore AI handoff control, deliver human replies reliably, and stop Inbox polling from stealing scroll position.

**Architecture:** The channel runner loads recent messages and an active order draft, while the orchestrator performs deterministic order transitions around the model's structured proposal. Tenant-scoped Route Handlers own handoff mutations and channel delivery diagnostics. A small client-side scroll policy keeps browser behavior independently testable.

**Tech Stack:** Next.js 16.2 App Router, React 19, Prisma/MySQL, OpenAI Responses API, Vase App internal Business broker, Vitest.

---

### Task 1: Natural order confirmation

**Files:**
- Modify: `apps/vase-labs/app/lib/conversation-order-draft.ts`
- Modify: `apps/vase-labs/app/lib/conversation-order-tools.ts`
- Modify: `tests/v3-labs-conversation-order-draft.test.ts`
- Modify: `tests/v3-labs-conversation-order-tools.test.ts`

- [ ] **Step 1: Write failing confirmation tests**

Add cases proving that an active quoted draft accepts `confirmo el pedido`,
`acepto el pedido` and `sí, hacelo`, while rejecting `hola`, `tal vez`, questions
and explicit negations.

- [ ] **Step 2: Run the tests and verify RED**

Run:
`npx vitest run tests/v3-labs-conversation-order-draft.test.ts tests/v3-labs-conversation-order-tools.test.ts`

Expected: FAIL because confirmation still requires `CONFIRMAR PEDIDO 4821`.

- [ ] **Step 3: Implement the minimal deterministic classifier**

Add `isExplicitOrderConfirmation(text)` with normalized accents/punctuation,
negative-pattern rejection and a narrow allow-list of confirmation phrases.
Remove the confirmation code/salt requirement from new drafts and let
`resolveDraftTransition` call the classifier.

- [ ] **Step 4: Verify GREEN and commit**

Run the focused tests. Commit:
`fix(labs): accept explicit natural order confirmation`.

### Task 2: Durable order orchestration and history

**Files:**
- Modify: `apps/vase-labs/app/lib/openai-reply-generator.ts`
- Modify: `apps/vase-labs/app/lib/ai-orchestrator.ts`
- Modify: `apps/vase-labs/app/lib/channel-ai-runner.ts`
- Create: `apps/vase-labs/app/lib/conversation-order-orchestrator.ts`
- Create: `tests/v3-labs-conversation-order-orchestrator.test.ts`
- Modify: `tests/v3-labs-channel-ai-runner.test.ts`
- Create: `tests/v3-labs-openai-order-action.test.ts`

- [ ] **Step 1: Write failing structured-action tests**

Require the model schema and parser to return `orderAction` with either `NONE` or
`PREPARE`, where `PREPARE` contains item IDs/quantities, customer and fulfillment.
Prove malformed actions are rejected.

- [ ] **Step 2: Verify RED**

Run the three focused tests and confirm failure because the output currently has
only `text` and `imageUrls`.

- [ ] **Step 3: Add the structured proposal**

Extend `AiReplyResult`, the Responses JSON schema and parser. Tell the model that
it proposes a draft only when all required fields are explicit and never claims
server success.

- [ ] **Step 4: Write failing orchestration tests**

Cover:
- recent history reaches the generator in chronological order;
- `PREPARE` calls Business quote and persists a draft;
- the server response contains the authoritative quote and asks for natural confirmation;
- an explicit confirmation of an active draft creates exactly one order;
- quote changes return a refreshed-review response without creation;
- a greeting preserves the active draft.

- [ ] **Step 5: Implement order orchestration**

Create a focused service that loads at most 20 recent messages and the active
draft. Check confirmation before model generation. For `PREPARE`, call
`prepareConversationOrderDraft`; for confirmation, call
`confirmConversationOrderDraft`. Keep server-authored order outcomes separate
from model-authored conversation text.

- [ ] **Step 6: Wire Prisma and Business dependencies**

In `createPrismaChannelAiReplyRunner`, inject the history repository,
`prismaConversationOrderDraftRepository` and `createBusinessOrderClient`.

- [ ] **Step 7: Verify GREEN and commit**

Run focused order, generator, runner and orchestrator tests. Commit:
`fix(labs): preserve and execute conversational orders`.

### Task 3: Tenant-safe handoff pause and resume

**Files:**
- Modify: `apps/vase-labs/app/api/v1/inbox/[tenantSlug]/conversations/[conversationId]/handoff/route.ts`
- Create: `apps/vase-labs/app/api/v1/inbox/[tenantSlug]/conversations/[conversationId]/reactivate/route.ts`
- Modify: `apps/vase-labs/app/app/owner/labs/inbox/inbox-workstation.tsx`
- Create: `tests/v3-labs-inbox-handoff.test.ts`

- [ ] **Step 1: Write failing Route Handler tests**

Assert tenant mismatch returns 403, pause reuses an active handoff, reactivation
resolves all active handoffs, and only the scoped conversation becomes open.

- [ ] **Step 2: Verify RED**

Run `npx vitest run tests/v3-labs-inbox-handoff.test.ts`.

- [ ] **Step 3: Implement handlers**

Resolve `resolveLabsRequestContext` from the cookie in both handlers, compare
tenant slugs and use a Prisma transaction for handoff/conversation updates.

- [ ] **Step 4: Add the contextual Inbox button**

Call `/reactivate` when `escalatedToHuman` is true, update local state, clear the
active handoff and display success/error copy.

- [ ] **Step 5: Verify GREEN and commit**

Run the handoff and channel webhook tests. Commit:
`fix(labs): reactivate AI after human handoff`.

### Task 4: Reliable human channel delivery

**Files:**
- Modify: `apps/vase-labs/app/lib/official-channel-sender.ts`
- Modify: `apps/vase-labs/app/api/v1/inbox/[tenantSlug]/conversations/[conversationId]/reply/route.ts`
- Modify: `apps/vase-labs/app/app/owner/labs/inbox/inbox-workstation.tsx`
- Modify: `tests/v3-labs-official-channel-sender.test.ts`
- Modify: `tests/v3-labs-inbox-human-reply.test.ts`

- [ ] **Step 1: Write failing delivery tests**

Prove recipient fallback, safe Meta HTTP/error propagation, missing encryption
configuration classification, and no persistence when delivery fails.

- [ ] **Step 2: Verify RED**

Run the two delivery test files.

- [ ] **Step 3: Implement safe delivery diagnostics**

Select `customerContact`, then `externalUserId`, then `externalThreadKey`.
Return stable error codes plus a sanitized Meta message/status. Never return or
log access tokens.

- [ ] **Step 4: Show actionable Inbox errors**

Map stable codes to Spanish instructions, including reconnecting the channel when
the encryption secret changed.

- [ ] **Step 5: Verify GREEN and commit**

Run sender, reply and channel runner tests. Commit:
`fix(labs): deliver and diagnose human replies`.

### Task 5: Sticky scroll and jump-to-latest control

**Files:**
- Create: `apps/vase-labs/app/app/owner/labs/inbox/inbox-scroll-policy.ts`
- Modify: `apps/vase-labs/app/app/owner/labs/inbox/inbox-workstation.tsx`
- Modify: `apps/vase-labs/app/globals.css`
- Create: `tests/v3-labs-inbox-scroll-policy.test.ts`

- [ ] **Step 1: Write failing policy tests**

Test an 80px bottom threshold and decisions for polling updates, conversation
changes, operator sends and manual jump.

- [ ] **Step 2: Verify RED**

Run `npx vitest run tests/v3-labs-inbox-scroll-policy.test.ts`.

- [ ] **Step 3: Implement the pure policy**

Export `isInboxNearBottom` and `shouldAutoScrollInbox` without DOM dependencies.

- [ ] **Step 4: Wire browser state and UI**

Track the scroll position with `onScroll`, auto-scroll only when policy allows,
and render an accessible `ArrowDown` floating button while away from the bottom.

- [ ] **Step 5: Verify GREEN and commit**

Run the policy and existing Inbox UI tests. Commit:
`fix(labs): preserve inbox scroll position`.

### Task 6: Full verification

**Files:**
- Review all files changed by Tasks 1–5.

- [ ] **Step 1: Run focused regression tests**

Run all order, runner, webhook, handoff, human reply, sender and scroll tests.

- [ ] **Step 2: Run typecheck**

Run: `npm --workspace @vase/labs run typecheck`

- [ ] **Step 3: Run production build**

Run: `npm --workspace @vase/labs run build`

- [ ] **Step 4: Review the diff and deployment impact**

Confirm no database migration is required, no unrelated files changed, and only
`vase-labs` plus `vase-labs-worker` need redeployment because they use the same
Labs image.
