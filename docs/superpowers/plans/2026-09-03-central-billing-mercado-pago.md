# Central Billing with Mercado Pago Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let customers pay every Vase product online in ARS through Mercado Pago, while App Admin controls the commercial catalog and sees the full, webhook-confirmed payment lifecycle.

**Architecture:** `@vase/app` owns the commercial catalog, orders, payments, Mercado Pago credentials and webhooks. `@vase/portal` is a public BFF: it asks App for a checkout preference and redirects the browser; it never receives provider secrets or decides whether a payment succeeded. A single price item can be one-time or monthly and is assigned to Labs, Business, Management or Rest; invoices and entitlements reference the immutable price snapshot used at checkout.

**Tech Stack:** Next.js 16 App Router route handlers, React 19, Prisma/MySQL, Zod, existing `@vase/internal-api` service-token boundary, Mercado Pago Checkout Pro API/SDK.

---

## Product decisions locked by this plan

1. Currency is ARS and payment processor is Mercado Pago.
2. Catalog is editable only by users with `adminPermissions.BILLING`; Portal displays it read-only.
3. Sale types are `ONE_TIME` and `MONTHLY`. The first release creates a new Mercado Pago checkout for each monthly renewal; it does **not** silently charge stored cards. Automatic recurring preapproval can be a later, separately approved phase.
4. The canonical provider webhook decides payment status. `success`/`failure`/`pending` return URLs only display the status and redirect the customer to App.
5. A paid invoice grants/renews one explicit entitlement operation. Webhooks are deduplicated before the operation runs.

## File structure

| File | Responsibility |
| --- | --- |
| `apps/vase-app/prisma/schema.prisma` | Catalog, invoice, payment-attempt and webhook-event persistence. |
| `apps/vase-app/prisma/migrations/20260903100000_central_billing/migration.sql` | MySQL migration for the billing tables and indexes. |
| `apps/vase-app/src/server/services/billing/*` | Small domain services: catalog, invoice, Mercado Pago adapter, webhook processor and entitlement applicator. |
| `apps/vase-app/src/app/api/internal/portal/billing/*/route.ts` | Authenticated Portal-to-App catalog and checkout endpoints. |
| `apps/vase-app/src/app/api/webhooks/mercado-pago/route.ts` | Public raw webhook endpoint; signature verification and idempotent processing. |
| `apps/vase-app/src/app/(platform)/app/admin/billing/page.tsx` | Admin catalog, invoice and payment reporting screen. |
| `apps/vase-portal/src/lib/app-client.ts` | Typed calls from Portal to the internal App billing endpoints. |
| `apps/vase-portal/src/app/(marketing)/checkout/[priceCode]/page.tsx` | Public checkout handoff and result page. |
| `apps/vase-portal/src/app/(marketing)/precios/page.tsx` | Replaces hard-coded payment CTAs with catalog-driven checkout links. |

### Task 1: Add the billing data model

**Files:**
- Modify: `apps/vase-app/prisma/schema.prisma`
- Create: `apps/vase-app/prisma/migrations/20260903100000_central_billing/migration.sql`
- Test: `apps/vase-app/src/tests/billing-schema.test.ts`

- [ ] **Step 1: Write schema-contract tests first.**

```ts
it("keeps a price snapshot and provider payment id per invoice", () => {
  expect(schema).toMatch(/model BillingPrice[\s\S]*code\s+String\s+@unique/);
  expect(schema).toMatch(/model BillingInvoice[\s\S]*priceSnapshot\s+Json/);
  expect(schema).toMatch(/model BillingPayment[\s\S]*providerPaymentId\s+String\?\s+@unique/);
  expect(schema).toMatch(/model BillingWebhookEvent[\s\S]*@@unique\(\[provider, providerEventId\]\)/);
});
```

- [ ] **Step 2: Run the test and confirm it fails.**

Run: `npm run test --workspace @vase/app -- billing-schema.test.ts`

Expected: FAIL because the billing models do not exist.

- [ ] **Step 3: Add the models and migration.** Use the following minimum fields and constraints:

```prisma
enum BillingProduct { LABS BUSINESS MANAGEMENT REST }
enum BillingInterval { ONE_TIME MONTHLY }
enum BillingInvoiceStatus { DRAFT PENDING PAID FAILED EXPIRED CANCELED REFUNDED }
enum BillingPaymentStatus { PENDING APPROVED REJECTED IN_PROCESS REFUNDED CHARGED_BACK }

model BillingPrice {
  id String @id @default(cuid())
  code String @unique
  product BillingProduct
  label String
  interval BillingInterval
  amount Decimal @db.Decimal(14, 2)
  currency String @default("ARS")
  active Boolean @default(true)
  entitlement Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  invoices BillingInvoice[]
}

model BillingInvoice {
  id String @id @default(cuid())
  tenantId String?
  customerEmail String
  priceId String
  status BillingInvoiceStatus @default(PENDING)
  priceSnapshot Json
  dueAt DateTime?
  paidAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  price BillingPrice @relation(fields: [priceId], references: [id])
  payments BillingPayment[]
  @@index([tenantId, status, dueAt])
}
```

Add `BillingPayment` with a unique Mercado Pago payment id, `BillingWebhookEvent` with a unique `(provider, providerEventId)`, and relations from `Tenant` to invoices. Generate Prisma client after migration creation.

- [ ] **Step 4: Run schema validation and the focused test.**

Run: `npm run prisma:generate --workspace @vase/app; npm run test --workspace @vase/app -- billing-schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/vase-app/prisma apps/vase-app/src/tests/billing-schema.test.ts
git commit -m "feat: add central billing persistence"
```

### Task 2: Implement catalog administration and immutable invoice creation

**Files:**
- Create: `apps/vase-app/src/server/services/billing/catalog.ts`
- Create: `apps/vase-app/src/server/services/billing/invoices.ts`
- Create: `apps/vase-app/src/app/api/admin/billing/prices/route.ts`
- Create: `apps/vase-app/src/app/api/admin/billing/prices/[id]/route.ts`
- Test: `apps/vase-app/src/tests/billing-catalog.test.ts`
- Test: `apps/vase-app/src/tests/billing-invoices.test.ts`

- [ ] **Step 1: Write failing service tests.** Cover an admin update, inactive prices being unavailable to Portal, and the snapshot invariant.

```ts
expect(await catalog.listPublic()).toEqual([expect.objectContaining({ code: "LABS_STARTER_MONTHLY" })]);
expect(await catalog.listPublic()).not.toContainEqual(expect.objectContaining({ code: "RETIRED_PRICE" }));
expect(invoice.priceSnapshot).toEqual({ code: price.code, amount: "108000.00", interval: "MONTHLY", currency: "ARS" });
```

- [ ] **Step 2: Run focused tests.**

Run: `npm run test --workspace @vase/app -- billing-catalog.test.ts billing-invoices.test.ts`

Expected: FAIL because the services are absent.

- [ ] **Step 3: Implement explicit Zod contracts.** `createPriceSchema` and `updatePriceSchema` must accept `code`, `product`, `label`, `interval`, `amount`, `currency`, `active`, and `entitlement`. `amount` must be positive, currency must be `ARS`, and changing a price must never mutate existing `BillingInvoice.priceSnapshot` JSON.

- [ ] **Step 4: Expose admin handlers.** Follow the existing `adminPermissions.BILLING` authorization pattern. Return 400 for invalid Zod input, 403 for unauthorized users, 404 for a missing price, and never expose Mercado Pago settings through these routes.

- [ ] **Step 5: Run focused tests and typecheck.**

