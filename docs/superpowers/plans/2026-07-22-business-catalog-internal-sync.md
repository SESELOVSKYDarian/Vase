# Business catalog internal synchronization implementation plan

> Implement the approved internal snapshot and continuous synchronization design without changing the existing Business product ingestion API.

## Task 1: Make Business catalog payloads tenant-aware

**Files:**

- Modify: `apps/vase-editor/server/src/services/labsCatalogOutbox.js`
- Modify: `apps/vase-editor/server/src/routes/integrations.js`
- Test: `tests/v3-business-catalog-snapshot.test.ts`
- Test: `tests/v3-business-labs-outbox.test.ts`

1. Add failing tests proving that a Vase global tenant ID resolves through the Business `tenants.external_source/external_tenant_id` bridge before querying `product_cache`.
2. Add a catalog snapshot builder that keeps both identities: Business UUID for local SQL/outbox ownership and global tenant ID for the Labs payload.
3. Add a service-token-protected, read-only internal Business endpoint returning the snapshot.
4. Change the existing outbox enqueue path to use the same identity resolution. Do not change public ingestion routes, request bodies, or responses.
5. Run the Business snapshot and outbox tests, then commit.

## Task 2: Broker the snapshot through Vase App

**Files:**

- Create: `apps/vase-app/src/app/api/internal/business/catalog-snapshot/route.ts`
- Test: `tests/v3-business-catalog-broker.test.ts`

1. Add failing tests for service authentication, platform-tenant validation, dynamic Business origin resolution, response schema validation, and cross-tenant rejection.
2. Implement an injectable route handler modeled on the existing credential broker.
3. Call the new Business internal endpoint with `SERVICE_TO_SERVICE_TOKEN`, validate with `labsCatalogSyncSchema`, and return only contract fields.
4. Run the broker tests and App typecheck, then commit.

## Task 3: Import the initial snapshot when Labs connects the source

**Files:**

- Create: `apps/vase-labs/app/lib/business-catalog-snapshot.ts`
- Modify: `apps/vase-labs/app/api/labs/knowledge/route.ts`
- Test: `tests/v3-labs-business-catalog-snapshot.test.ts`
- Test: `tests/v3-labs-knowledge-routes.test.ts`

1. Add failing client tests proving Labs calls Vase App through `APP_INTERNAL_URL`, authenticates with the service token, validates the catalog contract, and rejects a mismatched tenant.
2. Implement the internal snapshot client and import through the existing `labsCatalogService.sync` path.
3. Extend the knowledge handler context dependency with `globalTenantId`.
4. For `EXTERNAL_MANAGEMENT` only, complete the import before creating the knowledge item. Accept a valid empty catalog and do not create the source if synchronization fails.
5. Add route tests for ordering, error handling, tenant identity, and non-external knowledge sources.
6. Run Labs catalog/knowledge tests and typecheck, then commit.

## Task 4: Verify the end-to-end change

**Files:**

- Verify all files changed in Tasks 1-3.

1. Run the focused Vitest suites for Business outbox/snapshot, App broker, and Labs catalog/knowledge behavior.
2. Run App and Labs typechecks, Business JavaScript syntax checks, and the Labs production build.
3. Review `git diff` and confirm no existing Business external product API contract changed.
4. Request code review, address actionable findings, rerun affected checks, and commit any corrections.

