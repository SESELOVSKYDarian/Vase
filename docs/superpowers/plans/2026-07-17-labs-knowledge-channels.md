# Labs Knowledge and Channels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the technical Labs knowledge and channels dashboards with clean empty states, guided two-step modals, tenant-safe knowledge persistence, copyable integration data, and manual webhook verification.

**Architecture:** Keep both pages as authenticated Server Components and move mutations behind tenant-scoped route handlers. Put validation, credential allowlisting, source grouping, and channel verification in focused pure/service modules so Vitest can exercise behavior without rendering Next.js internals. Reuse the existing provider-selection route for Vase Management, add a narrow service-to-service Business credential endpoint, and use tenant-specific Meta webhook URLs so a verification callback can be attributed to one assistant and channel.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/MySQL, Express (Business integration boundary), Vitest, existing Labs CSS and Lucide icons.

---

## File map

- Create `apps/vase-labs/app/lib/knowledge-source.ts`: canonical source types, file allowlist, payload validation, and grouping.
- Create `apps/vase-labs/app/lib/knowledge-repository.ts`: tenant-scoped creation and listing helpers for `KnowledgeItem`.
- Create `apps/vase-labs/app/api/labs/knowledge/route.ts`: authenticated knowledge creation endpoint.
- Create `apps/vase-labs/app/api/labs/external-management-credentials/route.ts`: authenticated Labs proxy returning only three allowed fields.
- Create `apps/vase-labs/app/app/owner/labs/chatbots/knowledge-add-modal.tsx`: two-step knowledge modal and copy interactions.
- Create `apps/vase-labs/app/app/owner/labs/chatbots/knowledge-groups.tsx`: non-empty source groups.
- Modify `apps/vase-labs/app/app/owner/labs/chatbots/page.tsx`: clean empty state, modal action, grouped records.
- Modify `apps/vase-labs/app/api/labs/integration-provider/route.ts`: keep provider selection response narrow and reusable by the modal.
- Create `apps/vase-editor/server/src/services/productSyncCredentials.js`: shared token lookup/creation used by tenant UI and the internal Labs boundary.
- Modify `apps/vase-editor/server/src/routes/tenant.js`: import the extracted token helper without changing the existing Business UI response.
- Modify `apps/vase-editor/server/src/routes/integrations.js`: add service-token-protected, tenant-specific compatibility credential response.
- Create `apps/vase-labs/app/lib/channel-manual-setup.ts`: tenant-specific webhook values and verification state transitions.
- Create `apps/vase-labs/app/api/labs/channels/setup/route.ts`: prepare a pending channel and return webhook values.
- Create `apps/vase-labs/app/api/labs/channels/verify/route.ts`: report connected, pending, or error state.
- Modify the three tenant-specific webhook GET routes under `apps/vase-labs/app/api/v1/channels/*/[tenantSlug]/webhook/route.ts`: record successful Meta verification.
- Modify `apps/vase-labs/app/app/owner/labs/channels/channel-connect-modal.tsx`: replace OAuth with copy-and-verify flow.
- Modify `apps/vase-labs/app/app/owner/labs/channels/page.tsx`: clean empty state and real-channel-only cards.
- Modify `apps/vase-labs/app/globals.css`: modal choice cards, credential rows, grouped sources, empty states, responsive behavior.
- Create `tests/v3-labs-knowledge-source.test.ts`: source validation and grouping.
- Create `tests/v3-labs-knowledge-routes.test.ts`: tenant-scoped creation and credential allowlisting.
- Create `tests/v3-labs-manual-channel-setup.test.ts`: webhook preparation and verification states.
- Modify `tests/v3-labs-owner-standalone-ui.test.ts`: structural assertions for the new page behavior.

### Task 1: Canonical knowledge source validation and grouping

**Files:**
- Create: `apps/vase-labs/app/lib/knowledge-source.ts`
- Create: `tests/v3-labs-knowledge-source.test.ts`

- [ ] **Step 1: Write failing tests for the five types, exact file allowlist, payload validation, and omission of empty groups**

