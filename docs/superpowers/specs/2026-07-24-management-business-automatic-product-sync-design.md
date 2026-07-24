# Automatic Management to Business product synchronization

## Goal

Keep the Vase Business catalog synchronized automatically whenever Vase
Management creates, edits, archives, or changes the stock of a product. Users
must not need to repeatedly trigger a manual catalog update from Management.

This change improves the existing Management to Business product path. It does
not redesign unrelated Business APIs or add bidirectional product editing.

## Field ownership

Vase Management remains the source of truth for:

- external product ID and SKU;
- retail and wholesale prices;
- stock;
- active or archived state;
- source product images.

Vase Business remains the source of truth for:

- commercial web name;
- web description;
- commercial categories;
- SEO and storefront visibility;
- manually selected storefront images.

Business product images have two modes:

- `inherited`: Management image changes update the storefront images;
- `manual`: Management images are retained as source metadata but do not
  replace the images selected in Business.

The editor can explicitly restore inherited images. Existing Business products
without an image-mode value are treated as inherited unless they already have a
manual image lock.

## Current problem

The repository already contains most of an event-driven synchronization path:

- Management can create product events in `management_sync_outbox`;
- the outbox supports retries;
- Business accepts `POST /api/v1/integrations/management/events`;
- Business deduplicates received event IDs;
- the existing product importer understands common image aliases.

The path is incomplete:

- not every product edit, archive, or stock mutation enqueues an event;
- product source versions are not consistently incremented;
- outbox processing depends on calling an internal endpoint;
- Business does not reject stale per-product versions;
- event creation is not consistently atomic with the source mutation;
- Management and Business can both replicate catalog changes to Labs.

Consequently, an available endpoint does not guarantee continuous
synchronization.

## Architecture

The approved flow is:

```text
Vase Management -> transactional outbox -> Vase Business -> Labs
```

Management writes the product mutation, increments its source version, and
creates the Business event in one database transaction. A background processor
delivers pending events automatically. Business validates and applies the event,
records its event ID and product version, and then uses its existing Labs outbox
to replicate the consolidated Business catalog.

Management will stop publishing product events directly to Labs. Business is
the catalog consolidation boundary because it owns web descriptions,
categories, visibility, SEO, and image overrides.

## Management mutation boundary

All changes that affect synchronized product fields must pass through one
service boundary. This includes:

- product creation and editing;
- product archive or reactivation;
- direct stock adjustments;
- sales and returns;
- purchases;
- warehouse movements;
- closing or stock reconstruction processes.

Within the same Prisma transaction, that boundary:

1. applies the product change;
2. increments `sourceVersion`;
3. builds the normalized product event;
4. inserts one Business outbox row.

If any step fails, the source mutation and event insertion both roll back.
Audit logging can remain outside this contract when it does not affect catalog
consistency.

## Event contract

Management sends one normalized product event:

```json
{
  "eventId": "uuid",
  "globalTenantId": "tenant-id",
  "sequence": 18432,
  "entity": "PRODUCT",
  "action": "UPSERT",
  "externalId": "management-product-id",
  "version": 7,
  "occurredAt": "2026-07-24T15:40:00.000Z",
  "changedFields": ["price", "stock", "images"],
  "payload": {
    "sku": "GRIF-001",
    "price": 12500,
    "stock": 8,
    "active": true,
    "images": [
      {
        "url": "https://uploads.example/product.jpg",
        "alt": "Griferia",
        "position": 0
      }
    ]
  }
}
```

`eventId` provides delivery idempotency. `version` is monotonic per product and
prevents an older retry from overwriting newer state. `sequence` is monotonic
for the tenant feed and supports incremental reconciliation.

Images are HTTPS URLs, not binary or Base64 event data. Management may use the
shared uploads service before publishing an image URL.

Business returns one of:

