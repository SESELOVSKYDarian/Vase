# Dynamic Business Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Vase Business atomically create or reuse one product-sync Consumer Key per tenant when Labs opens the external-management modal.

**Architecture:** Labs continues resolving the tenant from its authenticated session and calls the internal Business endpoint. Business remains the sole source of truth and serializes creation per tenant with a PostgreSQL transaction-level advisory lock, preventing concurrent modal requests from creating duplicate keys.

**Tech Stack:** Next.js 16 Route Handlers, Express, PostgreSQL (`pg`), Vitest.

---

### Task 1: Idempotent Business credential creation

**Files:**
- Modify: `apps/vase-editor/server/src/services/productSyncCredentials.js`
- Test: `tests/v3-business-product-sync-credentials.test.ts`

- [x] Write a failing test with a mocked PostgreSQL pool asserting that `ensureProductSyncToken` acquires a tenant-scoped transaction lock, returns an existing token without inserting, creates one when absent, commits, releases the client, and rolls back on failure.
- [x] Run `npx vitest run tests/v3-business-product-sync-credentials.test.ts` and observe failure because the current implementation queries the pool without a transaction or lock.
- [x] Change `ensureProductSyncToken` to use `db.connect()`, `BEGIN`, `select pg_advisory_xact_lock(hashtext($1))`, lookup, conditional insert, `COMMIT`, and `client.release()`; roll back before rethrowing failures.
- [x] Run the focused test and confirm all cases pass.

### Task 2: End-to-end contract verification

**Files:**
- Verify: `apps/vase-labs/app/api/labs/external-management-credentials/route.ts`
- Verify: `apps/vase-editor/server/src/routes/integrations.js`
- Verify: `tests/v3-labs-knowledge-routes.test.ts`

- [x] Run the Labs credential-route tests to confirm tenant isolation, automatic Business lookup, response allowlisting, and safe error handling.
- [x] Run Labs typecheck and production build.
- [x] Run `git diff --check` and review the final diff for secret leakage or tenant-controlled scoping.
