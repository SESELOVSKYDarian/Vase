# Vase Labs Inbox and Activity Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Vase Labs Inbox route into an operational queue while preserving the existing Activity analytics page and the approved Labs design.

**Architecture:** Keep both routes as independent Next.js App Router server pages. Activity remains unchanged. Inbox resolves the existing Labs session context, queries only open or escalated conversations with their latest message and unresolved handoff, and renders them with the existing Labs UI primitives. No database, API, navigation, or global styling changes are required.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, Vitest.

---

## Task 1: Add the regression test

- [ ] Extend `tests/v3-labs-owner-standalone-ui.test.ts` with a test that reads both route files.
- [ ] Assert that Inbox no longer re-exports Activity.
- [ ] Assert that Inbox declares its own title and operational query filters.
- [ ] Assert that Activity keeps its existing analytics title and does not become Inbox.
- [ ] Run `npx vitest run tests/v3-labs-owner-standalone-ui.test.ts` and confirm the new test fails for the expected re-export reason.

## Task 2: Implement the operational Inbox page

- [ ] Read the installed Next.js documentation for App Router pages, `headers()`, and `redirect()` before editing.
- [ ] Replace `apps/vase-labs/app/app/owner/labs/inbox/page.tsx` with an independent server page.
- [ ] Resolve the current tenant and assistant through `resolveLabsRequestContext`.
- [ ] Query conversations with status `OPEN` or `ESCALATED`, ordered by last activity.
- [ ] Include the latest message and the latest unresolved handoff (`PENDING` or `ASSIGNED`).
- [ ] Render customer, channel, message direction/content, conversation state, handoff priority/state, message count, and last activity using the existing Labs components.
- [ ] Preserve the current Labs session redirects and `force-dynamic` behavior.
- [ ] Show a clear empty state when the operational queue has no conversations.

## Task 3: Verify behavior and type safety

- [ ] Run `npx vitest run tests/v3-labs-owner-standalone-ui.test.ts` and confirm all focused tests pass.
- [ ] Run `npx tsc --noEmit -p apps/vase-labs/tsconfig.json`.
- [ ] Run `npm run build --workspace @vase/labs`.
- [ ] Run `git diff --check`.
- [ ] Review the diff to confirm Activity, navigation, global CSS, schema, and APIs were not changed.

## Task 4: Commit and integrate

- [ ] Commit the implementation as `fix(labs): separate inbox from activity`.
- [ ] Fetch the latest remote state and confirm the branch can update `main` safely.
- [ ] Push the verified branch to `main` without importing unrelated design changes.
- [ ] Check the deployment/readiness signals and report separately what was locally verified and what still needs an authenticated production check.