```ts
import { describe, expect, it } from "vitest";
import { groupKnowledgeItems, parseKnowledgeInput } from "../apps/vase-labs/app/lib/knowledge-source";

describe("Labs knowledge source rules", () => {
  it.each(["manual.pdf", "manual.doc", "manual.docx", "stock.xls", "stock.xlsx", "deck.ppt", "deck.pptx", "notes.txt"])("accepts %s", (fileName) => {
    expect(parseKnowledgeInput({ type: "FILE", title: fileName, fileName }).type).toBe("FILE");
  });

  it.each(["image.png", "archive.zip", "data.csv", "script.js"])("rejects %s", (fileName) => {
    expect(() => parseKnowledgeInput({ type: "FILE", title: fileName, fileName })).toThrow("KNOWLEDGE_FILE_TYPE_UNSUPPORTED");
  });

  it("validates URL and FAQ payloads", () => {
    expect(parseKnowledgeInput({ type: "URL", title: "Ayuda", url: "https://vase.ar/ayuda" })).toMatchObject({ type: "URL" });
    expect(parseKnowledgeInput({ type: "FAQ", title: "Envios", question: "¿Cuando llega?", answer: "En 48 horas." })).toMatchObject({ type: "FAQ" });
    expect(() => parseKnowledgeInput({ type: "URL", title: "Rota", url: "texto" })).toThrow("KNOWLEDGE_URL_INVALID");
  });

  it("returns only populated groups in canonical order", () => {
    const groups = groupKnowledgeItems([
      { id: "2", sourceType: "FAQ", title: "Envios", status: "READY", updatedAt: new Date(2) },
      { id: "1", sourceType: "FILE", title: "Manual", status: "READY", updatedAt: new Date(1) },
    ]);
    expect(groups.map((group) => group.type)).toEqual(["FILE", "FAQ"]);
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run: `npm test -- tests/v3-labs-knowledge-source.test.ts`

Expected: FAIL because `knowledge-source.ts` does not exist.

- [ ] **Step 3: Implement the canonical types and pure validation**

```ts
export const knowledgeSourceTypes = ["FILE", "URL", "FAQ", "VASE_MANAGEMENT", "EXTERNAL_MANAGEMENT"] as const;
export type KnowledgeSourceType = (typeof knowledgeSourceTypes)[number];
const allowedExtensions = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"]);

export function parseKnowledgeInput(input: Record<string, unknown>) {
  const type = String(input.type || "") as KnowledgeSourceType;
  const title = String(input.title || "").trim();
  if (!knowledgeSourceTypes.includes(type) || !title) throw new Error("KNOWLEDGE_INPUT_INVALID");
  if (type === "FILE") {
    const fileName = String(input.fileName || "").trim();
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.has(extension)) throw new Error("KNOWLEDGE_FILE_TYPE_UNSUPPORTED");
    return { type, title, fileName };
  }
  if (type === "URL") {
    const url = String(input.url || "").trim();
    try { new URL(url); } catch { throw new Error("KNOWLEDGE_URL_INVALID"); }
    return { type, title, url };
  }
  if (type === "FAQ") {
    const question = String(input.question || "").trim();
    const answer = String(input.answer || "").trim();
    if (!question || !answer) throw new Error("KNOWLEDGE_FAQ_INVALID");
    return { type, title, question, answer };
  }
  return { type, title };
}

