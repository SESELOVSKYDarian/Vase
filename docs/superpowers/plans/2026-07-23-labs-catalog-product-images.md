# Labs Catalog Product Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Propagate product image URLs from Vase Business into Labs and let the AI safely display up to three catalog-owned images in preview and official Meta channels.

**Architecture:** Keep the internal catalog contract on its existing `imageUrl` field. Fix image extraction at Business, build a tenant-scoped AI catalog resource containing text plus an allowlist, require structured OpenAI output, intersect selected URLs with that allowlist, and deliver approved images through channel-specific Meta payloads.

**Tech Stack:** Node.js, TypeScript, JavaScript, Next.js 16 App Router, React, Prisma/MySQL, PostgreSQL JSONB, Zod, OpenAI Responses API, Meta Graph API, Vitest.

---

### Task 1: Extract and propagate the Business product image

**Files:**
- Modify: `apps/vase-editor/server/src/services/businessCatalogSnapshot.js`
- Modify: `apps/vase-editor/server/src/services/labsCatalogOutboxCore.js`
- Test: `tests/v3-business-catalog-snapshot.test.ts`
- Test: `tests/v3-business-labs-outbox.test.ts`

- [ ] **Step 1: Write failing extraction tests**

Add cases proving the snapshot accepts the formats used by Business:

```ts
it.each([
  [{ image_url: "https://cdn.vase.ar/a.jpg" }, "https://cdn.vase.ar/a.jpg"],
  [{ imageUrl: "https://cdn.vase.ar/b.jpg" }, "https://cdn.vase.ar/b.jpg"],
  [{ image: "https://cdn.vase.ar/c.jpg" }, "https://cdn.vase.ar/c.jpg"],
  [{ images: ["https://cdn.vase.ar/d.jpg"] }, "https://cdn.vase.ar/d.jpg"],
  [{ images: [{ url: "https://cdn.vase.ar/e.jpg" }] }, "https://cdn.vase.ar/e.jpg"],
])("maps Business image data %j", async (data, expected) => {
  // Return a product_cache row with this `data`, build the snapshot and assert:
  expect(snapshot.payload.products[0].imageUrl).toBe(expected);
});

it("drops non-HTTPS and malformed product images without dropping the product", async () => {
  expect(snapshot.payload.products[0]).toMatchObject({ name: "Producto", imageUrl: null });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npx vitest run tests/v3-business-catalog-snapshot.test.ts tests/v3-business-labs-outbox.test.ts
```

Expected: the `data.image` and collection cases fail because the current SQL only extracts `image_url` and `imageUrl`; invalid URLs are not sanitized.

- [ ] **Step 3: Return raw image data and normalize it in one mapper**

Change the snapshot query to select `data` instead of relying on one SQL alias. Add focused helpers to `labsCatalogOutboxCore.js`:

```js
const asPublicHttpsUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

export const resolveBusinessProductImageUrl = (product) => {
  const data = product?.data && typeof product.data === 'object' ? product.data : {};
  const images = Array.isArray(data.images) ? data.images : [];
  const candidates = [
    product.image_url,
    data.image_url,
    data.imageUrl,
    data.image,
    ...images.flatMap((image) =>
      typeof image === 'string' ? [image] : [image?.url, image?.src, image?.image_url]
    ),
  ];
  return candidates.map(asPublicHttpsUrl).find(Boolean) ?? null;
};
```

Use `resolveBusinessProductImageUrl(product)` for `imageUrl`. Preserve all other snapshot fields and keep the API public surface unchanged.

- [ ] **Step 4: Run focused Business tests**

Run:

```bash
npx vitest run tests/v3-business-catalog-snapshot.test.ts tests/v3-business-labs-outbox.test.ts tests/v3-business-catalog-broker.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/vase-editor/server/src/services/businessCatalogSnapshot.js apps/vase-editor/server/src/services/labsCatalogOutboxCore.js tests/v3-business-catalog-snapshot.test.ts tests/v3-business-labs-outbox.test.ts
git commit -m "fix(business): include product images in Labs snapshots"
```

### Task 2: Build a safe catalog image allowlist and structured AI output

