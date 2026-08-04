# Client Product Access and Team Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a product-aware client access editor, make Vase Rest launch correctly from Projects, and let tenant Owners invite and manage Managers/Members with real one-time email invitations.

**Architecture:** Normalize commercial access onto tenant module/submodule rows, add a global module-feature catalog with per-tenant grants, and centralize all Super Admin product mutations in one transactional service. Keep Rest pricing contracts and Labs workspace limits as product-specific sources of truth, while team users receive only an explicit subset of tenant-enabled modules through `UserModuleAccess`.

**Tech Stack:** Next.js 16 App Router and Server Actions, React 19, TypeScript, Prisma 6/MySQL for `vase-app`, NextAuth 5, Nodemailer SMTP, Zod 4, Vitest, Playwright.

---

## Required Next.js reading

Before changing routes, forms, Server Actions, redirects, or authorization, read these repository-local guides completely:

- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/02-guides/forms.md`
- `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- `node_modules/next/dist/docs/01-app/02-guides/data-security.md`
- `node_modules/next/dist/docs/01-app/02-guides/redirecting.md`

## File responsibility map

### Data and migrations

- `apps/vase-app/prisma/schema.prisma`: normalized commercial states, feature catalog/grants, invitation records, and membership creator relation.
- `apps/vase-app/prisma/migrations/20260804090000_client_product_access_and_team/migration.sql`: additive production migration with indexes and foreign keys.
- `apps/vase-app/scripts/backfill-client-product-access.ts`: idempotent normalization of existing Business/Labs/Rest access.

### Domain services

- `apps/vase-app/src/lib/admin/client-product-access.ts`: Zod payload, pure validation and policy mapping.
- `apps/vase-app/src/server/services/client-product-access.ts`: one Prisma transaction that synchronizes tenant, modules, submodules, features, Labs, Rest, and Owner access.
- `apps/vase-app/src/server/services/tenant-team.ts`: Owner-authorized invitation, acceptance, access updates, suspension, revocation, and resend.
- `apps/vase-app/src/server/services/team-invitation-email.ts`: invitation email rendering and delivery through the existing SMTP transport.
- `apps/vase-app/src/server/queries/admin-users.ts`: focused Super Admin user/product/team loader.
- `apps/vase-app/src/server/queries/tenant-team.ts`: Owner team loader with tenant-scoped module availability.

### Super Admin UI

- `apps/vase-app/src/components/admin/client-product-access-editor.tsx`: accordion cards and product-specific controls.
- `apps/vase-app/src/components/admin/business-feature-editor.tsx`: Business feature overrides and limits.
- `apps/vase-app/src/components/admin/admin-owner-team-modal.tsx`: team view and Super Admin management.
- `apps/vase-app/src/components/admin/admin-master-users-workspace.tsx`: compose the focused components and remove technical tenant controls.
- `apps/vase-app/src/components/admin/admin-modules-console.tsx`: feature catalog CRUD inside modules/submodules.
- `apps/vase-app/src/app/(platform)/app/admin/users/page.tsx`: use the focused loader.
- `apps/vase-app/src/app/(platform)/app/admin/actions.ts`: thin action adapters that delegate to domain services.

### Client navigation and team UI

- `apps/vase-app/src/components/layout/app-shell.tsx`: add Rest to Projects and Owner-only Team navigation.
- `apps/vase-app/src/app/(platform)/app/team/page.tsx`: Owner team page.
- `apps/vase-app/src/app/(platform)/app/team/actions.ts`: Owner team action adapters.
- `apps/vase-app/src/components/team/tenant-team-workspace.tsx`: invitation and member management UI.
- `apps/vase-app/src/app/(auth)/team-invitation/[token]/page.tsx`: invitation acceptance page.
- `apps/vase-app/src/app/(auth)/team-invitation/[token]/actions.ts`: accept invitation and set password.

### Tests

- `apps/vase-app/src/tests/client-product-access.test.ts`
- `apps/vase-app/src/tests/client-product-access-service.test.ts`
- `apps/vase-app/src/tests/module-feature-catalog.test.ts`
- `apps/vase-app/src/tests/rest-project-navigation.test.tsx`
- `apps/vase-app/src/tests/tenant-team.test.ts`
- `apps/vase-app/src/tests/team-invitation-page.test.tsx`
- update `apps/vase-app/src/tests/admin-user-access.test.ts`

## Task 1: Add normalized product access and invitation data

**Files:**
- Modify: `apps/vase-app/prisma/schema.prisma`
- Create: `apps/vase-app/prisma/migrations/20260804090000_client_product_access_and_team/migration.sql`
- Test: `apps/vase-app/src/tests/client-product-schema.test.ts`

- [ ] **Step 1: Write the failing schema contract test**

Create a test that reads `schema.prisma` and asserts the exact new models/fields, so accidental omissions fail before Prisma generation:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");