export function groupKnowledgeItems<T extends { sourceType: string }>(items: T[]) {
  return knowledgeSourceTypes.flatMap((type) => {
    const groupedItems = items.filter((item) => item.sourceType === type);
    return groupedItems.length ? [{ type, items: groupedItems }] : [];
  });
}
```

- [ ] **Step 4: Run the focused test and confirm PASS**

Run: `npm test -- tests/v3-labs-knowledge-source.test.ts`

Expected: all knowledge source rule tests pass.

- [ ] **Step 5: Commit the pure domain layer**

```bash
git add apps/vase-labs/app/lib/knowledge-source.ts tests/v3-labs-knowledge-source.test.ts
git commit -m "feat(labs): define knowledge source rules"
```

### Task 2: Tenant-scoped knowledge mutations

**Files:**
- Create: `apps/vase-labs/app/lib/knowledge-repository.ts`
- Create: `apps/vase-labs/app/api/labs/knowledge/route.ts`
- Create: `tests/v3-labs-knowledge-routes.test.ts`

- [ ] **Step 1: Write failing service tests for content mapping and assistant isolation**

```ts
it("maps FAQ content and always writes the resolved assistant id", async () => {
  const writes: unknown[] = [];
  const repository = createKnowledgeRepository({ knowledgeItem: { create: async ({ data }: any) => (writes.push(data), data) } } as any);
  await repository.create("assistant_current", { type: "FAQ", title: "Envios", question: "¿Cuando?", answer: "Mañana" });
  expect(writes).toEqual([expect.objectContaining({ assistantId: "assistant_current", sourceType: "FAQ", content: "Pregunta: ¿Cuando?\nRespuesta: Mañana" })]);
});

