# Tenant-aware Business Credentials Broker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Labs reuse an authenticated tenant's existing Business product-sync credential through Vase App, while reporting an absent connection without creating a credential.

**Architecture:** Business exposes a read-only, service-authenticated lookup by tenant. Vase App validates the platform tenant and brokers the Business request using its existing Business service configuration. Labs derives the tenant from its session and calls only Vase App through `APP_INTERNAL_URL`.

**Tech Stack:** Next.js 16 Route Handlers, Express, PostgreSQL, Prisma, TypeScript, Vitest.

---

### Task 1: Make the Business credential endpoint read-only

**Files:**
- Modify: `apps/vase-editor/server/src/services/productSyncCredentials.js`
- Modify: `tests/v3-labs-knowledge-routes.test.ts`
- Test: `tests/v3-business-product-sync-credentials.test.ts`

- [ ] **Step 1: Write failing endpoint tests**

Replace endpoint test dependencies named `ensureToken` with `findToken` and assert both outcomes:

```ts
it("returns an existing credential without creating one", async () => {
  const findToken = vi.fn(async () => ({ token_hash: "consumer-key" }));
  const handler = createProductSyncCredentialsHandler({
    db: {}, expectedServiceToken: "service-token", findToken,
  });
  // invoke the Express handler with tenant_123 and exact service auth
  expect(findToken).toHaveBeenCalledWith({}, "tenant_123");
  expect(response.body).toEqual({
    domain: "business.vase.ar", tenantUuid: "tenant_123", consumerKey: "consumer-key",
  });
});

it("reports a tenant without an existing external connection", async () => {
  const handler = createProductSyncCredentialsHandler({
    db: {}, expectedServiceToken: "service-token", findToken: vi.fn(async () => null),
  });
  expect(response).toEqual({
    statusCode: 404,
    body: { error: "EXTERNAL_MANAGEMENT_NOT_CONNECTED" },
  });
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npx vitest run tests/v3-labs-knowledge-routes.test.ts tests/v3-business-product-sync-credentials.test.ts`

Expected: FAIL because the handler still calls `ensureProductSyncToken` and creates a token when absent.

- [ ] **Step 3: Export the lookup and inject it into the endpoint**

Change the service to export its existing query helper and make only the internal handler read-only:

```js
export async function findLatestProductSyncToken(db, tenantId) {
  const result = await db.query(/* existing tenant-scoped SELECT */, [tenantId]);
  return result.rows[0] || null;
}

export function createProductSyncCredentialsHandler({
  db,
  expectedServiceToken,
  findToken = findLatestProductSyncToken,
}) {
  return async function productSyncCredentialsHandler(req, res, next) {
    // keep exact service auth and tenant validation
    try {
      const tokenRecord = await findToken(db, tenantId);
      if (!tokenRecord) {
        return res.status(404).json({ error: "EXTERNAL_MANAGEMENT_NOT_CONNECTED" });
      }
      return res.json({
        domain: "business.vase.ar",
        tenantUuid: tenantId,
        consumerKey: tokenRecord.token_hash,
      });
    } catch (error) {
      return next(error);
    }
  };
}
```

Keep `ensureProductSyncToken` unchanged for the Business administration flow.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npx vitest run tests/v3-labs-knowledge-routes.test.ts tests/v3-business-product-sync-credentials.test.ts`

Expected: PASS.

### Task 2: Add the tenant-validating Vase App broker

**Files:**
- Create: `apps/vase-app/src/app/api/internal/business/external-management-credentials/route.ts`
- Create: `tests/v3-business-credential-broker.test.ts`

- [ ] **Step 1: Write failing broker contract tests**

Test an exported handler factory with injected tenant lookup, fetch, service URL, and token. Assert:

```ts
expect(fetchUpstream).toHaveBeenCalledWith(
  "http://vase-business:3000/api/v1/integrations/internal/tenant/tenant_123/product-sync-credentials",
  { headers: { authorization: "Bearer service-token" }, signal: expect.any(AbortSignal) },
);
expect(await response.json()).toEqual({
  domain: "business.vase.ar", tenantUuid: "tenant_123", consumerKey: "consumer-key",
});
```

Add separate tests for invalid service auth, missing/unknown tenant, upstream `404
EXTERNAL_MANAGEMENT_NOT_CONNECTED`, mismatched tenant responses, and upstream
authorization/unavailability. The caller-provided tenant must be checked with
`prisma.tenant.findUnique({ where: { id: globalTenantId }, select: { id: true } })`.

- [ ] **Step 2: Run the broker test and verify RED**

Run: `npx vitest run tests/v3-business-credential-broker.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the broker Route Handler**

