# Management to Business Automatic Product Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically propagate every Management product, stock, archive, and image change to Business without requiring repeated manual synchronization.

**Architecture:** Management will write a versioned product event to a transactional outbox whenever synchronized product state changes. A dedicated worker delivers those events to a tenant-aware, idempotent Business receiver; Business preserves its web-owned fields and manual image overrides, then uses its existing outbox to update Labs. A sequence-based reconciliation endpoint repairs missed deliveries.

**Tech Stack:** Next.js route handlers, TypeScript, Prisma/PostgreSQL, Express, node-postgres, Zod contracts, Vitest.

---

## File structure

### Shared contract

- Modify `packages/contracts/src/index.ts`: extend the product event with
  `sequence`, `changedFields`, and normalized images.
- Modify `tests/v3-contracts.test.ts`: prove valid and invalid event payloads.

### Vase Management

- Modify `apps/vase-management/prisma/schema.prisma`: add product image data,
  tenant event sequence, and claim/dead-letter outbox fields.
- Create
  `apps/vase-management/prisma/migrations/20260724190000_automatic_business_product_sync/migration.sql`:
  apply the PostgreSQL schema changes.
- Modify `apps/vase-management/lib/integration/sync-core.ts`: construct versioned
  product events and classify delivery responses.
- Replace `apps/vase-management/lib/integration/outbox.ts`: expose
  transaction-aware enqueueing, safe row claiming, delivery, retry, and
  reconciliation queries.
- Create `apps/vase-management/lib/integration/product-mutations.ts`: centralize
  product version increments and transactional outbox insertion.
- Modify `apps/vase-management/app/api/productos/route.ts`: create products
  through the mutation boundary.
- Modify `apps/vase-management/app/api/productos/[id]/route.ts`: edit/archive
  through the mutation boundary.
- Modify `apps/vase-management/lib/stock.service.ts`: increment product version
  and enqueue after stock changes in the caller transaction.
- Modify `apps/vase-management/app/api/stock/route.ts`: route absolute stock
  adjustments through the synchronized stock service.
- Modify `apps/vase-management/app/api/utilidades/cierre/route.ts`: publish
  reconstructed stock through the synchronized mutation boundary.
- Modify `apps/vase-management/app/api/internal/sync/process/route.ts`: return
  useful processing counts.
- Create `apps/vase-management/app/api/internal/sync/status/route.ts`: expose
  pending, failed, oldest-pending, and last-success health data.
- Create `apps/vase-management/app/api/internal/sync/changes/route.ts`: expose
  tenant-scoped sequence reconciliation.
- Create `apps/vase-management/scripts/management-sync-worker.ts`: continuously
  process the outbox.
- Modify `apps/vase-management/package.json`: add `sync:worker`.
- Modify `apps/vase-management/.env.example`: document worker configuration.
- Modify `apps/vase-management/Dockerfile`: provide a worker-compatible image
  without changing the web default command.

### Vase Business (`vase-editor`)

- Create
  `apps/vase-editor/server/src/services/managementProductEvents.js`: validate
  tenant mapping, receipts, versions, locks, and image ownership.
- Modify `apps/vase-editor/server/src/services/integration.service.js`: allow an
  existing database client and preserve Business-owned content.
- Modify `apps/vase-editor/server/src/routes/integrations.js`: delegate the
  Management event endpoint to the service.
- Modify `apps/vase-editor/server/src/routes/tenant.js`: mark images manual when
  the editor changes them and support restoring inherited images.
- Create
  `apps/vase-editor/server/sql/management-product-events-migration.sql`: add
  receipt/version/cursor schema.

### Tests and deployment notes

- Expand `tests/v3-management-sync.test.ts`: Management event, mutation, worker,
  and retry coverage.
- Create `tests/v3-business-management-events.test.ts`: Business receiver,
  tenant, version, image, and atomicity coverage.
- Create `tests/v3-management-product-sync-wiring.test.ts`: prove every known
  product/stock writer uses the synchronization boundary.
- Modify `docs/v3/easypanel.md`: document the Management worker process and
  initial reconciliation.

