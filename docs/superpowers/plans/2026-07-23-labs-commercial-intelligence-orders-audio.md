# Labs Commercial Intelligence, Orders, Shipping and Audio Implementation Plan

> **Execution note:** implement each task test-first and commit at every green checkpoint. Deploy database migrations before the application image that reads the new tables.

**Goal:** Turn Vase Labs into a commercial inbox that continuously qualifies leads, guides customers toward a confirmed order, mirrors Vase Business orders and fulfillment settings, reports channel performance, and transcribes inbound audio with a self-hosted service.

**Architecture:** Labs owns conversation state, durable background jobs, insights, draft orders and read projections. Vase App remains the authenticated tenant-aware broker. Vase Business remains the source of truth for products, stock, prices, shipping, branches and final orders. All cross-service writes are idempotent and use the existing service-to-service authentication. Audio is transcribed by an internal faster-whisper service and then re-enters the normal inbound message pipeline as text.

**Stack:** Next.js 16.2 App Router, React 19, Prisma/MySQL, Vitest, OpenAI Responses API, Node/TypeScript workers, Python faster-whisper service, Docker/EasyPanel.

---

## Task 1: Persist continuous conversation intelligence and a durable queue

**Files:**

- Modify: `apps/vase-labs/prisma/schema.prisma`
- Create: `apps/vase-labs/prisma/migrations/20260723120000_conversation_intelligence/migration.sql`
- Create: `apps/vase-labs/app/lib/conversation-insight.ts`
- Create: `apps/vase-labs/app/lib/conversation-analysis-queue.ts`
- Create: `tests/v3-labs-conversation-insight.test.ts`
- Create: `tests/v3-labs-conversation-analysis-queue.test.ts`

**Step 1: Write failing domain tests**

Cover strict labels, score clamping, human-request priority, default settings, normalized configurable weights, malformed model output, and safe JSON array normalization.

**Step 2: Run the focused domain test**

Run: `npm test -- --run tests/v3-labs-conversation-insight.test.ts`

Expected: FAIL because the module does not exist.

**Step 3: Implement the domain contract**

Add:

- `ConversationIntentLabel`: `HOT_LEAD`, `RESEARCHING`, `LOW_INTENT`, `HUMAN_REQUESTED`, `UNCLASSIFIED`.
- A strict parsed insight type containing summary, need, interests, preferences, objections, signals, recommendations, next action, score reasons, identity signals and score.
- Pure validation and normalization helpers.
- Versioned default settings with a default hot-lead threshold of 75.
- Deterministic label resolution where an active/requested handoff overrides every model label.

**Step 4: Write failing queue tests**

Use an in-memory repository double to prove:

- multiple inbound messages coalesce to the latest requested message;
- expired processing leases can be reclaimed;
- valid leases cannot be stolen;
- failed attempts retry up to the configured limit;
- a newer requested message requeues instead of publishing stale results.

**Step 5: Add schema and migration**

Add one-to-one `ConversationInsight` and `ConversationInsightSettings` records and one active `ConversationAnalysisJob` per conversation. Add status indexes for claim queries and cascade relations from assistant/conversation.

**Step 6: Implement queue orchestration**

Keep lease decisions in pure/service code with injected clock, UUID and repository. Use short transactions only for claiming and completion.

**Step 7: Verify**

Run:

```powershell
npm test -- --run tests/v3-labs-conversation-insight.test.ts tests/v3-labs-conversation-analysis-queue.test.ts
npm --workspace @vase/labs run prisma:generate
npm --workspace @vase/labs run typecheck
```

**Step 8: Commit**

`git add ... && git commit -m "feat(labs): persist conversation intelligence jobs"`

## Task 2: Generate insights and process jobs outside the webhook response

**Files:**

