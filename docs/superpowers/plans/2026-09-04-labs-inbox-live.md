# Vase Labs Inbox Live Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with checkpoints.

**Goal:** Keep customer conversations persistent in Vase Labs, deliver human replies reliably through the connected official channel, and update the Inbox live without losing the current thread.

**Architecture:** Add a small server-side inbox event bus and an SSE endpoint scoped by tenant. The client subscribes to events and keeps the existing 4-second refresh as a fallback. Human replies are recorded as pending before delivery, then marked sent or failed, so the UI and database never hide a failed delivery.

**Tech Stack:** Next.js App Router, React 19, Prisma, TypeScript, SSE, existing Meta official sender.

---

### Task 1: Protect inbox state and add delivery status

**Files:**
- Modify: `apps/vase-labs/app/app/owner/labs/inbox/inbox-conversation-merge.ts`
- Modify: `apps/vase-labs/app/api/v1/inbox/[tenantSlug]/conversations/[conversationId]/reply/route.ts`
- Test: add focused TypeScript tests beside the pure helpers when the repository test runner is available.

- [ ] Preserve locally loaded conversations when a refresh response omits them, while still removing conversations that are explicitly closed.
- [ ] Persist a human message and its `PENDING` delivery record before calling Meta.
- [ ] Update the same delivery record to `SENT` with the provider ID or `FAILED` with the provider error.
- [ ] Return the persisted message and an actionable error payload to the Inbox.

### Task 2: Add tenant-scoped live events

**Files:**
- Create: `apps/vase-labs/app/lib/inbox-events.ts`
- Create: `apps/vase-labs/app/api/v1/inbox/[tenantSlug]/events/route.ts`
- Modify: webhook/message persistence paths and handoff/reply/reactivate routes to publish events.

- [ ] Publish conversation, message, handoff, and delivery changes after successful persistence.
- [ ] Stream events as SSE with keep-alive comments and clean listener removal on disconnect.
- [ ] Never include message content from another tenant.

### Task 3: Connect the Inbox workstation

**Files:**
- Create: `apps/vase-labs/app/app/owner/labs/inbox/inbox-live-events.ts`
- Modify: `apps/vase-labs/app/app/owner/labs/inbox/inbox-workstation.tsx`

- [ ] Subscribe to the tenant SSE endpoint and refresh only the affected conversation/list.
- [ ] Reconnect with backoff and keep the current active conversation and scroll position.
- [ ] Display delivery failures and allow retry without clearing the composer.

### Task 4: Verify

- [ ] Run `git diff --check`.
- [ ] Run `npm run typecheck` from `apps/vase-labs`.
- [ ] Run the focused tests and `npm run build` if the environment has the required database/build variables.