it("stores uploaded file metadata as queued until the training worker extracts it", async () => {
  // The first release must not mark an unparsed binary Office document READY.
  expect(mapKnowledgeCreateData("assistant_current", { type: "FILE", title: "Lista", fileName: "lista.xlsx" })).toMatchObject({ status: "QUEUED", sourceType: "FILE" });
});
```

- [ ] **Step 2: Run the focused route test and confirm it fails for missing exports**

Run: `npm test -- tests/v3-labs-knowledge-routes.test.ts`

Expected: FAIL because repository and route behavior do not exist.

- [ ] **Step 3: Implement repository mapping and the authenticated POST route**

The route must call `resolveLabsRequestContext(request.headers.get("cookie"))`, never accept an assistant or tenant id from the body, parse JSON payloads through `parseKnowledgeInput`, and return `201`. Use these exact content mappings:

```ts
const contentByType = {
  URL: (value: { url: string }) => value.url,
  FAQ: (value: { question: string; answer: string }) => `Pregunta: ${value.question}\nRespuesta: ${value.answer}`,
  VASE_MANAGEMENT: () => "Catalogo conectado mediante Vase Management",
  EXTERNAL_MANAGEMENT: () => "Catalogo conectado mediante sistema de gestion externo",
};
```

For files, persist the original filename in `content` with status `QUEUED`; do not claim that a binary file is trained until the existing/future ingestion worker extracts it. This preserves honest state while delivering the approved upload and grouping UX.

- [ ] **Step 4: Run route tests and confirm PASS**

Run: `npm test -- tests/v3-labs-knowledge-routes.test.ts`

Expected: assistant scoping, status mapping, and validation cases pass.

- [ ] **Step 5: Commit the knowledge mutation boundary**

```bash
git add apps/vase-labs/app/lib/knowledge-repository.ts apps/vase-labs/app/api/labs/knowledge/route.ts tests/v3-labs-knowledge-routes.test.ts
git commit -m "feat(labs): add tenant scoped knowledge mutations"
```

### Task 3: Safe Business compatibility credentials

**Files:**
- Create: `apps/vase-editor/server/src/services/productSyncCredentials.js`
- Modify: `apps/vase-editor/server/src/routes/tenant.js`
- Modify: `apps/vase-editor/server/src/routes/integrations.js`
- Create: `apps/vase-labs/app/api/labs/external-management-credentials/route.ts`
- Modify: `tests/v3-labs-knowledge-routes.test.ts`

- [ ] **Step 1: Add failing tests for service authentication and the three-field browser allowlist**

```ts
it("allows only domain, tenantUuid and consumerKey through the Labs proxy", () => {
  expect(toExternalManagementCredentials({
    tenant_id: "tenant-123",
    compatibility: { domain: "https://business.vase.ar", consumer_key: "key", consumer_secret: "must-not-leak" },
    auth: { token: "must-not-leak" },
  })).toEqual({ domain: "business.vase.ar", tenantUuid: "tenant-123", consumerKey: "key" });
});
```

- [ ] **Step 2: Run the test and confirm the allowlist helper is missing**

Run: `npm test -- tests/v3-labs-knowledge-routes.test.ts`

Expected: FAIL for missing `toExternalManagementCredentials`.

- [ ] **Step 3: Add the Business internal endpoint and Labs proxy**

Move the existing `ensureProductSyncToken` implementation from `routes/tenant.js` into `services/productSyncCredentials.js`, export it, and import it from both routers. Add `GET /internal/tenant/:tenantId/product-sync-credentials` to `integrationsRouter`. Require an exact `Bearer ${SERVICE_TO_SERVICE_TOKEN}`, call `ensureProductSyncToken(pool, tenantId)`, build the manifest, and return only:

```js
res.json({
  domain: 'business.vase.ar',
  tenantUuid: tenantId,
  consumerKey: tokenRecord.token_hash,
});
```

The Labs route resolves its authenticated context, calls `${TEFLON_API_URL}/api/v1/integrations/internal/tenant/${context.globalTenantId}/product-sync-credentials` with the service token, validates the upstream shape, and repeats the three-field allowlist. It must never return `consumer_secret`, `auth.token`, or the complete manifest.

- [ ] **Step 4: Run credential boundary tests and confirm PASS**

Run: `npm test -- tests/v3-labs-knowledge-routes.test.ts`

Expected: allowlist and tenant selection tests pass.

- [ ] **Step 5: Commit the credential boundary**

```bash
git add apps/vase-editor/server/src/services/productSyncCredentials.js apps/vase-editor/server/src/routes/tenant.js apps/vase-editor/server/src/routes/integrations.js apps/vase-labs/app/api/labs/external-management-credentials/route.ts tests/v3-labs-knowledge-routes.test.ts
git commit -m "feat(labs): expose safe management connection details"
```

### Task 4: Knowledge modal and grouped page

**Files:**
- Create: `apps/vase-labs/app/app/owner/labs/chatbots/knowledge-add-modal.tsx`
- Create: `apps/vase-labs/app/app/owner/labs/chatbots/knowledge-groups.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/chatbots/page.tsx`
- Modify: `apps/vase-labs/app/globals.css`
- Modify: `tests/v3-labs-owner-standalone-ui.test.ts`

- [ ] **Step 1: Add failing structural UI assertions**

Assert that the page imports `KnowledgeAddModal` and `KnowledgeGroups`, renders `Agregar conocimiento`, and does not contain source shortcuts in its empty-state branch. Assert that the modal contains the five labels, the exact file `accept` value, and the external credential labels.

```ts
expect(modal).toContain('accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"');
for (const label of ["Documento o archivo", "URL", "FAQ manual", "Vase Management", "Sistema de gestion externo"]) expect(modal).toContain(label);
for (const label of ["business.vase.ar", "Tenant UUID", "Consumer Key"]) expect(modal).toContain(label);
```

- [ ] **Step 2: Run the standalone UI test and confirm FAIL**

Run: `npm test -- tests/v3-labs-owner-standalone-ui.test.ts`

Expected: FAIL because the modal and groups are absent.

- [ ] **Step 3: Implement the two-step client modal**

Use a discriminated `selected: KnowledgeSourceType | null`, reset state on close, submit URL/FAQ/file metadata to `/api/labs/knowledge`, POST `{ provider: "VASE_MANAGEMENT" }` to `/api/labs/integration-provider` before creating the Management knowledge item, and fetch the external credential route only after that type is selected. Copy buttons call `navigator.clipboard.writeText(value)` and expose an `aria-live="polite"` confirmation.

- [ ] **Step 4: Implement grouped rendering and the option-A empty state**

`page.tsx` passes database items through `groupKnowledgeItems`. When `items.length === 0`, render one `LabsEmptyState` and no source cards. Otherwise render `KnowledgeGroups`, with one heading per non-empty group and existing `LabsStatusPill` state/date treatment.

- [ ] **Step 5: Add focused responsive styles and run tests**

Run: `npm test -- tests/v3-labs-knowledge-source.test.ts tests/v3-labs-knowledge-routes.test.ts tests/v3-labs-owner-standalone-ui.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the knowledge UX**