### Task 1: Extend the shared event contract

**Files:**
- Modify: `packages/contracts/src/index.ts`
- Modify: `tests/v3-contracts.test.ts`

- [ ] **Step 1: Write failing contract tests**

Add assertions that the product event requires a positive tenant sequence,
accepts explicit changed fields, and normalizes an HTTPS image collection:

```ts
const event = managementSyncEventSchema.parse({
  eventId: "evt-7",
  globalTenantId: "tenant-1",
  sequence: 31,
  entity: "PRODUCT",
  action: "UPSERT",
  externalId: "product-9",
  version: 7,
  occurredAt: "2026-07-24T15:40:00.000Z",
  changedFields: ["price", "stock", "images"],
  payload: {
    price: 12500,
    stock: 8,
    images: [{ url: "https://uploads.vase.ar/p.jpg", alt: "Griferia", position: 0 }],
  },
});
expect(event.sequence).toBe(31);
expect(event.changedFields).toEqual(["price", "stock", "images"]);
expect(() => managementSyncEventSchema.parse({ ...event, sequence: 0 })).toThrow();
```

- [ ] **Step 2: Run the focused contract test**

Run:

```powershell
npx vitest run tests/v3-contracts.test.ts
```

Expected: failure because `sequence` and `changedFields` are not part of the
schema.

- [ ] **Step 3: Implement the contract**

Add reusable image and field schemas and extend `managementSyncEventSchema`:

```ts
export const managementProductImageSchema = z.object({
  url: z.url().refine((value) => value.startsWith("https://"), "HTTPS image URL required"),
  alt: z.string().max(300).nullable().optional(),
  position: z.number().int().nonnegative().default(0),
});

export const managementProductChangedFieldSchema = z.enum([
  "sku",
  "price",
  "priceWholesale",
  "stock",
  "active",
  "images",
]);

export const managementSyncEventSchema = z.object({
  eventId: z.string().min(1),
  globalTenantId: z.string().min(1),
  sequence: z.number().int().positive(),
  entity: z.enum(["PRODUCT", "CATEGORY", "PRICE", "STOCK", "CUSTOMER", "ORDER"]),
  action: z.enum(["UPSERT", "ARCHIVE"]),
  externalId: z.string().min(1),
  version: z.number().int().positive(),
  occurredAt: z.iso.datetime(),
  changedFields: z.array(managementProductChangedFieldSchema).default([]),
  payload: z.record(z.string(), z.unknown()),
});
```

- [ ] **Step 4: Run the focused test**

Run:

```powershell
npx vitest run tests/v3-contracts.test.ts
```

Expected: all contract tests pass.

- [ ] **Step 5: Commit**

```powershell
git add packages/contracts/src/index.ts tests/v3-contracts.test.ts
git commit -m "feat: version management product events"
```

### Task 2: Add Management persistence for automatic delivery

**Files:**
- Modify: `apps/vase-management/prisma/schema.prisma`
- Create: `apps/vase-management/prisma/migrations/20260724190000_automatic_business_product_sync/migration.sql`
- Modify: `tests/v3-management-sync.test.ts`

- [ ] **Step 1: Write failing schema assertions**

Add a test that reads `schema.prisma` and verifies:

```ts
expect(schema).toContain("images          Json?");
expect(schema).toContain("syncSequence   BigInt");
expect(schema).toContain("claimedAt      DateTime?");
expect(schema).toContain("DEAD_LETTER");
```

Also assert that the migration creates a per-company sequence function and
outbox claim indexes.

- [ ] **Step 2: Run the focused test**

Run:

```powershell
npx vitest run tests/v3-management-sync.test.ts
```

Expected: failure on the missing schema fields.

- [ ] **Step 3: Add Prisma fields**

Add:

```prisma
model Company {
  // existing fields
  syncSequence BigInt @default(0)
}

model Product {
  // existing fields
  images Json?
}

model ManagementSyncOutbox {
  // existing fields
  sequence      BigInt
  claimedAt     DateTime?
  claimedBy     String?
  deadLetterAt  DateTime?

  @@unique([globalTenantId, sequence, destination])
  @@index([status, nextAttemptAt, claimedAt])
}
```