describe("client product access schema", () => {
  it("contains normalized entitlements, feature grants, invitations and membership provenance", () => {
    expect(schema).toContain("enum CommercialAccessStatus");
    expect(schema).toContain("model ModuleFeature");
    expect(schema).toContain("model TenantFeatureGrant");
    expect(schema).toContain("model TenantInvitation");
    expect(schema).toContain("createdByUserId String?");
    expect(schema).toContain("commercialStatus CommercialAccessStatus");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test --workspace @vase/app -- src/tests/client-product-schema.test.ts`

Expected: FAIL because the new enum/models do not exist.

- [ ] **Step 3: Add the Prisma types and relations**

Add these enums:

```prisma
enum CommercialAccessStatus {
  TRIAL
  ACTIVE
  SUSPENDED
}

enum ModuleFeatureValueType {
  BOOLEAN
  INTEGER
  TEXT
}

enum TenantInvitationStatus {
  PENDING
  ACCEPTED
  REVOKED
  EXPIRED
}

enum LabsEntitlementPlan {
  STARTER
  PRO
  GROWTH
}
```

Extend `TenantModule` and `TenantSubmodule` with `commercialStatus`, `trialEndsAt`, and their existing indexes with the commercial state. Extend `TenantAiWorkspace` with `entitlementPlan LabsEntitlementPlan @default(STARTER)`. Extend `Membership` with nullable `createdByUserId`, a named `MembershipCreatedBy` relation, and an index on `[tenantId, createdByUserId]`. Add the inverse named relations to `User`, `Tenant`, `Module`, and `ModuleSubmodule`.

Add these normalized models:

```prisma
model ModuleFeature {
  id                 String                 @id @default(cuid())
  moduleId           String
  submoduleId        String?
  key                String
  name               String
  description        String?
  sortOrder          Int                    @default(0)
  valueType          ModuleFeatureValueType @default(BOOLEAN)
  trialDefault       Json?
  activeDefault      Json?
  minValue           Int?
  maxValue           Int?
  isActive           Boolean                @default(true)
  createdAt          DateTime               @default(now())
  updatedAt          DateTime               @updatedAt
  module             Module                 @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  submodule          ModuleSubmodule?        @relation(fields: [submoduleId], references: [id], onDelete: Cascade)
  tenantGrants       TenantFeatureGrant[]

  @@unique([moduleId, submoduleId, key])
  @@index([moduleId, submoduleId, isActive, sortOrder])
}

model TenantFeatureGrant {
  id          String        @id @default(cuid())
  tenantId    String
  featureId   String
  enabled     Boolean       @default(true)
  value       Json?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  tenant      Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  feature     ModuleFeature @relation(fields: [featureId], references: [id], onDelete: Cascade)

  @@unique([tenantId, featureId])
  @@index([tenantId, enabled])
}

model TenantInvitation {
  id              String                 @id @default(cuid())
  tenantId        String
  invitedByUserId String
  name            String
  email           String
  role            TenantRole
  moduleIds       Json
  tokenHash       String                 @unique
  status          TenantInvitationStatus @default(PENDING)
  expiresAt       DateTime
  acceptedAt      DateTime?
  revokedAt       DateTime?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt
  tenant          Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invitedBy       User                   @relation(fields: [invitedByUserId], references: [id], onDelete: Cascade)

  @@index([tenantId, status, createdAt])
  @@index([email, status])
  @@index([expiresAt, status])
}
```

- [ ] **Step 4: Write the additive SQL migration**

Write an additive MySQL migration that creates enum-backed columns, adds nullable/defaulted fields without dropping legacy data, creates the three tables, indexes, and foreign keys. Compare its SQL against the latest baseline and validate it on a disposable database before production. Do not remove `User.clientAccessConfig` or `TenantSubscription` in this migration.

- [ ] **Step 5: Generate Prisma and validate the schema**

Run:

```bash
npm run prisma:generate --workspace @vase/app
npx prisma validate --schema apps/vase-app/prisma/schema.prisma
npm run test --workspace @vase/app -- src/tests/client-product-schema.test.ts
```

Expected: Prisma generation succeeds, schema validation succeeds, test PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/vase-app/prisma/schema.prisma apps/vase-app/prisma/migrations/20260804090000_client_product_access_and_team/migration.sql apps/vase-app/src/tests/client-product-schema.test.ts
git commit -m "feat(app): add client entitlement and invitation schema"
```

## Task 2: Define product-aware access policy and payload validation

**Files:**
- Create: `apps/vase-app/src/lib/admin/client-product-access.ts`
- Modify: `apps/vase-app/src/config/modules.ts`
- Modify: `apps/vase-app/src/lib/labs/plans.ts`
- Test: `apps/vase-app/src/tests/client-product-access.test.ts`
- Update: `apps/vase-app/src/tests/admin-user-access.test.ts`

- [ ] **Step 1: Write failing policy tests**

Cover Business dual selection, Labs exclusivity/channels, Rest published-plan requirement shape, and rejection of technical tenant fields:

```ts
import { describe, expect, it } from "vitest";
import { clientProductAccessSchema, getLabsEntitlement } from "@/lib/admin/client-product-access";

describe("client product access", () => {
  it("allows Business submodules to have independent states", () => {
    const parsed = clientProductAccessSchema.parse({
      business: {
        submodules: [
          { key: "plantilla", status: "ACTIVE", features: [] },
          { key: "personalizado", status: "TRIAL", features: [] },
        ],
      },
      labs: null,
      rest: null,
      management: null,
    });
    expect(parsed.business?.submodules.map((item) => item.status)).toEqual(["ACTIVE", "TRIAL"]);
  });

  it.each([
    ["STARTER", { whatsapp: 1, instagram: 0, messenger: 0 }],
    ["PRO", { whatsapp: 1, instagram: 1, messenger: 0 }],
    ["GROWTH", { whatsapp: 1, instagram: 1, messenger: 1 }],
  ] as const)("maps %s to fixed channel limits", (plan, expected) => {
    expect(getLabsEntitlement(plan).channels).toEqual(expected);
  });

  it("strips or rejects tenant implementation fields", () => {
    expect(() => clientProductAccessSchema.parse({ tenantSlug: "do-not-accept" })).toThrow();
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm run test --workspace @vase/app -- src/tests/client-product-access.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement strict types and policies**

Export a strict Zod schema with this public shape:

```ts
export type CommercialStatus = "TRIAL" | "ACTIVE";

export const clientProductAccessSchema = z.object({
  business: z.object({
    submodules: z.array(z.object({
      id: z.string().min(1),
      key: z.enum(["plantilla", "personalizado"]),
      status: z.enum(["TRIAL", "ACTIVE"]),
      features: z.array(z.object({
        featureId: z.string().min(1),
        enabled: z.boolean(),
        value: z.union([z.boolean(), z.number().int(), z.string()]).nullable(),
      }).strict()),
    }).strict()).max(2),
  }).strict().nullable(),
  labs: z.object({
    submoduleId: z.string().min(1),
    plan: z.enum(["STARTER", "PRO", "GROWTH"]),
    status: z.enum(["TRIAL", "ACTIVE"]),
  }).strict().nullable(),
  rest: z.object({
    pricingVersionId: z.string().min(1),
    status: z.enum(["TRIAL", "ACTIVE"]),
  }).strict().nullable(),
  management: z.object({ status: z.enum(["TRIAL", "ACTIVE"]) }).strict().nullable(),
}).strict();
```

Export `getLabsEntitlement(plan)` with exact channel limits and explicit workspace limits. Map Starter to legacy `START`; Pro and Growth to legacy `PREMIUM`, while keeping the new `entitlementPlan` authoritative.

Update the Labs submodule descriptions in `config/modules.ts` so the catalog says exactly: Starter = WhatsApp, Pro = WhatsApp + Instagram, Growth = WhatsApp + Instagram + Facebook Messenger. Keep keys stable for existing rows.

- [ ] **Step 4: Remove legacy Labs ranking assumptions from tests**

Replace tests that rank multiple Labs submodules with tests that reject multiple selections. Keep compatibility helpers only for backfill input, and mark them internal to the backfill file rather than the runtime editor.

- [ ] **Step 5: Run policy tests**

Run: `npm run test --workspace @vase/app -- src/tests/client-product-access.test.ts src/tests/admin-user-access.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/vase-app/src/lib/admin/client-product-access.ts apps/vase-app/src/config/modules.ts apps/vase-app/src/lib/labs/plans.ts apps/vase-app/src/tests/client-product-access.test.ts apps/vase-app/src/tests/admin-user-access.test.ts
git commit -m "feat(app): define product-aware client access policy"
```

## Task 3: Add the global Business feature catalog

**Files:**
- Modify: `apps/vase-app/src/server/queries/modules-admin.ts`
- Modify: `apps/vase-app/src/components/admin/admin-modules-console.tsx`
- Modify: `apps/vase-app/src/app/(platform)/app/admin/actions.ts`
- Modify: `apps/vase-app/src/lib/validators/admin.ts`
- Test: `apps/vase-app/src/tests/module-feature-catalog.test.ts`

- [ ] **Step 1: Write failing validator and authorization tests**

Test that a feature requires a stable key, belongs to Business and optionally Plantilla/Personalizado, validates integer bounds, and rejects `minValue > maxValue`.

```ts
expect(createModuleFeatureSchema.safeParse({
  moduleId: "vase_business",
  submoduleId: "sub-template",
  key: "reservations",
  name: "Reservas",
  valueType: "BOOLEAN",
  trialDefault: false,
  activeDefault: true,
  minValue: null,
  maxValue: null,
  sortOrder: 10,
}).success).toBe(true);
```

- [ ] **Step 2: Run and verify failure**

Run: `npm run test --workspace @vase/app -- src/tests/module-feature-catalog.test.ts`

Expected: FAIL because feature validators/actions do not exist.

- [ ] **Step 3: Add validators and Server Actions**

Implement `createModuleFeatureSchema`, `updateModuleFeatureSchema`, and `deleteModuleFeatureSchema`. Add actions that require `adminPermissions.MODULES`, write an audit log, and revalidate both internal and clean admin module paths.

- [ ] **Step 4: Load features with the module catalog**

Include ordered `features` at module and submodule level in `getAdminModulesCatalog()`. Serialize JSON defaults into boolean/number/string/null values before passing them to the client component.

- [ ] **Step 5: Add feature CRUD to the module console**

Inside an expanded Business submodule, render `Características`, then create/edit/delete controls for name, description, type, Trial default, Active default, bounds, order and active state. Do not display these controls for Labs or Rest.

- [ ] **Step 6: Run targeted tests and lint**

Run:

```bash
npm run test --workspace @vase/app -- src/tests/module-feature-catalog.test.ts
npm run lint --workspace @vase/app -- --file src/components/admin/admin-modules-console.tsx
```

Expected: PASS with no ESLint errors.

- [ ] **Step 7: Commit**

```bash
git add apps/vase-app/src/server/queries/modules-admin.ts apps/vase-app/src/components/admin/admin-modules-console.tsx apps/vase-app/src/app/\(platform\)/app/admin/actions.ts apps/vase-app/src/lib/validators/admin.ts apps/vase-app/src/tests/module-feature-catalog.test.ts
git commit -m "feat(admin): manage Business feature catalog"
```

## Task 4: Implement atomic client product provisioning

**Files:**
- Create: `apps/vase-app/src/server/services/client-product-access.ts`
- Modify: `apps/vase-app/src/server/services/rest-admin.ts`
- Modify: `apps/vase-app/src/app/(platform)/app/admin/actions.ts`
- Test: `apps/vase-app/src/tests/client-product-access-service.test.ts`

- [ ] **Step 1: Write failing transaction service tests**

Mock a `Prisma.TransactionClient` and assert:

- Owner/tenant/membership are forced active and Owner;
- Business submodule states remain independent;
- invalid feature/submodule relationships fail before writes;
- Labs writes one selected submodule and derived channel limits;
- Rest requires a published pricing version and writes contract plus module/user access;
- a thrown Rest write rejects the whole callback.

Use the public service contract:

```ts
await applyClientProductAccess({
  tx,
  actorUserId: "admin-1",
  ownerUserId: "owner-1",
  ownerName: "Hola",
  ownerEmail: "owner@example.com",
  access: parsedAccess,
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm run test --workspace @vase/app -- src/tests/client-product-access-service.test.ts`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Extract a transaction-aware Rest contract helper**

In `rest-admin.ts`, export `applyRestContractWithTx(tx, input)` that loads a `PUBLISHED` version, copies immutable price/limits/version into `TenantRestContract`, applies the requested `TRIAL | ACTIVE` status, activates `TenantModule(vase_rest)`, and throws `REST_PRICING_NOT_PUBLISHED` otherwise. Keep the public Rest admin command delegating to this helper.

- [ ] **Step 4: Implement the orchestration service**

`applyClientProductAccess` must accept an existing transaction and perform validation before destructive updates. It must:

1. find or create one tenant for the Owner;
2. force tenant `ACTIVE` and membership `OWNER/ACTIVE`;
3. upsert selected `TenantModule` rows with commercial status and deactivate deselected managed modules;
4. upsert/deactivate Business and Labs `TenantSubmodule` rows;
5. replace only feature grants belonging to the submitted Business submodules;
6. synchronize `TenantAiWorkspace.entitlementPlan`, legacy plan, fixed channel limits and capacity limits;
7. call the Rest helper or suspend the existing Rest contract when Rest is removed;
8. replace the Owner's explicit `UserModuleAccess` rows with active product IDs.

For a new Trial row, set `trialEndsAt` to 14 days after the transaction time. Preserve an existing future expiration when the same access remains Trial; clear `trialEndsAt` when it becomes Active.

Return `{ tenantId, activeModuleIds }`; never accept tenant name/slug/industry/status/role fields from the payload.

- [ ] **Step 5: Make the master-user action delegate to the service**

Replace `parseClientAccessConfig` and `provisionClientWorkspaceFromMasterUser` usage with `clientProductAccessSchema` and `applyClientProductAccess`. Keep legacy JSON readable during migration but write only a minimal versioned snapshot:

```ts
clientAccessConfig: {
  version: 2,
  productAccess: parsedAccess,
}
```

- [ ] **Step 6: Run service and existing admin tests**

Run: `npm run test --workspace @vase/app -- src/tests/client-product-access-service.test.ts src/tests/admin-user-access.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/vase-app/src/server/services/client-product-access.ts apps/vase-app/src/server/services/rest-admin.ts apps/vase-app/src/app/\(platform\)/app/admin/actions.ts apps/vase-app/src/tests/client-product-access-service.test.ts
git commit -m "feat(admin): provision client products atomically"
```

## Task 5: Replace the Client step with product accordion cards

**Files:**
- Create: `apps/vase-app/src/server/queries/admin-users.ts`
- Create: `apps/vase-app/src/components/admin/client-product-access-editor.tsx`
- Create: `apps/vase-app/src/components/admin/business-feature-editor.tsx`
- Modify: `apps/vase-app/src/app/(platform)/app/admin/users/page.tsx`
- Modify: `apps/vase-app/src/components/admin/admin-master-users-workspace.tsx`
- Test: `apps/vase-app/src/tests/admin-client-product-editor.test.tsx`

- [ ] **Step 1: Write failing component tests**

Render the editor with `renderToStaticMarkup` and assert:

```ts
const html = renderToStaticMarkup(<ClientProductAccessEditor {...props} />);
expect(html).toContain("Owner de la cuenta · configuración automática");
expect(html).not.toContain("Slug del tenant");
expect(html).not.toContain("Industria");
expect(html).not.toContain("Rol en tenant");
expect(html).toContain("Vase Business");
expect(html).toContain("Vase Labs");
expect(html).toContain("Vase Rest");
expect(html.toLowerCase()).not.toContain("chatbots");
```

Also assert Labs uses radio selection and Rest uses published pricing-version options.

- [ ] **Step 2: Run and verify failure**

Run: `npm run test --workspace @vase/app -- src/tests/admin-client-product-editor.test.tsx`

Expected: FAIL because the editor does not exist.

- [ ] **Step 3: Move the page query into `admin-users.ts`**

Return a serializable `AdminUsersWorkspaceData` containing users, normalized product access, ordered feature catalog, published Rest versions, and team summaries. Keep payment aggregation unchanged. This removes access-shaping logic from the page component.

- [ ] **Step 4: Implement the focused Business feature editor**

Render only features from the selected Business submodule. Resolve defaults from Trial/Active, allow explicit enable/value overrides, enforce numeric min/max in the UI, and serialize the exact payload accepted by `clientProductAccessSchema`.

- [ ] **Step 5: Implement product accordion cards**

Use accessible disclosure buttons (`aria-expanded`, labelled regions) and product-specific controls:

- Business: independent Off/Trial/Pro controls for Plantilla and Personalizado plus `Configurar características`;
- Labs: one Starter/Pro/Growth radio group, Trial/Active selector, fixed channel description;
- Rest: Published plan/version selector and Trial/Active selector;
- Management: direct state only.

Disable submit while pending and render server errors without resetting local form state.

- [ ] **Step 6: Remove technical fields from the legacy workspace**

Delete the tenant identity/status/role/membership inputs, global base plan, Labs chatbot limit, Rest chatbot/page limit, multi-select Labs submodules, and their state-building code. Compose `ClientProductAccessEditor` inside the existing modal and keep identity/password/payment steps unchanged.

- [ ] **Step 7: Run component tests, typecheck, and lint**

Run:

```bash
npm run test --workspace @vase/app -- src/tests/admin-client-product-editor.test.tsx
npm run typecheck --workspace @vase/app
npm run lint --workspace @vase/app -- --file src/components/admin/admin-master-users-workspace.tsx --file src/components/admin/client-product-access-editor.tsx --file src/components/admin/business-feature-editor.tsx
```

Expected: PASS with no TypeScript or lint errors.

- [ ] **Step 8: Commit**

```bash
git add apps/vase-app/src/server/queries/admin-users.ts apps/vase-app/src/components/admin/client-product-access-editor.tsx apps/vase-app/src/components/admin/business-feature-editor.tsx apps/vase-app/src/app/\(platform\)/app/admin/users/page.tsx apps/vase-app/src/components/admin/admin-master-users-workspace.tsx apps/vase-app/src/tests/admin-client-product-editor.test.tsx
git commit -m "feat(admin): simplify client product access editor"
```

## Task 6: Make Vase Rest appear and launch from Projects

**Files:**
- Modify: `apps/vase-app/src/server/queries/modules.ts`
- Modify: `apps/vase-app/src/components/layout/app-shell.tsx`
- Modify: `apps/vase-app/src/lib/navigation/document-navigation.ts`
- Test: `apps/vase-app/src/tests/rest-project-navigation.test.tsx`
- Update: `apps/vase-app/src/tests/document-navigation.test.ts`

- [ ] **Step 1: Write failing entitlement and navigation tests**

Test that Rest is active only when all three gates pass: tenant module active, user module access active, and Rest contract status `ACTIVE | TRIAL`. Render `AppShell` with an active Rest module and assert a `Vase Rest` project child links to `https://rest.vase.ar` with full-document navigation.

- [ ] **Step 2: Run and verify failure**

Run: `npm run test --workspace @vase/app -- src/tests/rest-project-navigation.test.tsx src/tests/document-navigation.test.ts`

Expected: FAIL because AppShell ignores Rest.

- [ ] **Step 3: Gate Rest in the module query**

Select `restContract.status` with the tenant. For the Rest definition, require `tenantModuleActive` and `ACTIVE | TRIAL` contract status in addition to the existing module/user checks. Return a useful inactive status label for invalid contracts without leaking contract details to unauthorized users.

- [ ] **Step 4: Add Rest to Projects**

Compute `restModuleActive`, choose it as the fallback Projects href after Business/Labs, and add this child:

```ts
restModuleActive
  ? { id: "projects-rest", href: "https://rest.vase.ar", label: "Vase Rest", forceDocumentNavigation: true }
  : null
```

Update active-section inference and document-navigation helpers for the external Rest launch.

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm run test --workspace @vase/app -- src/tests/rest-project-navigation.test.tsx src/tests/document-navigation.test.ts src/tests/admin-user-access.test.ts
npm run build --workspace @vase/app
```

Expected: tests PASS and production build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/vase-app/src/server/queries/modules.ts apps/vase-app/src/components/layout/app-shell.tsx apps/vase-app/src/lib/navigation/document-navigation.ts apps/vase-app/src/tests/rest-project-navigation.test.tsx apps/vase-app/src/tests/document-navigation.test.ts
git commit -m "fix(app): launch entitled Rest accounts from Projects"
```

## Task 7: Implement secure tenant invitations and team authorization

**Files:**
- Create: `apps/vase-app/src/server/services/tenant-team.ts`
- Create: `apps/vase-app/src/server/services/team-invitation-email.ts`
- Create: `apps/vase-app/src/server/queries/tenant-team.ts`
- Modify: `apps/vase-app/src/server/services/auth-email.ts`
- Test: `apps/vase-app/src/tests/tenant-team.test.ts`

- [ ] **Step 1: Write failing team service tests**

Cover:

- only active Owners can invite;
- roles are limited to Manager/Member;
- requested module IDs must be an active subset of the tenant;
- raw tokens are returned once, only SHA-256 hashes are stored;
- resend revokes prior pending tokens;
- acceptance creates/reuses one user, creates active membership with `createdByUserId`, and replaces explicit module access;
- suspension prevents access but preserves records;
- tokens are single-use and expire.

- [ ] **Step 2: Run and verify failure**

Run: `npm run test --workspace @vase/app -- src/tests/tenant-team.test.ts`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement invitation primitives**

Use `randomBytes(32).toString("base64url")` for the raw token and `createHash("sha256").update(token).digest("hex")` for persistence. Set expiration to 72 hours. Normalize email with `trim().toLowerCase()`.

Expose these service methods:

```ts
inviteTenantMember(input)
resendTenantInvitation(input)
revokeTenantInvitation(input)
acceptTenantInvitation(input)
updateTenantMemberAccess(input)
setTenantMemberSuspended(input)
```

Every Owner mutation must derive `tenantId` from `requireTenantRole(OWNER)`, not from trusted form input. Super Admin variants must call the same lower-level repository functions after `requireAdminPermission(USERS)`.

- [ ] **Step 4: Deliver a real invitation email**

Export a safe reusable SMTP sender from `auth-email.ts` without exposing transport credentials. Build the action URL as `${APP_URL}/team-invitation/${rawToken}`. Email copy names the tenant, inviter, role and expiration, and never logs the raw URL in production.

If SMTP delivery fails, keep the invitation pending, return a specific `INVITATION_EMAIL_FAILED` result, and allow resend. Do not mark it accepted.

- [ ] **Step 5: Implement team queries**

Return active/suspended memberships, pending invitations, the active tenant module catalog, and each member's explicit module IDs. Exclude the Owner from mutable team entries while returning Owner identity separately for headings.

- [ ] **Step 6: Run tests**

Run: `npm run test --workspace @vase/app -- src/tests/tenant-team.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/vase-app/src/server/services/tenant-team.ts apps/vase-app/src/server/services/team-invitation-email.ts apps/vase-app/src/server/queries/tenant-team.ts apps/vase-app/src/server/services/auth-email.ts apps/vase-app/src/tests/tenant-team.test.ts
git commit -m "feat(app): add secure tenant team invitations"
```

## Task 8: Add invitation acceptance and Owner team UI

**Files:**
- Create: `apps/vase-app/src/app/(auth)/team-invitation/[token]/page.tsx`
- Create: `apps/vase-app/src/app/(auth)/team-invitation/[token]/actions.ts`
- Create: `apps/vase-app/src/app/(platform)/app/team/page.tsx`
- Create: `apps/vase-app/src/app/(platform)/app/team/actions.ts`
- Create: `apps/vase-app/src/components/team/tenant-team-workspace.tsx`
- Modify: `apps/vase-app/src/components/layout/app-shell.tsx`
- Test: `apps/vase-app/src/tests/team-invitation-page.test.tsx`
- Test: `apps/vase-app/src/tests/tenant-team-workspace.test.tsx`

- [ ] **Step 1: Write failing page/component tests**

Assert the Owner sees `Equipo`, invitation forms offer only Manager/Member and active tenant modules, and invalid/expired/used token pages show safe states. Assert a valid new-user acceptance requires a password of 8–72 characters and confirmation.

- [ ] **Step 2: Run and verify failure**

Run: `npm run test --workspace @vase/app -- src/tests/team-invitation-page.test.tsx src/tests/tenant-team-workspace.test.tsx`

Expected: FAIL because routes/components do not exist.

- [ ] **Step 3: Implement invitation acceptance**

The page loads invitation metadata by token hash without consuming it. The Server Action validates password confirmation, hashes a password only for users without credentials, invokes `acceptTenantInvitation`, creates a normal authenticated user/session-compatible account, then redirects to the role-specific app home. Existing users are asked to sign in and return to the same invitation URL before acceptance.

- [ ] **Step 4: Implement Owner actions and page**

Create thin Server Actions for invite, resend, revoke, role/module update, suspend and reactivate. Use `useActionState` and return Spanish field-specific errors. Revalidate `/app/team` after successful changes.

- [ ] **Step 5: Implement the team workspace**

Render counts and sections for active users, suspended users and pending invitations. Provide `Invitar usuario`, role selection, accessible module checkboxes, edit, suspend/reactivate, revoke and resend. Never render commercial plan, status, pricing or limit controls.

- [ ] **Step 6: Add Owner-only navigation**

Add an optional `canManageTeam` prop to `AppShell`. Render `Equipo` only when true. Pass it from Owner pages, beginning with `/app`, `/app/settings`, and `/app/team`; do not expose it on Manager/Member pages.

- [ ] **Step 7: Run tests, typecheck and build**

Run:

```bash
npm run test --workspace @vase/app -- src/tests/team-invitation-page.test.tsx src/tests/tenant-team-workspace.test.tsx src/tests/tenant-team.test.ts
npm run typecheck --workspace @vase/app
npm run build --workspace @vase/app
```

Expected: PASS and production build succeeds.

- [ ] **Step 8: Commit**

```bash
git add apps/vase-app/src/app/\(auth\)/team-invitation apps/vase-app/src/app/\(platform\)/app/team apps/vase-app/src/components/team/tenant-team-workspace.tsx apps/vase-app/src/components/layout/app-shell.tsx apps/vase-app/src/tests/team-invitation-page.test.tsx apps/vase-app/src/tests/tenant-team-workspace.test.tsx
git commit -m "feat(app): let owners manage tenant teams"
```

## Task 9: Let Super Admin view and manage each Owner's team

**Files:**
- Create: `apps/vase-app/src/components/admin/admin-owner-team-modal.tsx`
- Modify: `apps/vase-app/src/components/admin/admin-master-users-workspace.tsx`
- Modify: `apps/vase-app/src/app/(platform)/app/admin/actions.ts`
- Modify: `apps/vase-app/src/server/queries/admin-users.ts`
- Test: `apps/vase-app/src/tests/admin-owner-team-modal.test.tsx`

- [ ] **Step 1: Write failing UI and action tests**

Assert an Owner row shows `Ver equipo (N)`, the modal lists Manager/Member and pending invitations, Super Admin can edit role/modules/state, and no action can promote a member to Owner or remove the primary Owner.

- [ ] **Step 2: Run and verify failure**

Run: `npm run test --workspace @vase/app -- src/tests/admin-owner-team-modal.test.tsx`

Expected: FAIL because the team modal does not exist.

- [ ] **Step 3: Add Super Admin action adapters**

Validate `tenantId`, target membership/invitation and module IDs, require `adminPermissions.USERS`, then delegate to the tenant-team service. Write audit events with actor, tenant, target and before/after access summaries.

- [ ] **Step 4: Add team summaries to the admin loader**

For Owner rows, return team count and complete serializable team data grouped by tenant. Avoid one query per row: load memberships/invitations/module accesses in batched queries and group in memory.

- [ ] **Step 5: Implement `AdminOwnerTeamModal`**

Match the approved accordion/card visual hierarchy. Support edit role, subset of tenant modules, suspend/reactivate, resend/revoke invitation. Keep the Owner header read-only.

- [ ] **Step 6: Run tests and lint**

Run:

```bash
npm run test --workspace @vase/app -- src/tests/admin-owner-team-modal.test.tsx src/tests/tenant-team.test.ts
npm run lint --workspace @vase/app -- --file src/components/admin/admin-owner-team-modal.tsx --file src/components/admin/admin-master-users-workspace.tsx
```

Expected: PASS with no lint errors.

- [ ] **Step 7: Commit**

```bash
git add apps/vase-app/src/components/admin/admin-owner-team-modal.tsx apps/vase-app/src/components/admin/admin-master-users-workspace.tsx apps/vase-app/src/app/\(platform\)/app/admin/actions.ts apps/vase-app/src/server/queries/admin-users.ts apps/vase-app/src/tests/admin-owner-team-modal.test.tsx
git commit -m "feat(admin): manage client teams from owner rows"
```

## Task 10: Backfill existing client product access safely

**Files:**
- Create: `apps/vase-app/scripts/backfill-client-product-access.ts`
- Modify: `apps/vase-app/package.json`
- Test: `apps/vase-app/src/tests/client-product-access-backfill.test.ts`

- [ ] **Step 1: Write failing idempotency tests**

Use an in-memory repository fixture for legacy rows and assert two runs produce the same normalized output. Cover legacy global Trial/Pro, Business `TenantSubmodule`, multiple Labs submodules, Rest access without contract, and explicit user module access.

- [ ] **Step 2: Run and verify failure**

Run: `npm run test --workspace @vase/app -- src/tests/client-product-access-backfill.test.ts`

Expected: FAIL because the backfill does not exist.

- [ ] **Step 3: Implement dry-run and apply modes**

The script must default to `--dry-run` and require `--apply` for writes. In batches of 100 tenants:

- derive Business submodule states from active links plus legacy billing status;
- select one Labs plan deterministically, preferring `growth`, then `pro`, then `starter` only for conflicting legacy data, and report every normalization;
- populate the new Labs entitlement plan and fixed channels;
- preserve Rest contracts and flag module-only Rest rows as `REST_CONTRACT_REQUIRED` without creating a paid contract;
- preserve all explicit user module access rows;
- set membership provenance only when known, leaving legacy creator null.

Print JSON counts for scanned, changed, normalized, skipped and errors. Exit non-zero on database errors.

- [ ] **Step 4: Add the package script**

```json
"backfill:client-product-access": "tsx scripts/backfill-client-product-access.ts"
```

- [ ] **Step 5: Run tests and a dry run against the configured development database**

Run:

```bash
npm run test --workspace @vase/app -- src/tests/client-product-access-backfill.test.ts
npm run backfill:client-product-access --workspace @vase/app -- --dry-run
```

Expected: test PASS; dry run reports counts and performs zero writes.

- [ ] **Step 6: Commit**

```bash
git add apps/vase-app/scripts/backfill-client-product-access.ts apps/vase-app/package.json apps/vase-app/src/tests/client-product-access-backfill.test.ts
git commit -m "feat(app): backfill normalized client product access"
```

## Task 11: Production verification and deployment documentation

**Files:**
- Modify: `docs/deployment/easypanel-vase-app.md`
- Modify: `docs/deployment/easypanel-vase-admin.md`
- Modify: `docs/deployment/easypanel-vase-rest.md`
- Test: all `apps/vase-app` tests and build

- [ ] **Step 1: Document the deployment order**

Document this exact sequence:

1. back up the `vase-app` MySQL database;
2. deploy the new application image with SMTP and shared Rest secrets already configured;
3. run `npm run prisma:migrate:deploy --workspace @vase/app` once;
4. run `npm run backfill:client-product-access --workspace @vase/app -- --dry-run`;
5. inspect the JSON report;
6. run the same command with `--apply`;
7. restart/redeploy `app-vase` and `admin-vase` services if EasyPanel has separate host services using the same image;
8. verify `app.vase.ar`, `admin.vase.ar`, and `rest.vase.ar` smoke checks.

List required existing environment variables: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, SMTP variables, `REST_CONTEXT_SIGNING_SECRET`, `REST_INTERNAL_URL`, and `SERVICE_TO_SERVICE_TOKEN`. Do not add a new database or separate Prisma command for `admin.vase.ar`; it uses the same `vase-app` schema.

- [ ] **Step 2: Run the focused regression suite**

Run:

```bash
npm run test --workspace @vase/app -- src/tests/client-product-schema.test.ts src/tests/client-product-access.test.ts src/tests/client-product-access-service.test.ts src/tests/module-feature-catalog.test.ts src/tests/admin-client-product-editor.test.tsx src/tests/rest-project-navigation.test.tsx src/tests/tenant-team.test.ts src/tests/team-invitation-page.test.tsx src/tests/tenant-team-workspace.test.tsx src/tests/admin-owner-team-modal.test.tsx src/tests/client-product-access-backfill.test.ts
```

Expected: all listed tests PASS.

- [ ] **Step 3: Run full quality gates**

Run:

```bash
npm run test --workspace @vase/app
npm run typecheck --workspace @vase/app
npm run lint --workspace @vase/app
npm run build --workspace @vase/app
```

Expected: full Vitest suite PASS (only documented pre-existing skips), TypeScript PASS, ESLint PASS, production build PASS.

- [ ] **Step 4: Perform manual smoke checks**

Using a disposable test tenant:

1. create a client Owner in `admin.vase.ar/users`;
2. assign Business Plantilla Pro, Personalizado Trial, Labs Growth Trial and a published Rest plan;
3. sign in as Owner and verify Business, Labs and Rest appear in Projects;
4. open Rest and verify no `REST_CONTRACT_INACTIVE` response;
5. invite one Manager with Business/Rest and one Member with Labs;
6. accept both links and verify each sees only assigned modules;
7. open `Ver equipo` from the Owner row and suspend/reactivate the Member;
8. remove Rest from the Owner and verify it disappears without deleting Rest operational data.

- [ ] **Step 5: Inspect database invariants**

Confirm every test tenant has one active Owner, Labs has at most one active plan submodule, each active Rest project link has an `ACTIVE | TRIAL` contract, feature grants reference the correct Business submodule, and no invitation stores a raw token.

- [ ] **Step 6: Commit**

```bash
git add docs/deployment/easypanel-vase-app.md docs/deployment/easypanel-vase-admin.md docs/deployment/easypanel-vase-rest.md
git commit -m "docs(deploy): add client access rollout procedure"
```

## Completion criteria

- The Super Admin client step contains no editable tenant identity, tenant status, membership status, or tenant role fields.
- Business Plantilla/Personalizado can independently be Off, Trial or Pro and have catalog-backed feature overrides.
- Labs allows exactly one Starter/Pro/Growth plan, derives fixed channels, and has no chatbot-count input.
- Rest selection requires a published plan and atomically creates a valid contract and access.
- Rest appears under Projects only when tenant, contract and user access are valid.
- Owners can invite and manage Managers/Members with real one-time email links and module subsets.
- Super Admin can view/manage the team from the Owner row without replacing the primary Owner.
- Migrations and backfill are additive, idempotent, documented, and production-verifiable.