```bash
git add apps/vase-labs/app/app/owner/labs/chatbots apps/vase-labs/app/globals.css tests/v3-labs-owner-standalone-ui.test.ts
git commit -m "feat(labs): add guided knowledge source flow"
```

### Task 5: Manual channel setup and attributable webhook verification

**Files:**
- Create: `apps/vase-labs/app/lib/channel-manual-setup.ts`
- Create: `apps/vase-labs/app/api/labs/channels/setup/route.ts`
- Create: `apps/vase-labs/app/api/labs/channels/verify/route.ts`
- Modify: `apps/vase-labs/app/api/v1/channels/whatsapp/[tenantSlug]/webhook/route.ts`
- Modify: `apps/vase-labs/app/api/v1/channels/instagram/[tenantSlug]/webhook/route.ts`
- Modify: `apps/vase-labs/app/api/v1/channels/facebook/[tenantSlug]/webhook/route.ts`
- Create: `tests/v3-labs-manual-channel-setup.test.ts`

- [ ] **Step 1: Write failing tests for URL/key generation and three verification outcomes**

```ts
it("returns a tenant-specific webhook and server-derived key", () => {
  expect(buildManualChannelSetup({ origin: "https://labs.vase.ar", tenantSlug: "norte", globalTenantId: "tenant-1", channelType: "WHATSAPP" })).toEqual({
    webhookUrl: "https://labs.vase.ar/api/v1/channels/whatsapp/norte/webhook",
    webhookKey: generateMetaWebhookVerifyToken("tenant-1"),
  });
});

it.each([
  [{ status: "CONNECTED", lastSyncedAt: new Date() }, "CONNECTED"],
  [{ status: "PENDING", lastSyncedAt: null }, "PENDING"],
  [{ status: "ERROR", lastError: "invalid token" }, "ERROR"],
])("maps stored channel state %o to %s", (channel, expected) => {
  expect(toManualVerificationResult(channel as any).status).toBe(expected);
});
```

- [ ] **Step 2: Run the test and confirm missing-module failure**

Run: `npm test -- tests/v3-labs-manual-channel-setup.test.ts`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement setup using tenant-specific URLs and server-side verify tokens**

The setup route resolves the session context, validates the selected `LabsChannel`, enforces `getChannelCapacity`, and upserts a `PENDING` channel for the assistant. Return only `{ channelId, webhookUrl, webhookKey }`. Do not call `/api/v1/meta/connections/start` and do not return an OAuth URL.

- [ ] **Step 4: Record successful Meta subscription checks**

After each existing tenant-specific webhook GET verifier returns status `200`, update the matching assistant/channel record to `CONNECTED`, set `lastSyncedAt`, and clear `lastError`. Keep invalid keys at `403` and do not update state. The tenant slug resolution must happen through the existing webhook repository; never accept an assistant id from query parameters.

- [ ] **Step 5: Implement verification route**

The POST body contains only `{ channelId }`. Resolve the current assistant, find that channel under the assistant, and map its stored state to:

```ts
type ManualVerificationResult =
  | { status: "CONNECTED" }
  | { status: "PENDING"; message: "Meta todavia no verifico este webhook." }
  | { status: "ERROR"; message: string };
```

- [ ] **Step 6: Run manual channel tests and existing webhook regression tests**