- `applied`: the event changed the Business product;
- `duplicate`: the event ID was already processed;
- `stale`: the event version is not newer than the stored source version;
- `rejected`: the event is invalid or belongs to an unknown tenant.

Duplicate and stale deliveries are successful acknowledgements and must not be
retried.

## Business ingestion

The Management event route will continue requiring the exact shared
service-to-service token. Before changing catalog data it will:

1. validate the shared event schema;
2. resolve the global tenant to the Business-local tenant UUID;
3. acquire a per-product transaction lock;
4. check the event receipt and latest source version;
5. apply only fields owned by Management;
6. update inherited source images without overwriting manual images;
7. save the receipt and version in the same transaction.

After the Business transaction commits, the existing Labs catalog outbox is
enqueued. A Labs outage must not roll back or fail an already accepted
Management event.

## Delivery and retry behavior

The Management outbox processor will run automatically in deployment, either as
a dedicated worker process or a platform cron invoking the protected processing
route. A dedicated worker is preferred where EasyPanel supports a separate
process because it provides low-latency delivery without coupling work to web
requests.

Processing rules:

- claim rows with database locking so concurrent workers cannot double-send;
- deliver in small batches;
- apply exponential retry delay with jitter;
- retain the last sanitized error and attempt count;
- mark acknowledged `applied`, `duplicate`, and `stale` events complete;
- move permanently invalid events to a dead-letter state after a bounded number
  of attempts;
- expose pending, failed, oldest-pending, and last-success health data.

No user action is required to process pending events.

## Reconciliation

Fast event delivery is complemented by incremental reconciliation. Management
exposes a service-authenticated changes feed ordered by tenant `sequence`.
Business stores the latest fully acknowledged sequence for each Management
tenant and periodically requests later events.

This job repairs gaps caused by deployment mistakes, expired configuration, or
an outbox worker being unavailable. It is not the normal synchronization path.
The existing manual synchronization action becomes a support-only
“Reconcile now” operation using the same cursor logic.

## Error handling and security

- Browser input never selects `globalTenantId`.
- Management and Business require `SERVICE_TO_SERVICE_TOKEN`.
- Tenant mapping is resolved server-side at both boundaries.
- Event payloads are validated through `@vase/contracts`.
- Errors never expose tokens, database details, or upstream response bodies.
- Unknown tenants and malformed events are permanent failures.
- Network errors and `5xx` responses remain retryable.
- Image URLs must use approved HTTPS/upload origins.

## Observability

Management will expose synchronization status per company:

- last successful Business delivery;
- number of pending and failed events;
- age of the oldest pending event;
- last sanitized error;
- last reconciled sequence.

Business will record the latest Management event time and source version per
product. These values support diagnostics but do not need to clutter the normal
product editor.

## Testing

Tests will prove that:

- create, edit, archive, reactivation, and every stock path create events;
- product mutation and event insertion are atomic;
- each relevant change increments the product version;
- the worker retries transient failures and does not retry permanent failures;
- concurrent workers do not process the same outbox row;
- Business accepts a new event and records its receipt atomically;
- duplicate and stale events do not overwrite catalog state;
- Management-owned fields update while Business-owned fields remain unchanged;
- inherited images update and manual Business images remain protected;
- Business enqueues Labs only after a successful local commit;
- Management no longer sends product catalog events directly to Labs;
- incremental reconciliation fills a missing event sequence;
- tenant and service-token boundaries reject unauthorized requests.

Focused unit and integration tests, affected typechecks, syntax checks, and
production builds will run before completion.

## Deployment

The database migrations and receiver compatibility deploy before automatic
producers:

1. deploy Business receipt/version/image-mode support;
2. deploy Management schema and mutation-boundary support;
3. enable the outbox worker;
4. run an initial tenant reconciliation;
5. verify pending-event age and delivery counters;
6. remove the direct Management-to-Labs product destination.

The current manual product-sync API remains available during rollout and as a
support fallback.