Use status values `PENDING`, `PROCESSING`, `FAILED`, `COMPLETED`, and
`DEAD_LETTER`; the column remains text to avoid an unnecessary enum migration.

- [ ] **Step 4: Write the SQL migration**

The migration must:

```sql
ALTER TABLE "companies" ADD COLUMN "syncSequence" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN "images" JSONB;
ALTER TABLE "management_sync_outbox"
  ADD COLUMN "sequence" BIGINT,
  ADD COLUMN "claimedAt" TIMESTAMP(3),
  ADD COLUMN "claimedBy" TEXT,
  ADD COLUMN "deadLetterAt" TIMESTAMP(3);

UPDATE "management_sync_outbox"
SET "sequence" = EXTRACT(EPOCH FROM "createdAt")::BIGINT * 1000
WHERE "sequence" IS NULL;

ALTER TABLE "management_sync_outbox"
  ALTER COLUMN "sequence" SET NOT NULL;

CREATE UNIQUE INDEX "management_sync_outbox_tenant_sequence_destination_key"
  ON "management_sync_outbox"("globalTenantId", "sequence", "destination");
CREATE INDEX "management_sync_outbox_claim_idx"
  ON "management_sync_outbox"("status", "nextAttemptAt", "claimedAt");

UPDATE "management_sync_outbox"
SET "status" = 'DEAD_LETTER',
    "deadLetterAt" = NOW(),
    "lastError" = 'DIRECT_LABS_ROUTE_RETIRED'
WHERE "destination" = 'LABS'
  AND "status" IN ('PENDING', 'FAILED', 'PROCESSING');
```

- [ ] **Step 5: Generate and validate Prisma**

Run:

```powershell
npm run db:generate --workspace vase-business
npx prisma validate --schema apps/vase-management/prisma/schema.prisma
```

Expected: Prisma client generation and schema validation succeed.

- [ ] **Step 6: Commit**

```powershell
git add apps/vase-management/prisma/schema.prisma apps/vase-management/prisma/migrations/20260724190000_automatic_business_product_sync/migration.sql tests/v3-management-sync.test.ts
git commit -m "feat: persist management product sync sequence"
```

### Task 3: Create the transactional Management mutation boundary

**Files:**
- Create: `apps/vase-management/lib/integration/product-mutations.ts`
- Modify: `apps/vase-management/lib/integration/sync-core.ts`
- Modify: `apps/vase-management/lib/integration/outbox.ts`
- Modify: `tests/v3-management-sync.test.ts`

- [ ] **Step 1: Write failing mutation tests**

Mock a Prisma transaction and prove a mutation increments the version and
creates exactly one `BUSINESS` event:

```ts
expect(tx.product.update).toHaveBeenCalledWith({
  where: { id: "p1" },
  data: expect.objectContaining({ sourceVersion: { increment: 1 } }),
});
expect(tx.managementSyncOutbox.create).toHaveBeenCalledWith({
  data: expect.objectContaining({
    destination: "BUSINESS",
    externalId: "p1",
    version: 2,
    sequence: 11n,
  }),
});
expect(tx.managementSyncOutbox.create).not.toHaveBeenCalledWith({
  data: expect.objectContaining({ destination: "LABS" }),
});
```

- [ ] **Step 2: Run the focused test**

Run:

```powershell
npx vitest run tests/v3-management-sync.test.ts
```

Expected: failure because the transaction-aware mutation helper does not exist.

- [ ] **Step 3: Implement event mapping**

Update `mapManagementProductEvent` to include `sequence`, `changedFields`, and
the normalized `images` value from the Product row. Keep only Management-owned
fields in the payload:

```ts
payload: {
  sku: product.code,
  price: product.price,
  priceWholesale: product.priceWholesale,
  stock: product.stock,
  active: product.active,
  images: product.images,
}
```

If no `priceWholesale` column exists in Management, omit it instead of deriving
or inventing a value.