Run: `npm test -- tests/v3-labs-manual-channel-setup.test.ts tests/v3-labs-whatsapp-webhook-route.test.ts tests/v3-labs-instagram-webhook.test.ts tests/v3-labs-facebook-webhook.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit manual channel services**

```bash
git add apps/vase-labs/app/lib/channel-manual-setup.ts apps/vase-labs/app/api/labs/channels apps/vase-labs/app/api/v1/channels tests/v3-labs-manual-channel-setup.test.ts
git commit -m "feat(labs): add manual webhook channel setup"
```

### Task 6: Channel modal and real-record-only page

**Files:**
- Modify: `apps/vase-labs/app/app/owner/labs/channels/channel-connect-modal.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/channels/page.tsx`
- Modify: `apps/vase-labs/app/globals.css`
- Modify: `tests/v3-labs-owner-standalone-ui.test.ts`

- [ ] **Step 1: Add failing structural UI assertions for option A and removal of OAuth**

```ts
expect(channelPage).toContain("data.channels.length === 0");
expect(channelPage).toContain("Todavia no agregaste canales");
expect(channelModal).toContain("Webhook URL");
expect(channelModal).toContain("Webhook Key");
expect(channelModal).toContain("Comprobar conexion");
expect(channelModal).not.toContain("Continuar con Meta");
expect(channelModal).not.toContain("authorizationUrl");
```

- [ ] **Step 2: Run the standalone UI test and confirm FAIL**

Run: `npm test -- tests/v3-labs-owner-standalone-ui.test.ts`

Expected: FAIL against the OAuth modal and placeholder card grid.

- [ ] **Step 3: Replace the modal's second step**

After channel choice, POST to `/api/labs/channels/setup`, render read-only webhook URL/key rows with independent copy buttons, and call `/api/labs/channels/verify` from `Comprobar conexion`. Show explicit loading, connected, pending, and error states. On connected, use `router.refresh()` and close only after the success message is announced.

- [ ] **Step 4: Render the option-A empty state and only actual channel records**

When `data.channels.length === 0`, render `LabsEmptyState` and omit overview metrics, channel grid, webhook summary, endpoint list, and disconnected placeholders. When records exist, map `data.channels` directly; use `channelCopy[channel.type]` and existing status/date helpers.

- [ ] **Step 5: Update modal/card styles and run focused tests**

Run: `npm test -- tests/v3-labs-manual-channel-setup.test.ts tests/v3-labs-owner-standalone-ui.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the channel UX**

```bash
git add apps/vase-labs/app/app/owner/labs/channels apps/vase-labs/app/globals.css tests/v3-labs-owner-standalone-ui.test.ts
git commit -m "feat(labs): simplify channel connection experience"
```

### Task 7: Full verification and visual QA

**Files:**
- Modify only files required by failures found in this task.

- [ ] **Step 1: Run Labs and integration regression tests**

Run: `npm test -- tests/v3-labs-knowledge-source.test.ts tests/v3-labs-knowledge-routes.test.ts tests/v3-labs-manual-channel-setup.test.ts tests/v3-labs-owner-standalone-ui.test.ts tests/v3-labs-channel-webhook-service.test.ts tests/v3-labs-whatsapp-webhook-route.test.ts tests/v3-labs-instagram-webhook.test.ts tests/v3-labs-facebook-webhook.test.ts tests/v3-management-sync.test.ts`

Expected: all selected suites pass with no unhandled rejection.

- [ ] **Step 2: Run Labs typecheck**

Run: `npm run typecheck --workspace @vase/labs`

Expected: TypeScript exits 0.

- [ ] **Step 3: Run the production build**

Run: `npm run build --workspace @vase/labs`

Expected: Next.js production build exits 0 and all new route handlers compile.

- [ ] **Step 4: Run visual and interaction checks at desktop and mobile widths**

Start Labs against a test tenant, then verify with the browser test tooling:

1. Knowledge and Channels show option-A empty states with no technical cards.
2. Both modals trap the intended workflow, close by button/backdrop/Escape, and retain fields after recoverable errors.
3. File picker advertises exactly the approved extensions.
4. Copy actions work and announce success.
5. Consumer Secret never appears in DOM or network response.
6. Channel pending and connected outcomes are visually distinct.
7. At 390px width no credential row, button, or modal overflows.

- [ ] **Step 5: Inspect the final diff and commit verification fixes, if any**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and only intentional implementation files are modified.

If verification required code changes, stage each changed path shown by `git status --short`, re-run the command that exposed the failure, and commit those verified corrections with `git commit -m "fix(labs): polish knowledge and channel flows"`. If no correction was required, do not create an empty commit.