- Create: `apps/vase-labs/app/lib/conversation-insight-generator.ts`
- Create: `apps/vase-labs/app/lib/conversation-analysis-repository.ts`
- Create: `apps/vase-labs/app/lib/conversation-analysis-worker.ts`
- Create: `apps/vase-labs/scripts/conversation-analysis-worker.ts`
- Modify: `apps/vase-labs/app/lib/channel-webhook-service.ts`
- Modify: `apps/vase-labs/package.json`
- Create: `tests/v3-labs-conversation-insight-generator.test.ts`
- Create: `tests/v3-labs-conversation-analysis-worker.test.ts`
- Modify: `tests/v3-labs-channel-webhook-service.test.ts`

**Step 1: Write failing generator tests**

Assert a strict Responses API JSON schema, delimiter-wrapped untrusted conversation text, configured analysis model selection, correct token extraction, refusal handling and no leakage of raw transcripts in errors.

**Step 2: Implement the generator**

Use the configured assistant credential with the `fast` profile unless `OPENAI_CONVERSATION_ANALYSIS_MODEL` is set. Request a strict JSON schema and validate the response again locally.

**Step 3: Write failing worker tests**

Cover tenant/assistant isolation, message ordering, projection and insight atomicity, token registration with source `conversation_analysis`, stale completion, retry and preservation of the last valid insight after failure.

**Step 4: Implement the Prisma repository and worker**

Claim batches with leases, load only the claimed conversation and messages, generate the insight, register usage, and atomically update `ConversationInsight` plus the `Conversation` summary/label/score projection.

**Step 5: Enqueue after inbound persistence**

Extend the webhook repository contract with `enqueueConversationAnalysis`. Call it after the inbound message is durable and before acknowledging the webhook, but do not wait for model inference.

**Step 6: Add the worker entry point**

Add `worker:conversation-analysis` using `tsx`, with bounded polling, signal handling, jitter and health logs containing counts/latency but no message content.

**Step 7: Verify and commit**

Run focused tests, the existing webhook/AI runner tests, typecheck and build. Commit as `feat(labs): analyze conversations asynchronously`.

## Task 3: Expose qualification settings and rebuild Activity

**Files:**

- Create: `apps/vase-labs/app/api/labs/settings/conversation-insights/route.ts`
- Create: `apps/vase-labs/app/app/owner/labs/settings/conversation-insight-settings-card.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/settings/page.tsx`
- Create: `apps/vase-labs/app/app/owner/labs/activity/activity-workspace.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/activity/page.tsx`
- Modify: `apps/vase-labs/app/globals.css`
- Create: `tests/v3-labs-conversation-insight-settings-route.test.ts`
- Create: `tests/v3-labs-activity-intelligence-ui.test.ts`

**Step 1: Write failing route and UI tests**

Assert authenticated assistant scoping, 1–100 threshold validation, bounded weights, filters for all labels, score display, analysis state, summary, need, reasons, preferences, objections, recommendations and next action.

**Step 2: Implement settings**

Resolve the assistant from the Labs session on every GET/PATCH. Never accept `assistantId` or tenant identifiers from the body.

**Step 3: Implement Activity**

Use promised `searchParams` per Next.js 16. Filter in Prisma by the current assistant. Render readable Spanish labels, score meter and expandable detail. Show pending/failed state without discarding the latest valid insight.

**Step 4: Verify and commit**

Run route/UI tests, standalone owner UI tests, typecheck and build. Commit as `feat(labs): show commercial lead intelligence`.

## Task 4: Add tenant-aware Business fulfillment and order contracts

**Files:**