**Files:**
- Modify: `apps/vase-labs/app/lib/catalog-service.ts`
- Modify: `apps/vase-labs/app/lib/openai-reply-generator.ts`
- Test: `tests/v3-labs-catalog-service.test.ts`
- Test: `tests/v3-labs-openai-reply-generator.test.ts`

- [ ] **Step 1: Write failing catalog resource tests**

Define the desired return contract:

```ts
type CatalogAiResources = {
  context: string;
  allowedImageUrls: string[];
};
```

Add a test with active/offered/in-stock products containing valid, duplicate, HTTP and null images. Assert:

```ts
expect(await service.buildAiResources("tenant_1")).toEqual({
  context: expect.stringContaining("Imagen disponible: https://cdn.vase.ar/p1.jpg"),
  allowedImageUrls: [
    "https://cdn.vase.ar/p1.jpg",
    "https://cdn.vase.ar/p2.jpg",
  ],
});
```

Inactive, out-of-stock and not-offered products must contribute neither text nor images. URLs must be HTTPS, unique and tenant-scoped.

- [ ] **Step 2: Run catalog test and verify RED**

Run:

```bash
npx vitest run tests/v3-labs-catalog-service.test.ts
```

Expected: FAIL because `buildAiResources` does not exist and `buildAiContext` omits images.

- [ ] **Step 3: Implement `buildAiResources`**

Extract the current product filtering/context formatting into one pass:

```ts
async buildAiResources(globalTenantId: string): Promise<CatalogAiResources> {
  const products = (await repository.list(globalTenantId))
    .filter((product) => product.active && product.stock > 0 && product.offeredByChatbot);
  const allowedImageUrls = [...new Set(products
    .map((product) => normalizeHttpsImageUrl(product.imageUrl))
    .filter((url): url is string => Boolean(url)))];
  return {
    context: products.map(formatCatalogProductForAi).join("\n\n"),
    allowedImageUrls,
  };
}
```

Keep `buildAiContext(globalTenantId)` as a compatibility wrapper returning `(await buildAiResources(...)).context`.

- [ ] **Step 4: Write failing structured-output tests**

Update `AiReplyResult` to include `imageUrls: string[]`. Add tests proving:

```ts
expect(requestBody.text.format).toMatchObject({
  type: "json_schema",
  name: "vase_catalog_reply",
  strict: true,
});
expect(result).toMatchObject({
  text: "Te muestro el producto.",
  imageUrls: ["https://cdn.vase.ar/p1.jpg"],
});
```

Pass `allowedImageUrls` to `generateReply`. Mock OpenAI returning JSON with allowed, invented, duplicate, HTTP and more than three URLs. Assert the result contains only unique exact allowlist matches, in model order, limited to three. Add no-image and malformed structured-output cases.

- [ ] **Step 5: Run generator test and verify RED**

Run:

```bash
npx vitest run tests/v3-labs-openai-reply-generator.test.ts
```

Expected: FAIL because the generator requests plain text and does not validate images.

- [ ] **Step 6: Implement structured output and post-validation**

Send the documented Responses API format:

```ts
text: {
  format: {
    type: "json_schema",
    name: "vase_catalog_reply",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        text: { type: "string" },
        imageUrls: { type: "array", items: { type: "string" }, maxItems: 3 },
      },
      required: ["text", "imageUrls"],
    },
  },
},
```

Parse `output_text` as JSON. Validate a non-empty `text`. Build a `Set` from normalized HTTPS `allowedImageUrls`, then retain exact matches only, deduplicate, and slice to three. In system instructions, state that images are selected only when requested or required for identification and only from the provided catalog.

- [ ] **Step 7: Run focused tests and commit**

Run:

```bash
npx vitest run tests/v3-labs-catalog-service.test.ts tests/v3-labs-openai-reply-generator.test.ts
```

Expected: PASS.

```bash
git add apps/vase-labs/app/lib/catalog-service.ts apps/vase-labs/app/lib/openai-reply-generator.ts tests/v3-labs-catalog-service.test.ts tests/v3-labs-openai-reply-generator.test.ts
git commit -m "feat(labs): select catalog images in AI replies"
```

### Task 3: Deliver approved images through official Meta channels