- [ ] **Step 4: Implement transaction-aware enqueueing**

Export:

```ts
export async function enqueueManagementProductInTransaction(
  tx: Prisma.TransactionClient,
  productId: string,
  changedFields: ManagementProductChangedField[],
): Promise<ManagementSyncEvent | null>
```

The function locks the owning company row, increments `syncSequence`, reloads
the product and company integration fields, returns `null` unless
`integrationProvider === "VASE_MANAGEMENT"` and `globalTenantId` exists, and
inserts one `BUSINESS` outbox row.

- [ ] **Step 5: Implement the mutation helper**

Export:

```ts
export async function mutateManagementProduct<T>(
  tx: Prisma.TransactionClient,
  input: {
    productId: string;
    data: Prisma.ProductUpdateInput;
    changedFields: ManagementProductChangedField[];
  },
): Promise<Product>
```

It performs the update with `sourceVersion: { increment: 1 }`, then calls
`enqueueManagementProductInTransaction` before returning the reloaded Product.

- [ ] **Step 6: Run the focused test**

Run:

```powershell
npx vitest run tests/v3-management-sync.test.ts
```

Expected: mutation, mapping, and single-destination assertions pass.

- [ ] **Step 7: Commit**

```powershell
git add apps/vase-management/lib/integration/product-mutations.ts apps/vase-management/lib/integration/sync-core.ts apps/vase-management/lib/integration/outbox.ts tests/v3-management-sync.test.ts
git commit -m "feat: add transactional product sync boundary"
```

### Task 4: Wire product create, edit, and archive

**Files:**
- Modify: `apps/vase-management/app/api/productos/route.ts`
- Modify: `apps/vase-management/app/api/productos/[id]/route.ts`
- Create: `tests/v3-management-product-sync-wiring.test.ts`

- [ ] **Step 0: Read the installed Next.js route-handler guide**

Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
completely before editing either route. Preserve the repository's installed
Next.js request, response, and route conventions.

- [ ] **Step 1: Write failing route tests**

Test that:

```ts
expect(createTransaction).toHaveBeenCalledTimes(1);
expect(enqueueInTransaction).toHaveBeenCalledWith(
  expect.anything(),
  createdProduct.id,
  expect.arrayContaining(["sku", "price", "stock", "active"]),
);
expect(mutateManagementProduct).toHaveBeenCalledWith(
  expect.anything(),
  expect.objectContaining({ productId: "p1" }),
);
```

Archive must send `active`; image input must send `images`.

- [ ] **Step 2: Run the new test**

Run:

```powershell
npx vitest run tests/v3-management-product-sync-wiring.test.ts
```

Expected: failure because edit/archive do not use the mutation boundary and
create enqueues outside its transaction.

- [ ] **Step 3: Make create atomic**

Move product creation, initial stock movement, and
`enqueueManagementProductInTransaction` into one `prisma.$transaction`.
Derive `changedFields` only from synchronized fields present at creation. Add
this reusable image input to both the create and update Zod schemas:

```ts
const productImageSchema = z.object({
  url: z.string().url().refine((value) => value.startsWith("https://")),
  alt: z.string().max(300).nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

images: z.array(productImageSchema).max(20).optional()
```

- [ ] **Step 4: Wire PATCH and DELETE**

Use `mutateManagementProduct` inside `prisma.$transaction` for PATCH. For
DELETE, update `isActive: false` through the same helper with
`changedFields: ["active"]`. Keep authorization and audit behavior unchanged.

- [ ] **Step 5: Run route and existing Management tests**

Run:

```powershell
npx vitest run tests/v3-management-product-sync-wiring.test.ts tests/v3-management-sync.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add apps/vase-management/app/api/productos/route.ts apps/vase-management/app/api/productos/[id]/route.ts tests/v3-management-product-sync-wiring.test.ts
git commit -m "feat: publish management product changes automatically"
```

### Task 5: Wire every stock mutation

