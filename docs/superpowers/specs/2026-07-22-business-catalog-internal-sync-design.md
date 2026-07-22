# Business catalog internal synchronization

## Goal

Populate the Vase Labs catalog from the products already stored by Vase
Business, without changing the existing external product API contract. Keep
Labs synchronized when the external system sends later product updates.

## Current problem

The external Business API correctly writes products into Business
`product_cache`. Labs does not read that API directly; it receives background
outbox events. Those events currently put the Business-local tenant UUID in the
`globalTenantId` field, while Labs reads its catalog using the Vase App global
tenant ID. Products are therefore stored under the wrong tenant key. Products
uploaded before a valid outbox event also have no initial snapshot in Labs.

## Architecture

The existing public/external Business API remains unchanged. A new internal,
service-token-protected read boundary will expose a tenant catalog snapshot:

1. The caller provides the Vase App global tenant ID.
2. Business resolves it through `tenants.external_source = 'vase'` and
   `tenants.external_tenant_id`.
3. Business uses its local tenant UUID to read active `product_cache` rows.
4. Business returns a `labsCatalogSyncSchema` payload whose `globalTenantId`
   remains the Vase App global tenant ID.
5. Vase App validates the platform tenant and brokers the snapshot so Labs does
   not know a Business URL.
6. When Labs creates an `EXTERNAL_MANAGEMENT` knowledge source, it fetches and
   imports the snapshot before reporting success.

For later updates, the existing Business outbox continues to run after the
external API writes products. Its payload builder will resolve the same tenant
bridge and send the global ID while retaining the Business UUID for local SQL.

## Components

### Business snapshot

Add a read-only internal endpoint alongside the current internal integration
routes. It requires the exact `SERVICE_TO_SERVICE_TOKEN`, resolves the external
tenant mapping, reads the full active product cache, applies the existing
`mapBusinessProductForLabs` mapper, and returns a schema-valid snapshot.

The existing product ingestion endpoints, request formats, credentials, and
responses are not changed.

### Vase App broker

Add a service-authenticated internal catalog endpoint. It validates that the
global tenant exists in Vase App, derives Business from `BUSINESS_EDITOR_URL`,
calls the Business snapshot endpoint, validates tenant identity, and forwards
only the catalog synchronization contract.

### Labs initial import

The knowledge creation handler receives `globalTenantId` from the authenticated
request context. For `EXTERNAL_MANAGEMENT`, it obtains the snapshot through
`APP_INTERNAL_URL`, validates it with `labsCatalogSyncSchema`, and writes it
through `labsCatalogService.sync`. The knowledge item is created only after the
initial import succeeds, so the UI does not claim a connected source with a
failed initial catalog.

An empty but valid Business catalog is accepted and creates an empty synchronized
source. A missing Business tenant or credential returns the existing
not-connected outcome.

### Continuous synchronization

`enqueueLabsCatalogSync` resolves both identities:

- Business local UUID: used for `product_cache` and outbox ownership.
- Vase App global tenant ID: used in the payload sent to Labs.

Retries, service authentication, and idempotent event handling remain unchanged.

## Error handling and security

- Browser input never selects a tenant.
- Business and Vase App internal routes require `SERVICE_TO_SERVICE_TOKEN`.
- Every successful response must match the requested global tenant.
- Missing tenant mappings return a typed not-connected response.
- Invalid snapshots, upstream authorization failures, and unavailable services
  are sanitized.
- No consumer secret, service token, raw integration credential, or unrelated
  tenant product is returned.

## Testing

Tests will prove that:

- Business resolves the global tenant to its local UUID before reading products.
- The snapshot uses the global ID and the existing product mapper.
- Existing external API controller contracts remain unchanged.
- The outbox uses the local UUID for Business SQL and the global ID for Labs.
- Vase App validates the tenant and allowlists the snapshot.
- Labs imports the snapshot before creating an external-management knowledge
  item.
- Empty catalogs, missing connections, invalid cross-tenant payloads, retries,
  and service authentication behave as specified.

Focused tests, App and Labs typechecks, the Labs production build, syntax checks,
and diff checks will run before completion.