Create a `GET` route with an exported factory. Use `assertServiceToken`, require
`globalTenantId`, verify it exists, derive the Business origin from
`BUSINESS_EDITOR_URL`, and call the Business endpoint with a five-second abort
timeout. Return only the approved success fields. Preserve the typed `404`; map
Business `401/403` and other errors to sanitized `502` reasons.

The runtime binding must be:

```ts
export const GET = createBusinessExternalManagementCredentialsHandler({
  authorize: (header) => assertServiceToken(header, process.env.SERVICE_TO_SERVICE_TOKEN),
  findTenant: (id) => prisma.tenant.findUnique({ where: { id }, select: { id: true } }),
  fetchUpstream: fetch,
  businessEditorUrl: process.env.BUSINESS_EDITOR_URL,
  serviceToken: process.env.SERVICE_TO_SERVICE_TOKEN,
});
```

- [ ] **Step 4: Run the broker test and verify GREEN**

Run: `npx vitest run tests/v3-business-credential-broker.test.ts`

Expected: PASS.

### Task 3: Route Labs through Vase App and expose the normal absence state

**Files:**
- Modify: `apps/vase-labs/app/api/labs/external-management-credentials/route.ts`
- Modify: `apps/vase-labs/app/app/owner/labs/chatbots/knowledge-add-modal.tsx`
- Modify: `tests/v3-labs-knowledge-routes.test.ts`
- Modify: `tests/v3-labs-knowledge-add-modal-interaction.test.ts`

- [ ] **Step 1: Write failing Labs and modal tests**

Change the Labs factory dependency from `teflonApiUrl` to `appInternalUrl` and
expect the request URL to be:

```ts
"https://app.internal/api/internal/business/external-management-credentials?globalTenantId=tenant%2Fresolved"
```

Add a test that an upstream `404` body
`{ error: "EXTERNAL_MANAGEMENT_NOT_CONNECTED" }` produces the same typed `404`
from Labs. Add this modal assertion:

```ts
expect(externalCredentialsErrorMessage("EXTERNAL_MANAGEMENT_NOT_CONNECTED"))
  .toBe("No hay un sistema externo conectado en Vase Business.");
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npx vitest run tests/v3-labs-knowledge-routes.test.ts tests/v3-labs-knowledge-add-modal-interaction.test.ts`

Expected: FAIL because Labs still uses `TEFLON_API_URL` and the modal has no not-connected mapping.

- [ ] **Step 3: Implement the Labs proxy and message**

Build the broker URL from `APP_INTERNAL_URL`, put the resolved tenant in its
query string, preserve the abort timeout and allowlist validation, and use the
existing service token. Map the broker's typed `404` before generic upstream
failure handling.

In the modal, map `EXTERNAL_MANAGEMENT_NOT_CONNECTED` to the approved message
and pass `payload.error ?? payload.reason` to the mapping function. Keep the
submit button disabled when credentials are absent.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npx vitest run tests/v3-labs-knowledge-routes.test.ts tests/v3-labs-knowledge-add-modal-interaction.test.ts tests/v3-business-credential-broker.test.ts`

Expected: PASS.

### Task 4: Deployment contract and verification

**Files:**
- Modify: `apps/vase-editor/.env.example`
- Modify: `docs/v3/easypanel.md`

- [ ] **Step 1: Document the shared service token and broker ownership**

Add `SERVICE_TO_SERVICE_TOKEN` to the current Business environment example and
Business EasyPanel block. Clarify that Labs calls Vase App via
`APP_INTERNAL_URL`, Vase App derives the Business origin from
`BUSINESS_EDITOR_URL`, and Business requires the same service token. Do not add
`TEFLON_API_URL` to Labs.

- [ ] **Step 2: Run all relevant tests**

Run: `npx vitest run tests/v3-business-product-sync-credentials.test.ts tests/v3-business-credential-broker.test.ts tests/v3-labs-knowledge-routes.test.ts tests/v3-labs-knowledge-add-modal-interaction.test.ts`

Expected: PASS.

- [ ] **Step 3: Run typechecks and production build**

Run: `npm run typecheck --workspace @vase/app`

Run: `npm run typecheck --workspace @vase/labs`

Run: `npm run build --workspace @vase/labs`

Expected: all commands exit `0`.

- [ ] **Step 4: Inspect the final change**

Run: `git diff --check`

Run: `git status --short`

Expected: no whitespace errors and only the planned implementation, tests, and documentation are modified.