**Files:**
- Modify: `apps/vase-management/lib/stock.service.ts`
- Modify: `apps/vase-management/app/api/stock/route.ts`
- Modify: `apps/vase-management/app/api/utilidades/cierre/route.ts`
- Modify: `tests/v3-management-product-sync-wiring.test.ts`

- [ ] **Step 1: Add a failing stock-boundary test**

Assert that `applyStockMovement` increments `sourceVersion` and calls
`enqueueManagementProductInTransaction(tx, productId, ["stock"])` after all
stock caches are updated.

Add a source scan that rejects direct `product.update({ data: { stock: ... } })`
outside the approved stock service and migration/reconciliation files.

- [ ] **Step 2: Run the wiring test**

Run:

```powershell
npx vitest run tests/v3-management-product-sync-wiring.test.ts
```

Expected: failure listing current direct writers such as stock and closing
routes.

- [ ] **Step 3: Update the stock service**

Replace the direct product update with:

```ts
const updated = await tx.product.update({
  where: { id: productId },
  data: {
    stock: newStock,
    sourceVersion: { increment: 1 },
  },
});
await enqueueManagementProductInTransaction(tx, updated.id, ["stock"]);
```

Ensure transfer operations that call `applyStockMovement` twice publish the
final product state without an older event winning; version ordering provides
the safety guarantee.

- [ ] **Step 4: Replace direct stock writes**

Route stock adjustments, closing reconstruction, purchases, sales, and returns
through `applyStockMovement`. Where an operation intentionally sets an absolute
stock value, compute the signed `ADJUSTMENT` delta inside the existing
transaction.

- [ ] **Step 5: Run the wiring tests**

Run:

```powershell
npx vitest run tests/v3-management-product-sync-wiring.test.ts tests/v3-management-sync.test.ts
```

Expected: no unapproved direct stock writer remains and all stock sync tests
pass.

- [ ] **Step 6: Commit**

```powershell
git add apps/vase-management/lib/stock.service.ts apps/vase-management/app tests/v3-management-product-sync-wiring.test.ts
git commit -m "feat: sync every management stock change"
```

### Task 6: Make Management outbox delivery autonomous and safe

**Files:**
- Modify: `apps/vase-management/lib/integration/outbox.ts`
- Modify: `apps/vase-management/app/api/internal/sync/process/route.ts`
- Create: `apps/vase-management/app/api/internal/sync/status/route.ts`
- Create: `apps/vase-management/scripts/management-sync-worker.ts`
- Modify: `apps/vase-management/package.json`
- Modify: `apps/vase-management/.env.example`
- Modify: `apps/vase-management/Dockerfile`
- Modify: `tests/v3-management-sync.test.ts`

- [ ] **Step 1: Write failing worker tests**

Prove:

- rows are claimed before delivery;
- a successful `applied`, `duplicate`, or `stale` response completes the row;
- `400`, `403`, and `404` move to `DEAD_LETTER`;
- network and `5xx` failures schedule another attempt;
- attempts at or above `MANAGEMENT_SYNC_MAX_ATTEMPTS` dead-letter the row;
- two worker IDs cannot claim the same row.
- the status handler reports pending count, failed count, oldest pending age,
  and the latest successful delivery without exposing event payloads.

- [ ] **Step 2: Run the focused test**

Run:

```powershell
npx vitest run tests/v3-management-sync.test.ts
```

Expected: worker lifecycle assertions fail.

- [ ] **Step 3: Implement row claiming**

Use a short Prisma `$queryRaw` transaction with PostgreSQL
`FOR UPDATE SKIP LOCKED` to claim eligible rows and set:

```ts
{
  status: "PROCESSING",
  claimedAt: now,
  claimedBy: workerId,
}
```

Release abandoned claims older than five minutes back to `FAILED`.

- [ ] **Step 4: Implement response classification and jitter**

Parse the Business JSON acknowledgement. Complete accepted statuses; dead-letter
permanent HTTP failures; retry transient failures with:

```ts
const jitter = Math.floor(Math.random() * Math.min(5_000, baseDelay / 4));
const nextAttemptAt = new Date(Date.now() + baseDelay + jitter);
```