**Files:**
- Modify: `apps/vase-labs/app/lib/ai-orchestrator.ts`
- Modify: `apps/vase-labs/app/lib/channel-ai-runner.ts`
- Modify: `apps/vase-labs/app/lib/official-channel-sender.ts`
- Test: `tests/v3-labs-operation-services.test.ts`
- Test: `tests/v3-labs-channel-ai-runner.test.ts`
- Test: `tests/v3-labs-official-channel-sender.test.ts`

- [ ] **Step 1: Write failing sender payload tests**

Add cases asserting text is sent first and each image afterward:

```ts
await sender.send({
  globalTenantId: "tenant_123",
  channelType: "WHATSAPP",
  recipientId: "549...",
  text: "Te muestro el producto.",
  imageUrls: ["https://cdn.vase.ar/p1.jpg"],
});

expect(JSON.parse(requests[1].init.body as string)).toEqual({
  messaging_product: "whatsapp",
  to: "549...",
  type: "image",
  image: { link: "https://cdn.vase.ar/p1.jpg" },
});
```

For Instagram and Facebook assert:

```ts
message: {
  attachment: {
    type: "image",
    payload: { url: "https://cdn.vase.ar/p1.jpg", is_reusable: true },
  },
}
```

Assert a failed image response throws `META_SEND_FAILED` after the text request and no later images are sent.

- [ ] **Step 2: Run sender tests and verify RED**

Run:

```bash
npx vitest run tests/v3-labs-official-channel-sender.test.ts
```

Expected: FAIL because `send` accepts and sends text only.

- [ ] **Step 3: Implement sequential text and image delivery**

Add `imageUrls?: string[]` to the sender input. Resolve/decrypt the channel context once. Extract a `sendGraphPayload` helper that posts and validates one request. Send the current text payload, then at most three approved image payloads sequentially. Return the text provider message ID as the logical delivery ID.

- [ ] **Step 4: Write failing orchestration tests**

Make catalog return:

```ts
{
  context: "# Producto\nImagen disponible: https://cdn.vase.ar/p1.jpg",
  allowedImageUrls: ["https://cdn.vase.ar/p1.jpg"],
}
```

Assert the generator receives the allowlist and `sendReply` receives only `reply.imageUrls`. Assert persistence remains text-only and a media delivery failure marks the delivery `FAILED`.

- [ ] **Step 5: Run orchestration tests and verify RED**

Run:

```bash
npx vitest run tests/v3-labs-operation-services.test.ts tests/v3-labs-channel-ai-runner.test.ts
```

Expected: FAIL because the orchestrator passes only context/text.

- [ ] **Step 6: Wire catalog resources through the runner**

Update dependency interfaces so the orchestrator calls `buildAiResources`. Combine `resources.context` with knowledge, pass `resources.allowedImageUrls` to `generateReply`, and pass validated `reply.imageUrls` to `sendReply`. Update the production runner to forward those images to `OfficialChannelSender.send`.

- [ ] **Step 7: Run channel tests and commit**

Run:

```bash
npx vitest run tests/v3-labs-operation-services.test.ts tests/v3-labs-channel-ai-runner.test.ts tests/v3-labs-official-channel-sender.test.ts
```

Expected: PASS.

```bash
git add apps/vase-labs/app/lib/ai-orchestrator.ts apps/vase-labs/app/lib/channel-ai-runner.ts apps/vase-labs/app/lib/official-channel-sender.ts tests/v3-labs-operation-services.test.ts tests/v3-labs-channel-ai-runner.test.ts tests/v3-labs-official-channel-sender.test.ts
git commit -m "feat(labs): send catalog images through Meta channels"
```

### Task 4: Display catalog images in the assistant preview

**Files:**
- Modify: `apps/vase-labs/app/api/labs/assistant/test/route.ts`
- Modify: `apps/vase-labs/app/app/owner/labs/chatbots/assistant-test-panel.tsx`
- Modify: `apps/vase-labs/app/globals.css`
- Test: `tests/v3-labs-assistant-test-route.test.ts`
- Create: `tests/v3-labs-assistant-test-images-ui.test.ts`

- [ ] **Step 1: Write failing preview route tests**

Extend the resolved assistant fixture with `globalTenantId`. Inject `buildCatalogResources`. Assert knowledge and catalog text are combined, the allowlist reaches the generator, and the response contains:

```ts
{
  reply: "Te muestro el producto.",
  imageUrls: ["https://cdn.vase.ar/p1.jpg"],
  model: "gpt-5.6-terra",
  usage: { inputTokens: 10, outputTokens: 6 },
}
```

- [ ] **Step 2: Run route test and verify RED**

Run:

```bash
npx vitest run tests/v3-labs-assistant-test-route.test.ts
```

Expected: FAIL because preview uses knowledge only and omits `imageUrls`.

- [ ] **Step 3: Implement preview catalog resources**

Resolve `assistant.globalTenantId`, call knowledge and catalog concurrently, combine their text contexts, pass the allowlist to the generator, and return validated `reply.imageUrls`. Configure the production handler with `labsCatalogService.buildAiResources`.

- [ ] **Step 4: Write failing UI contract test**

Assert the panel:

- stores `payload.imageUrls`;
- renders a responsive image list beneath the reply;
- uses HTTPS URLs directly;
- has useful alt text such as `Imagen de producto 1`;
- clears previous images on new submit/error.

- [ ] **Step 5: Run UI test and verify RED**

Run:

```bash
npx vitest run tests/v3-labs-assistant-test-images-ui.test.ts
```

Expected: FAIL because the panel renders text only.

- [ ] **Step 6: Implement the preview gallery**

Add `imageUrls` state, populate it only from a successful response, and render:

```tsx
{imageUrls.length ? (
  <div className="labs-assistant-message-images">
    {imageUrls.map((url, index) => (
      <img key={url} src={url} alt={`Imagen de producto ${index + 1}`} />
    ))}
  </div>
) : null}
```

Add compact responsive CSS with bounded height, `object-fit: cover`, rounded borders and one-column mobile layout. Do not add an image proxy or local storage.

- [ ] **Step 7: Run preview tests and commit**

Run:

```bash
npx vitest run tests/v3-labs-assistant-test-route.test.ts tests/v3-labs-assistant-test-images-ui.test.ts
```

Expected: PASS.

```bash
git add apps/vase-labs/app/api/labs/assistant/test/route.ts apps/vase-labs/app/app/owner/labs/chatbots/assistant-test-panel.tsx apps/vase-labs/app/globals.css tests/v3-labs-assistant-test-route.test.ts tests/v3-labs-assistant-test-images-ui.test.ts
git commit -m "feat(labs): show catalog images in assistant preview"
```

### Task 5: Integrated verification

**Files:**
- Verify only.

- [ ] **Step 1: Run all focused regression tests**

```bash
npx vitest run \
  tests/v3-business-catalog-snapshot.test.ts \
  tests/v3-business-labs-outbox.test.ts \
  tests/v3-business-catalog-broker.test.ts \
  tests/v3-labs-business-catalog-snapshot.test.ts \
  tests/v3-labs-catalog-service.test.ts \
  tests/v3-labs-openai-reply-generator.test.ts \
  tests/v3-labs-operation-services.test.ts \
  tests/v3-labs-channel-ai-runner.test.ts \
  tests/v3-labs-official-channel-sender.test.ts \
  tests/v3-labs-assistant-test-route.test.ts \
  tests/v3-labs-assistant-test-images-ui.test.ts
```

Expected: all selected suites pass.

- [ ] **Step 2: Run typechecks and production builds**

```bash
npm run typecheck --workspace @vase/labs
npm run build --workspace @vase/labs
npm run build --workspace @vase/app
```

Run the existing Vase Business server test/lint command identified in `apps/vase-editor/server/package.json`. Expected: exit code 0 for every applicable command.

- [ ] **Step 3: Inspect scope**

```bash
git diff --check
git status --short
git log --oneline main..HEAD
```

Expected: clean worktree, no whitespace errors, and only the planned Business/Labs changes plus tests/docs.

- [ ] **Step 4: Request final review and integrate**

Review against `docs/superpowers/specs/2026-07-23-labs-catalog-product-images-design.md`. After approval, fast-forward `main`, push if repository credentials allow it, and deploy `vase-business` plus `vase-labs`. `vase-app` does not require deployment because the internal `imageUrl` contract is unchanged.
