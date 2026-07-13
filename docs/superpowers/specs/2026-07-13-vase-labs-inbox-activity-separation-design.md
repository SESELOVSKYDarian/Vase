# Vase Labs Inbox and Activity Separation Design

## Objective

Make `/app/owner/labs/inbox` an operational conversation queue instead of
re-exporting `/app/owner/labs/activity`. Preserve the current Labs design and
keep Activity as the analytical history view.

## Current Problem

`apps/vase-labs/app/app/owner/labs/inbox/page.tsx` exports the Activity page as
its default component. Both navigation destinations therefore execute the same
query and render the same screen even though the sidebar presents them as
different tools.

## Chosen Approach

Inbox will become a server-rendered operational queue using the existing Labs
Prisma models and UI components. It will query the authenticated assistant's
open and escalated conversations, ordered by the most recent message. Each row
will show:

- customer identity and channel;
- latest message content and direction;
- conversation status and message count;
- pending or assigned handoff priority when present;
- last activity time.

Activity will remain unchanged and continue showing recent conversation
summaries, detected intent, status, human escalation, and date across the wider
history.

## Data Flow

1. Resolve the shared Labs session with `resolveLabsRequestContext`.
2. Query conversations belonging only to the resolved assistant.
3. Limit Inbox to `OPEN` and `ESCALATED` conversations.
4. Include the latest message and most recent unresolved handoff.
5. Render an operational empty state when no conversation needs attention.
6. Preserve the existing authentication redirects and tenant isolation.

No new API route, schema migration, or client-side polling is required for this
separation.

## Presentation

Inbox will reuse `LabsPageHeader`, `LabsSection`, `LabsEmptyState`, and
`LabsStatusPill`. It will keep the current surface, border, spacing, type, and
responsive conventions. No dashboard shell, navigation, global CSS, or
Activity markup will be redesigned.

## Error Handling

- Missing or expired Labs sessions redirect to the shared Vase App sign-in and
  return to Inbox after authentication.
- Other context failures redirect to Vase App, matching the current owner
  routes.
- Conversations without messages show their summary or a neutral fallback.
- Conversations without handoffs show the normal conversation status only.

## Verification

- Add a regression test proving Inbox no longer re-exports Activity.
- Assert that Inbox queries open/escalated conversations, latest messages, and
  unresolved handoffs for the authenticated assistant.
- Keep the existing standalone owner UI tests passing.
- Run the Labs typecheck and production build.
- Run `git diff --check`.
- Verify that production serves distinct Inbox and Activity bundles after
  deployment.

## Acceptance Criteria

- Inbox and Activity render different headings and data structures.
- Inbox is an operational queue; Activity remains analytical history.
- Tenant and assistant scoping remain enforced.
- The current Labs design and navigation remain unchanged.
- No database schema, external API, or unrelated app is modified.
