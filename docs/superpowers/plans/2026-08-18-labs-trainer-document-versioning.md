# Labs Trainer Document Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make trainer instructions locate and version the correct uploaded document, expose per-file history, and restore any prior effective version without overwriting the original object.

**Architecture:** A focused document-context module resolves effective content, ranks files, and builds relevant excerpts. Confirmed corrections create full effective document snapshots transactionally; the AI runtime and trainer share the same resolution rule. Per-file history and restore APIs expose immutable revisions in Knowledge.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma/MySQL, OpenAI Responses API, Vitest, React client components.

---

### Task 1: Relevant document selection

**Files:**
- Create: `apps/vase-labs/app/lib/trainer-document-context.ts`
- Modify: `apps/vase-labs/scripts/trainer-audio-worker.ts`
- Modify: `apps/vase-labs/app/lib/trainer-instruction-interpreter.ts`
- Test: `tests/v3-labs-trainer-document-context.test.ts`
- Test: `tests/v3-labs-trainer-instruction-interpreter.test.ts`

- [ ] Write a failing test where “Teflón Central de Mar del Plata” appears after the first 500 characters of a `FILE` item and assert the selector returns that file with an excerpt containing the schedule.
- [ ] Run `npm test -- --run tests/v3-labs-trainer-document-context.test.ts` and verify the missing module failure.
- [ ] Implement `selectTrainerKnowledgeContext(instruction, items, corrections)` with normalized lexical scoring, active-correction resolution, ambiguity detection, and excerpts centered around matched terms.
- [ ] Change the worker query to load `content` and `extractedText`, load active corrections, and pass the selected context to the interpreter.
- [ ] Change the interpreter fallback so a matched `FILE` produces `DOCUMENT_CORRECTION` with its exact `targetKnowledgeId`; only create a FAQ when no relevant file exists.
- [ ] Run both focused tests and verify they pass.

### Task 2: Full effective document versions

**Files:**
- Create: `apps/vase-labs/app/lib/knowledge-document-version.ts`
- Modify: `apps/vase-labs/app/lib/channel-webhook-service.ts`
- Modify: `apps/vase-labs/app/lib/channel-ai-runner.ts`
- Test: `tests/v3-labs-knowledge-document-version.test.ts`
- Test: `tests/v3-labs-channel-webhook-service.test.ts`

- [ ] Write failing tests for resolving original versus active content and applying a replacement without reducing the document to one sentence.
- [ ] Run the focused tests and verify failure for missing helpers.
- [ ] Implement `resolveEffectiveDocumentContent(original, corrections)` and `applyDocumentCorrection(current, proposed)` with explicit `beforeText`, `afterText`, and full snapshot output.
- [ ] On confirmation, deactivate prior corrections and create one active full-content correction in the same Prisma transaction as `KnowledgeRevision`.
- [ ] Update `channel-ai-runner.ts` to resolve effective full content rather than replacing a document with a correction sentence.
- [ ] Run the focused repository and service tests.

### Task 3: Per-file history and restoration API

**Files:**
- Create: `apps/vase-labs/app/api/labs/knowledge/files/[knowledgeId]/history/route.ts`
- Create: `apps/vase-labs/app/api/labs/knowledge/files/[knowledgeId]/restore/route.ts`
- Modify: `apps/vase-labs/app/api/labs/knowledge/trainer/revisions/[revisionId]/revert/route.ts`
- Test: `tests/v3-labs-knowledge-file-history-api.test.ts`

- [ ] Write failing handler tests proving tenant/assistant scoping, ordered history, restoration to the original, and restoration to a selected revision.
- [ ] Run the API test and verify route/handler failures.
- [ ] Implement authenticated GET history returning revision metadata, proposal transcript, before/after summaries, and active state.
- [ ] Implement authenticated POST restore that creates a new revision, deactivates the old correction, and activates the restored full snapshot transactionally.
- [ ] Route the existing generic revert behavior through the same snapshot restoration semantics for document revisions.
- [ ] Run the API tests and verify all cases pass.

### Task 4: Knowledge history interface

**Files:**
- Create: `apps/vase-labs/app/app/owner/labs/chatbots/knowledge-file-history.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/chatbots/knowledge-groups.tsx`
- Modify: `apps/vase-labs/app/globals.css`
- Test: `tests/v3-labs-knowledge-file-history-ui.test.ts`

- [ ] Write a failing static/component test requiring a history icon on `FILE` rows, an accessible drawer, original-version entry, before/after content, and restore confirmation.
- [ ] Run the UI test and verify failure.
- [ ] Add a `History` icon button to each file row and implement a lazy-loaded history drawer using the authenticated endpoints.
- [ ] Add pending, error, empty, active-version, and restoring states; close on Escape and backdrop click.
- [ ] Style the drawer with existing Labs tokens and responsive mobile behavior.
- [ ] Run the UI and existing Knowledge tests.

### Task 5: Ambiguity, observability, and full verification

**Files:**
- Modify: `apps/vase-labs/scripts/trainer-audio-worker.ts`
- Modify: `apps/vase-labs/app/app/owner/labs/inbox/trainer/page.tsx`
- Modify: `tests/v3-labs-knowledge-trainer.test.ts`

- [ ] Add a failing test that two similarly ranked documents request clarification and do not consume repeated technical retries.
- [ ] Implement a distinct clarification outcome that sends a WhatsApp reply, stores the transcript, and finishes without marking a technical failure.
- [ ] Confirm the Trainer Inbox renders transcript and technical error independently.
- [ ] Run `npm test -- --run tests/v3-labs-trainer-document-context.test.ts tests/v3-labs-trainer-instruction-interpreter.test.ts tests/v3-labs-knowledge-document-version.test.ts tests/v3-labs-channel-webhook-service.test.ts tests/v3-labs-knowledge-file-history-api.test.ts tests/v3-labs-knowledge-file-history-ui.test.ts tests/v3-labs-knowledge-trainer.test.ts`.
- [ ] Run `npm test -- --run` and record any unrelated existing failures separately.
- [ ] Run `npm run typecheck --workspace @vase/labs`; if the known missing AWS SDK installation still blocks it, report the exact diagnostics without claiming typecheck success.