Run: `npm run test --workspace @vase/app -- billing-catalog.test.ts billing-invoices.test.ts; npm run typecheck --workspace @vase/app`

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add apps/vase-app/src/server/services/billing apps/vase-app/src/app/api/admin/billing apps/vase-app/src/tests/billing-*.test.ts
git commit -m "feat: add editable billing catalog and invoices"
```

### Task 3: Add the Mercado Pago checkout boundary

**Files:**
- Modify: `apps/vase-app/package.json`
- Create: `apps/vase-app/src/server/services/billing/mercado-pago.ts`
- Create: `apps/vase-app/src/app/api/internal/portal/billing/prices/route.ts`
- Create: `apps/vase-app/src/app/api/internal/portal/billing/checkout/route.ts`
- Test: `apps/vase-app/src/tests/portal-billing-api.test.ts`
- Modify: `apps/vase-app/.env.example`

- [ ] **Step 1: Write tests around a fake Mercado Pago client.**

```ts
expect(preference.externalReference).toBe(invoice.id);
expect(preference.items[0]).toMatchObject({ title: "Vase Labs", quantity: 1, unit_price: 108000, currency_id: "ARS" });
expect(result.checkoutUrl).toMatch(/^https:\/\//);
expect(result.invoiceId).toBe(invoice.id);
```

- [ ] **Step 2: Run the test.**

Run: `npm run test --workspace @vase/app -- portal-billing-api.test.ts`

Expected: FAIL because the internal routes do not exist.

- [ ] **Step 3: Install the official Mercado Pago server dependency and implement the adapter.** Store `MP_ACCESS_TOKEN` and `MP_WEBHOOK_SECRET` only in App. The adapter must create one preference from a newly-created invoice, set `external_reference` to the invoice id, set notification URL to App's webhook endpoint, and set success/pending/failure URLs to Portal. The amount comes from the database snapshot, never from the browser.

- [ ] **Step 4: Implement the service-token routes.** Reuse `assertServiceToken`. `GET /api/internal/portal/billing/prices` returns only active public fields. `POST /api/internal/portal/billing/checkout` accepts `{ priceCode, customerEmail, tenantId? }`, creates the invoice and returns only `{ invoiceId, checkoutUrl }`.

- [ ] **Step 5: Add only variable names to `.env.example`.**

```dotenv
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
VASE_PORTAL_PUBLIC_URL=http://localhost:3000
```

- [ ] **Step 6: Run tests and typecheck.**

Run: `npm run test --workspace @vase/app -- portal-billing-api.test.ts; npm run typecheck --workspace @vase/app`

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add apps/vase-app/package.json package-lock.json apps/vase-app/src/server/services/billing apps/vase-app/src/app/api/internal/portal/billing apps/vase-app/.env.example apps/vase-app/src/tests/portal-billing-api.test.ts
git commit -m "feat: create Mercado Pago checkouts from portal"
```

### Task 4: Process Mercado Pago webhooks safely and grant entitlements

**Files:**
- Create: `apps/vase-app/src/server/services/billing/webhooks.ts`
- Create: `apps/vase-app/src/server/services/billing/entitlements.ts`
- Create: `apps/vase-app/src/app/api/webhooks/mercado-pago/route.ts`
- Test: `apps/vase-app/src/tests/mercado-pago-webhook.test.ts`

- [ ] **Step 1: Write failing webhook tests.** Include valid approval, invalid signature, replayed event, a payment that belongs to another invoice, and a rejected payment.

```ts
await expect(handler(validNotification)).resolves.toMatchObject({ status: "APPROVED" });
await expect(handler({ ...validNotification, signature: "forged" })).rejects.toThrow("MP_SIGNATURE_INVALID");
expect(reconcilePayment).toHaveBeenCalledTimes(1); // after two deliveries of one event
expect(grantEntitlement).toHaveBeenCalledWith(expect.objectContaining({ tenantId, product: "LABS" }));
```

- [ ] **Step 2: Run the test.**

Run: `npm run test --workspace @vase/app -- mercado-pago-webhook.test.ts`

Expected: FAIL because the webhook processor is absent.

- [ ] **Step 3: Implement the processor.** Read the raw request body before any JSON parsing if the Mercado Pago verification contract for the installed SDK requires it. Verify the provider signature with the webhook secret, use the provider payment id/event id as the dedupe key, re-fetch payment state from Mercado Pago, and match `external_reference` to the invoice. Do not grant access from browser redirects or webhook payload amounts.

- [ ] **Step 4: Apply entitlement operations inside the payment transaction.**

```ts
const expiresAt = addMonths(new Date(), 1);
await prisma.tenantSubscription.update({ where: { tenantId }, data: { billingStatus: "ACTIVE", paidAt: now, currentPeriodEndsAt: expiresAt, nextBillingAt: expiresAt } });
```

Map `BUSINESS` maintenance to `maintenanceEndsAt`, `MANAGEMENT` and `REST` to their corresponding existing contract/workspace records, and `LABS` to the selected `TenantAiWorkspace.entitlementPlan`. The implementation must reject an entitlement JSON payload for an unsupported product rather than guessing.

- [ ] **Step 5: Run tests, typecheck, and the PagoKit webhook checks.**

Run: `npm run test --workspace @vase/app -- mercado-pago-webhook.test.ts; npm run typecheck --workspace @vase/app; node C:/Users/Usuario/agente-pagokit/hooks/checks/__tests__/run-tests.js`

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add apps/vase-app/src/server/services/billing apps/vase-app/src/app/api/webhooks/mercado-pago apps/vase-app/src/tests/mercado-pago-webhook.test.ts
git commit -m "feat: reconcile Mercado Pago payments securely"
```

### Task 5: Add Portal checkout UI without duplicating commercial rules

**Files:**
- Modify: `apps/vase-portal/src/lib/app-client.ts`
- Create: `apps/vase-portal/src/app/(marketing)/checkout/[priceCode]/page.tsx`
- Create: `apps/vase-portal/src/app/(marketing)/checkout/[priceCode]/checkout-form.tsx`
- Modify: `apps/vase-portal/src/app/(marketing)/precios/page.tsx`
- Test: `apps/vase-portal/src/tests/billing-checkout-page.test.tsx`
- Test: `apps/vase-portal/src/tests/app-client.test.ts`

- [ ] **Step 1: Write failing Portal tests.**

```tsx
render(<CheckoutForm price={{ code: "LABS_STARTER_MONTHLY", label: "Vase Labs", amount: "108000.00", interval: "MONTHLY", currency: "ARS" }} />);
expect(screen.getByRole("button", { name: "Continuar a Mercado Pago" })).toBeVisible();
expect(screen.getByText("ARS 108.000 por mes")).toBeVisible();
```

- [ ] **Step 2: Run focused tests.**

Run: `npm run test --workspace @vase/portal -- billing-checkout-page.test.tsx app-client.test.ts`

Expected: FAIL because the client and page do not exist.

- [ ] **Step 3: Add typed client methods.** Add `listBillingPrices()` and `createBillingCheckout(input)` to `createPortalAppClient`; both call only App internal endpoints with the existing service token.

- [ ] **Step 4: Build the checkout page.** The page obtains the price by code from App, requests the purchaser email, submits only `{ priceCode, customerEmail }`, and uses `window.location.assign(checkoutUrl)`. It must show one-time versus monthly wording, a pending-payment explanation, and no provider credentials.

- [ ] **Step 5: Replace static price CTA links.** Price display can temporarily retain the static marketing copy, but payment CTA URLs must use catalog `code` values. A price not returned by App must render as unavailable, not as a purchasable stale price.

- [ ] **Step 6: Run Portal tests and typecheck.**

Run: `npm run test --workspace @vase/portal -- billing-checkout-page.test.tsx app-client.test.ts; npm run typecheck --workspace @vase/portal`

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add apps/vase-portal/src/lib/app-client.ts apps/vase-portal/src/app apps/vase-portal/src/tests
git commit -m "feat: add portal Mercado Pago checkout handoff"
```

### Task 6: Add App Admin billing management and reporting

**Files:**
- Create: `apps/vase-app/src/server/queries/admin-billing.ts`
- Create: `apps/vase-app/src/app/(platform)/app/admin/billing/page.tsx`
- Create: `apps/vase-app/src/components/admin/billing-catalog-editor.tsx`
- Create: `apps/vase-app/src/components/admin/billing-invoice-table.tsx`
- Test: `apps/vase-app/src/tests/admin-billing-query.test.ts`
- Test: `apps/vase-app/src/tests/admin-billing-page.test.tsx`

- [ ] **Step 1: Write query tests.**

```ts
expect(dashboard.kpis).toEqual({ pendingCount: 2, collectedThisMonth: 266000, overdueCount: 1, failedCount: 1 });
expect(dashboard.invoices[0]).toMatchObject({ customerEmail: "client@example.com", status: "PAID", priceCode: "LABS_STARTER_MONTHLY" });
```

- [ ] **Step 2: Run focused tests.**

Run: `npm run test --workspace @vase/app -- admin-billing-query.test.ts admin-billing-page.test.tsx`

Expected: FAIL because the query and page are absent.

- [ ] **Step 3: Build the admin query.** Return KPIs, editable prices, invoices, attempts and normalized payment status. Aggregate only confirmed `APPROVED` records for collected revenue; do not use `PENDING` invoice amounts as revenue.

- [ ] **Step 4: Build the protected admin page.** Use `requireAdminPermission(adminPermissions.BILLING)`. Include price edit/create/deactivate controls, filters by product/status/date, and rows for tenant/customer, plan, amount, next charge date, Mercado Pago payment id, status and timestamps. Link it from the existing Admin Finance page as “Cobros online”.

- [ ] **Step 5: Run focused tests and app typecheck.**

Run: `npm run test --workspace @vase/app -- admin-billing-query.test.ts admin-billing-page.test.tsx; npm run typecheck --workspace @vase/app`

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add apps/vase-app/src/server/queries/admin-billing.ts apps/vase-app/src/app/(platform)/app/admin/billing apps/vase-app/src/components/admin/billing-* apps/vase-app/src/tests/admin-billing-*.test.ts
git commit -m "feat: manage online billing from admin"
```

### Task 7: Seed, end-to-end verification, and rollout safeguards

**Files:**
- Modify: `apps/vase-app/prisma/seed.ts`
- Create: `apps/vase-app/src/tests/billing-e2e-flow.test.ts`
- Modify: `apps/vase-app/.env.example`
- Create: `docs/billing/mercado-pago-runbook.md`

- [ ] **Step 1: Write the end-to-end service test.**

```ts
const checkout = await portal.createCheckout({ priceCode: "BUSINESS_MAINTENANCE_MONTHLY", customerEmail, tenantId });
await webhook.process(approvedEventFor(checkout.invoiceId));
expect(await invoiceRepository.get(checkout.invoiceId)).toMatchObject({ status: "PAID" });
expect(await subscriptionRepository.get(tenantId)).toMatchObject({ maintenanceEndsAt: expect.any(Date) });
```

- [ ] **Step 2: Seed active prices.** Seed independently editable codes for `LABS_STARTER_MONTHLY`, `LABS_PRO_MONTHLY`, Labs token packs as `ONE_TIME`, `BUSINESS_SETUP_ONE_TIME`, `BUSINESS_MAINTENANCE_MONTHLY`, `MANAGEMENT_SETUP_ONE_TIME`, `MANAGEMENT_MONTHLY`, `REST_SETUP_ONE_TIME`, and `REST_MONTHLY`. Seed no live key or live credential.

- [ ] **Step 3: Write the operator runbook.** Cover sandbox values, public webhook URL, signature verification test, test payment, idempotent duplicate delivery, refund/chargeback review, the monthly invoice/renewal job, and the exact condition for enabling production keys.

- [ ] **Step 4: Run the full verification set.**

Run: `npm run test --workspace @vase/app; npm run test --workspace @vase/portal; npm run typecheck --workspace @vase/app; npm run typecheck --workspace @vase/portal`

Expected: all tests and both typechecks pass.

- [ ] **Step 5: Manual sandbox acceptance.** Create one checkout from Portal; approve it in Mercado Pago sandbox; confirm App Admin shows `PAID`; confirm the related entitlement end date moves forward; replay the exact webhook and confirm that no second entitlement or payment record is created.

- [ ] **Step 6: Commit.**

```bash
git add apps/vase-app/prisma/seed.ts apps/vase-app/src/tests/billing-e2e-flow.test.ts apps/vase-app/.env.example docs/billing/mercado-pago-runbook.md
git commit -m "test: cover billing payment lifecycle"
```

## Delivery sequence

Ship Tasks 1-4 first: they create a secure API-only billing core and can be sandbox-tested without Portal changes. Ship Task 5 next to expose checkout, then Task 6 for operational control. Task 7 is the go-live gate; live credentials must not be set before its sandbox acceptance test passes.