- Modify: `apps/vase-app/prisma/schema.prisma`
- Create: `apps/vase-app/prisma/migrations/20260723150000_conversation_order_channels/migration.sql`
- Create: `packages/contracts/src/labs-orders.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `apps/vase-app/src/server/services/labs-business-orders.ts`
- Create: `apps/vase-app/src/app/api/internal/business/labs/fulfillment/route.ts`
- Create: `apps/vase-app/src/app/api/internal/business/labs/orders/quote/route.ts`
- Create: `apps/vase-app/src/app/api/internal/business/labs/orders/route.ts`
- Create: `apps/vase-app/src/app/api/internal/business/labs/orders/snapshot/route.ts`
- Create corresponding Vitest files under `tests/`

**Step 1: Write failing contract and broker tests**

Cover strict service auth, tenant resolution from `globalTenantId`, no caller-controlled Business URL, catalog/stock validation, shipping zone and pickup branch parity, channel mapping and idempotent order creation.

**Step 2: Expand Business channel values**

Add `WHATSAPP`, `INSTAGRAM` and `MESSENGER` while preserving existing `WEB` data and code paths.

**Step 3: Implement read/quote/create/snapshot services**

Reuse the existing Business shipping, branch, pricing, stock and order services instead of duplicating formulas in Labs. Return version/hash fields needed for safe confirmation.

**Step 4: Verify and commit**

Run contract/broker tests plus existing Business order/shipping tests and build both Vase App and contracts. Commit as `feat(business): expose tenant-aware conversational orders`.

## Task 5: Build confirmed conversational order drafts in Labs

**Files:**

- Modify: `apps/vase-labs/prisma/schema.prisma`
- Create: `apps/vase-labs/prisma/migrations/20260723170000_conversation_order_drafts/migration.sql`
- Create: `apps/vase-labs/app/lib/business-order-client.ts`
- Create: `apps/vase-labs/app/lib/conversation-order-draft.ts`
- Create: `apps/vase-labs/app/lib/conversation-order-tools.ts`
- Modify: `apps/vase-labs/app/lib/openai-reply-generator.ts`
- Modify: `apps/vase-labs/app/lib/ai-orchestrator.ts`
- Create focused test files under `tests/`

**Step 1: Write failing state-machine tests**

Cover collecting customer data, line items, delivery/pickup selection, branch/zone validation, quote revision, four-digit confirmation code, exact `CONFIRMAR PEDIDO 4821` match, expiry, changed-price invalidation and duplicate messages.

**Step 2: Add the durable draft model**

Persist structured items/customer/fulfillment, quote snapshot/hash, confirmation code hash, revision, expiry, state, Business order identifiers and idempotency key.

**Step 3: Implement deterministic tools**

The model may propose tool arguments, but server code validates every field against Business. The server—not the model—decides whether a confirmation is exact and whether creation is permitted.

**Step 4: Guide the customer**

Update system instructions so the assistant moves naturally toward an order, asks only missing necessary data, explains delivery/pickup choices from Business, summarizes the quote, and requires the exact confirmation phrase before creation.

**Step 5: Verify and commit**

Run order state/tool tests, existing OpenAI/orchestrator tests, typecheck and build. Commit as `feat(labs): create orders after explicit confirmation`.

## Task 6: Synchronize orders and add Orders navigation/UI

**Files:**

- Modify: `apps/vase-labs/prisma/schema.prisma`
- Create: `apps/vase-labs/prisma/migrations/20260723190000_order_projection/migration.sql`
- Create: `apps/vase-labs/app/lib/order-projection.ts`
- Create: `apps/vase-labs/app/lib/order-reconciliation-worker.ts`
- Create: `apps/vase-labs/app/api/internal/business/orders/events/route.ts`
- Modify: `apps/vase-labs/app/app/owner/labs/labs-owner-nav.tsx`
- Create: `apps/vase-labs/app/app/owner/labs/orders/page.tsx`
- Create: `apps/vase-labs/app/app/owner/labs/orders/orders-workspace.tsx`
- Add route alias: `apps/vase-labs/app/owner/orders/page.tsx`
- Add focused tests under `tests/`

**Step 1: Write failing projection/linking tests**

Prove event idempotency, reconciliation, status history and exact-only linking by conversation ID, order number, normalized phone or normalized email. Explicitly reject fuzzy name matching.

**Step 2: Implement projection and reconciliation**

Events update quickly; a periodic snapshot reconciliation repairs missed events. Business remains authoritative.

**Step 3: Implement Orders**

Add sidebar navigation, channel/status/date filters, customer/order totals, linked conversation, status history and a Business deep link. Scope every query to the resolved assistant tenant.

**Step 4: Verify and commit**

Run projection/UI/nav tests, typecheck and build. Commit as `feat(labs): synchronize and display customer orders`.

## Task 7: Add channel order analytics

**Files:**

- Modify: `apps/vase-labs/app/app/owner/labs/page.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/labs-analytics-charts.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/orders/page.tsx`
- Create: `apps/vase-labs/app/lib/order-analytics.ts`
- Create: `tests/v3-labs-order-analytics.test.ts`
- Modify: `tests/v3-labs-owner-standalone-ui.test.ts`

**Step 1: Write failing aggregation tests**

Cover counts, conversion, ticket, currency separation, status and channel breakdown for WhatsApp, Instagram and Messenger.

**Step 2: Implement deterministic aggregation**

Never sum unlike currencies. Use projected Business timestamps and documented date boundaries in the Buenos Aires timezone.

**Step 3: Render dashboard and Orders statistics**

Add accessible cards/charts and preserve measurable initial chart dimensions.

**Step 4: Verify and commit**

Run analytics/UI tests, typecheck and build. Commit as `feat(labs): report orders by messaging channel`.

## Task 8: Add self-hosted inbound audio transcription

**Files:**

- Create: `services/vase-transcription/Dockerfile`
- Create: `services/vase-transcription/requirements.txt`
- Create: `services/vase-transcription/app/main.py`
- Create: `services/vase-transcription/tests/test_api.py`
- Modify: `apps/vase-labs/prisma/schema.prisma`
- Create: `apps/vase-labs/prisma/migrations/20260723210000_audio_transcription_jobs/migration.sql`
- Create: `apps/vase-labs/app/lib/audio-transcription-client.ts`
- Create: `apps/vase-labs/app/lib/audio-transcription-worker.ts`
- Modify Meta parsers and `apps/vase-labs/app/lib/channel-webhook-service.ts`
- Add Node-focused tests under `tests/`

**Step 1: Write failing service tests**

Cover internal bearer authentication, health, accepted formats, max size/duration, empty audio and structured errors.

**Step 2: Implement faster-whisper**

Default to `small`, CPU `int8`, temporary per-request files, guaranteed cleanup, bounded concurrency and no external AI API.

**Step 3: Write failing Labs job tests**

Cover authenticated Meta download, MIME/size validation, durable retries, transcript persistence, replay into the normal inbound pipeline and no OpenAI token charge for transcription.

**Step 4: Implement the Labs worker**

Store only necessary media metadata and transcript. Do not log media URLs, access tokens or raw transcript.

**Step 5: Verify and commit**

Run Python and Node tests, Labs typecheck/build and container health check. Commit as `feat(labs): transcribe channel audio locally`.

## Task 9: Deployment, migration and end-to-end verification

**Files:**

- Modify: `.env.easypanel.example`
- Modify: `README.md`
- Create: `docs/deploy/labs-commercial-operations.md`
- Add or modify end-to-end tests under `tests/`

**Step 1: Document EasyPanel services**

Document:

- `vase-app` with its migration;
- `vase-labs` with its migration;
- a Labs conversation-analysis/order-reconciliation worker using the same Labs image and environment;
- `vase-transcription` on the private network;
- shared matching `SERVICE_TO_SERVICE_TOKEN`;
- transcription URL/token, worker concurrency and model cache volume.

**Step 2: Run complete verification**

Run:

```powershell
npm test -- --run
npm --workspace @vase/contracts run build
npm --workspace @vase/app run typecheck
npm --workspace @vase/app run build
npm --workspace @vase/labs run typecheck
npm --workspace @vase/labs run build
python -m pytest services/vase-transcription/tests
```

**Step 3: Smoke-test**

Use a test tenant to receive a text and audio message, observe an insight and lead score, assemble a delivery and pickup quote, reject a non-exact confirmation, create exactly one confirmed order, receive the Business event, and see the order/channel statistics in Labs.

**Step 4: Final commit**

`git add ... && git commit -m "docs: deploy Labs commercial operations"`