Never log the service token or full upstream body.

- [ ] **Step 5: Add the worker entrypoint**

Implement signal-aware polling:

```ts
const pollMs = Number(process.env.MANAGEMENT_SYNC_POLL_MS || 5000);
let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

while (!stopping) {
  const result = await processManagementOutbox(25);
  if (result.claimed === 0) await delay(pollMs);
}
await prisma.$disconnect();
```

Add:

```json
"sync:worker": "tsx scripts/management-sync-worker.ts"
```

Document `MANAGEMENT_SYNC_POLL_MS=5000` and
`MANAGEMENT_SYNC_MAX_ATTEMPTS=12`.

- [ ] **Step 6: Implement the internal status route**

Require `SERVICE_TO_SERVICE_TOKEN`, aggregate outbox rows without selecting
payloads, and return:

```ts
{
  pending: number;
  failed: number;
  deadLetter: number;
  oldestPendingAt: string | null;
  lastCompletedAt: string | null;
}
```

- [ ] **Step 7: Run tests and typecheck**

Run:

```powershell
npx vitest run tests/v3-management-sync.test.ts
npx tsc --noEmit -p apps/vase-management/tsconfig.json
```

Expected: tests and Management typecheck pass.

- [ ] **Step 8: Commit**

```powershell
git add apps/vase-management/lib/integration/outbox.ts apps/vase-management/app/api/internal/sync/process/route.ts apps/vase-management/app/api/internal/sync/status/route.ts apps/vase-management/scripts/management-sync-worker.ts apps/vase-management/package.json apps/vase-management/.env.example apps/vase-management/Dockerfile tests/v3-management-sync.test.ts
git commit -m "feat: run management sync outbox automatically"
```

### Task 7: Make the Business receiver tenant-aware and version-safe

**Files:**
- Create: `apps/vase-editor/server/src/services/managementProductEvents.js`
- Modify: `apps/vase-editor/server/src/services/integration.service.js`
- Modify: `apps/vase-editor/server/src/routes/integrations.js`
- Create: `apps/vase-editor/server/sql/management-product-events-migration.sql`
- Create: `tests/v3-business-management-events.test.ts`

- [ ] **Step 1: Write failing receiver tests**

Test:

- global tenant maps through `tenants.external_tenant_id`;
- missing mapping returns `404 unknown_management_tenant`;
- first version returns `applied`;
- repeated event ID returns `duplicate`;
- lower or equal product version returns `stale`;
- a concurrent duplicate cannot apply twice;
- receipt and product update share one transaction;
- Labs enqueue happens only after commit.

- [ ] **Step 2: Run the receiver test**

Run:

```powershell
npx vitest run tests/v3-business-management-events.test.ts
```

Expected: failure because the route currently uses the global ID as the local
Business tenant and does not enforce versions atomically.

- [ ] **Step 3: Add Business event tables**

Create migration SQL:

```sql
CREATE TABLE IF NOT EXISTS management_event_receipts (
  event_id text PRIMARY KEY,
  tenant_id uuid NOT NULL,
  external_id text NOT NULL,
  version bigint NOT NULL,
  sequence bigint NOT NULL,
  status text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS management_product_versions (
  tenant_id uuid NOT NULL,
  external_id text NOT NULL,
  version bigint NOT NULL,
  last_event_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, external_id)
);

CREATE TABLE IF NOT EXISTS management_sync_cursors (
  tenant_id uuid PRIMARY KEY,
  last_sequence bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 4: Allow importer transaction reuse**

Change `syncIntegrationProducts` to accept an optional `client`. When provided,
it must not acquire, begin, commit, roll back, or release a second connection.
Existing public product-sync callers retain current behavior.

- [ ] **Step 5: Implement the receiver service**

Export:

```js
export function createManagementProductEventHandler({
  db = pool,
  expectedServiceToken,
  enqueueLabs = enqueueLabsCatalogSync,
}) { /* Express handler */ }
```

Inside one transaction:

- resolve the local tenant;
- acquire `pg_advisory_xact_lock(hashtext(tenant_id || ':' || external_id))`;
- check the receipt;
- lock/check `management_product_versions`;
- call `syncIntegrationProducts` with the transaction client;
- upsert version and receipt;
- advance the cursor only through the highest contiguous sequence available;
- commit.

After commit, enqueue the existing Business-to-Labs snapshot. Return the typed
acknowledgement.

- [ ] **Step 6: Delegate the route**

Replace the inline `/management/events` implementation with the injected
handler. Keep the URL unchanged.

- [ ] **Step 7: Run Business tests**

Run:

```powershell
npx vitest run tests/v3-business-management-events.test.ts tests/v3-business-product-sync-contract.test.ts tests/v3-business-labs-outbox.test.ts
```

Expected: all receiver and existing integration tests pass.

- [ ] **Step 8: Commit**

```powershell
git add apps/vase-editor/server/src/services/managementProductEvents.js apps/vase-editor/server/src/services/integration.service.js apps/vase-editor/server/src/routes/integrations.js apps/vase-editor/server/sql/management-product-events-migration.sql tests/v3-business-management-events.test.ts
git commit -m "feat: apply management events safely in business"
```

### Task 8: Preserve manual Business images

**Files:**
- Modify: `apps/vase-editor/server/src/services/integration.service.js`
- Modify: `apps/vase-editor/server/src/routes/tenant.js`
- Modify: `tests/v3-business-management-events.test.ts`

- [ ] **Step 1: Write failing image ownership tests**

Prove:

```ts
expect(inheritedProduct.data.images).toEqual(managementImages);
expect(manualProduct.data.images).toEqual(existingBusinessImages);
expect(manualProduct.data.source_images).toEqual(managementImages);
expect(restoredProduct.data.image_mode).toBe("inherited");
```

- [ ] **Step 2: Run the receiver test**

Run:

```powershell
npx vitest run tests/v3-business-management-events.test.ts
```

Expected: failure because Business does not distinguish source images from
storefront overrides.

- [ ] **Step 3: Update import semantics**

When a Management event has images:

```js
next.source_images = item.images || [];
if ((next.image_mode || 'inherited') === 'inherited') {
  next.images = item.images || [];
}
```

This image rule is independent from price/stock updates and preserves existing
`admin_locked` behavior for other editorial fields.

- [ ] **Step 4: Update Business product editing**

When the tenant product route receives an `images` property, persist
`image_mode: "manual"`. When it receives
`restore_management_images: true`, persist:

```js
{
  ...existingData,
  image_mode: "inherited",
  images: Array.isArray(existingData.source_images) ? existingData.source_images : [],
}
```

No frontend redesign is required; the restore flag is an API capability for the
existing editor flow.

- [ ] **Step 5: Run Business tests**

Run:

```powershell
npx vitest run tests/v3-business-management-events.test.ts tests/v3-business-product-sync-contract.test.ts
```

Expected: inherited, manual, and restore cases pass.

- [ ] **Step 6: Commit**

```powershell
git add apps/vase-editor/server/src/services/integration.service.js apps/vase-editor/server/src/routes/tenant.js tests/v3-business-management-events.test.ts
git commit -m "feat: preserve business image overrides"
```

### Task 9: Add sequence reconciliation

**Files:**
- Create: `apps/vase-management/app/api/internal/sync/changes/route.ts`
- Modify: `apps/vase-editor/server/src/services/managementProductEvents.js`
- Modify: `apps/vase-editor/server/src/index.js`
- Modify: `tests/v3-management-sync.test.ts`
- Modify: `tests/v3-business-management-events.test.ts`

- [ ] **Step 1: Write failing reconciliation tests**

Prove the Management endpoint:

- requires the service token;
- validates `globalTenantId`, `after`, and bounded `limit`;
- returns events ordered by `sequence`;
- never returns another tenant.

Prove Business requests from its saved cursor, applies events through the same
receiver core, and advances only after success.

- [ ] **Step 2: Run focused tests**

Run:

```powershell
npx vitest run tests/v3-management-sync.test.ts tests/v3-business-management-events.test.ts
```

Expected: reconciliation tests fail.

- [ ] **Step 3: Implement the Management changes feed**

Read completed and pending Business outbox events by
`globalTenantId` and `sequence > after`, order ascending, limit to at most 250,
and return:

```json
{
  "events": [],
  "nextSequence": 0,
  "hasMore": false
}
```

The endpoint is read-only and protected by `SERVICE_TO_SERVICE_TOKEN`.

- [ ] **Step 4: Implement Business reconciliation**

Add `reconcileManagementEvents({ limit: 100 })`. Resolve connected Management
tenants, load each cursor, request the changes feed using
`MANAGEMENT_INTERNAL_URL`, and pass every event through the same apply core used
by the push endpoint.

Start a non-overlapping timer in `index.js` using
`MANAGEMENT_RECONCILE_INTERVAL_MS`, defaulting to 15 minutes. Call `.unref()` so
it does not block shutdown.

- [ ] **Step 5: Document Business environment**

Add to `apps/vase-editor/server/.env.example`:

```dotenv
MANAGEMENT_INTERNAL_URL=http://vase-management:3006
MANAGEMENT_RECONCILE_INTERVAL_MS=900000
```

- [ ] **Step 6: Run focused tests**

Run:

```powershell
npx vitest run tests/v3-management-sync.test.ts tests/v3-business-management-events.test.ts
```

Expected: changes-feed and gap-repair tests pass.

- [ ] **Step 7: Commit**

```powershell
git add apps/vase-management/app/api/internal/sync/changes/route.ts apps/vase-editor/server/src/services/managementProductEvents.js apps/vase-editor/server/src/index.js apps/vase-editor/server/.env.example tests/v3-management-sync.test.ts tests/v3-business-management-events.test.ts
git commit -m "feat: reconcile management product event gaps"
```

### Task 10: Document deployment and verify the complete path

**Files:**
- Modify: `docs/v3/easypanel.md`

- [ ] **Step 1: Document deployment**

Add exact requirements:

- Management web and worker use the same image and `DATABASE_URL`;
- worker command is `npm run sync:worker`;
- both services share `SERVICE_TO_SERVICE_TOKEN`;
- Management uses `BUSINESS_INTERNAL_URL`;
- Business uses `MANAGEMENT_INTERNAL_URL`;
- deploy Business migration/receiver first;
- deploy Management migration/producer second;
- start worker third;
- invoke one reconciliation after rollout.

- [ ] **Step 2: Run all focused tests**

Run:

```powershell
npx vitest run tests/v3-contracts.test.ts tests/v3-management-sync.test.ts tests/v3-management-product-sync-wiring.test.ts tests/v3-business-management-events.test.ts tests/v3-business-product-sync-contract.test.ts tests/v3-business-labs-outbox.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 3: Run static validation**

Run:

```powershell
npx tsc --noEmit -p apps/vase-management/tsconfig.json
node --check apps/vase-editor/server/src/services/managementProductEvents.js
node --check apps/vase-editor/server/src/services/integration.service.js
node --check apps/vase-editor/server/src/routes/integrations.js
git diff --check
```

Expected: all commands exit with code 0.

- [ ] **Step 4: Build Management**

Run:

```powershell
npm run build --workspace vase-business
```

Expected: production build succeeds.

- [ ] **Step 5: Run a local integration probe**

Start PostgreSQL, Business, Management web, and the Management worker. Create a
Management product, update its price, adjust its stock, and archive it. Query
the Business tenant product API after each operation and verify:

```text
create  -> Business product exists
edit    -> Management-owned price changes; Business web description remains
stock   -> Business stock changes without manual sync
image   -> inherited image changes; manual image remains protected
archive -> Business source state becomes inactive
outbox  -> no pending event remains after acknowledgement
```

If external deployment credentials are unavailable, report this probe as
pending rather than claiming production verification.

- [ ] **Step 6: Commit**

```powershell
git add docs/v3/easypanel.md
git commit -m "docs: deploy automatic management business sync"
```
