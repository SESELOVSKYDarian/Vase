# Clean Admin Host Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the complete Vase Super Admin from `admin.vase.ar` with clean URLs, canonical authentication on `app.vase.ar`, and fully functional Rest/Labs controls in the existing App shell.

**Architecture:** Keep one Next.js deployment (`@vase/app`) and route by host in `src/proxy.ts`. A pure, tested route-map module converts clean Admin URLs to the existing `/app/admin` filesystem routes and canonicalizes legacy App URLs. Authenticated browser APIs delegate to shared App services; internal service-token APIs retain their existing contract.

**Tech Stack:** Next.js 16 App Router and Proxy, Auth.js, TypeScript, Prisma/MySQL for App data, PostgreSQL-backed Rest service, Vitest, Docker/EasyPanel.

---

## Task 1: Centralize the Admin host and route map

**Files:**
- Create: `apps/vase-app/src/lib/security/admin-host-routing.ts`
- Create: `apps/vase-app/src/tests/admin-host-routing.test.ts`
- Modify: `apps/vase-app/src/lib/security/platform-hosts.ts`
- Modify: `apps/vase-app/src/tests/platform-hosts.test.ts`

- [ ] Add failing table-driven tests for every clean route, nested suffixes, query preservation, `admin.vase.ar` host detection, legacy canonical URLs, static/API allowances, and unknown-path rejection.
- [ ] Run `npm test --workspace @vase/app -- admin-host-routing platform-hosts` and confirm the new assertions fail.
- [ ] Implement typed helpers including `resolveAdminHost`, `isAdminHost`, `toInternalAdminPath`, `toPublicAdminPath`, `buildAdminCanonicalUrl`, and `resolveAdminHostRequest`.
- [ ] Include `admin.vase.ar` in production platform hosts without treating it as Labs, editor, or a tenant storefront.
- [ ] Re-run the focused tests and commit: `feat(app): add canonical admin host route map`.

## Task 2: Route and authorize the Admin hostname without loops

**Files:**
- Modify: `apps/vase-app/src/proxy.ts`
- Create: `apps/vase-app/src/tests/admin-proxy-routing.test.ts`
- Modify: `apps/vase-app/src/lib/auth/protected-app-redirect.ts` only if a pure auth-decision helper is needed.

- [ ] Add failing proxy-oriented tests covering signed-out login redirect, verified `SUPER_ADMIN` rewrite, verified non-admin `403`, unverified redirect, legacy `/app/admin/*` canonical redirect, assets/API handling, and clean `404`.
- [ ] Extend the Proxy auth projection to include `platformRole` and evaluate Admin-host decisions before storefront routing or the App root redirect.
- [ ] Rewrite allowed clean Admin pages to `/app/admin/*` while preserving query strings and set `x-vase-pathname` to the clean pathname.
- [ ] Redirect authentication pages to `app.vase.ar`; redirect legacy App Admin browser requests to `admin.vase.ar`; distinguish internal rewrites so they cannot bounce back.
- [ ] Return direct `403`/`404` responses for forbidden roles and unknown Admin routes.
- [ ] Run focused tests and commit: `feat(app): serve super admin from clean admin host`.

## Task 3: Make the full shell host-aware

**Files:**
- Modify: `apps/vase-app/src/components/layout/app-shell.tsx`
- Create or modify: `apps/vase-app/src/tests/app-shell-admin-routing.test.tsx`
- Modify: Admin pages/components under `apps/vase-app/src/app/(platform)/app/admin/**` where literal browser links or GET form actions use `/app/admin`.

- [ ] Add failing tests that render the shell for `admin.vase.ar/users` and assert the Admin sidebar, clean hrefs, active state, and search results.
- [ ] Normalize `usePathname()` through the route map and generate Admin links from clean route IDs when running on the Admin host.
- [ ] Replace public-facing hardcoded `/app/admin` links and GET form destinations with centralized clean Admin destinations; keep internal `revalidatePath` values unchanged.
- [ ] Verify no rendered navigation/form destination leaks `/app/admin` using `rg` plus focused component tests.
- [ ] Commit: `feat(app): keep admin navigation on clean host urls`.

## Task 4: Share Rest administration business logic securely

**Files:**
- Create: `apps/vase-app/src/server/services/rest-admin.ts`
- Modify: `apps/vase-app/src/app/api/internal/admin/rest/plans/route.ts`
- Create: `apps/vase-app/src/app/api/admin/rest/plans/route.ts`
- Create: `apps/vase-app/src/app/api/admin/rest/operations/route.ts`
- Create: `apps/vase-app/src/tests/rest-admin-api.test.ts`

- [ ] Write failing tests proving browser endpoints require a verified `SUPER_ADMIN`, ignore client-supplied actor IDs, validate commands, and report downstream Rest outages without auth redirects.
- [ ] Extract pricing queries/repository/commands from the internal route into a shared server service.
- [ ] Keep service-token authorization on `/api/internal/admin/rest/plans`; expose session-authorized `/api/admin/rest/plans` for the App UI and inject the authenticated actor ID for draft creation/auditing.
- [ ] Proxy operational reads to the configured Rest internal URL with the service token, bounded timeouts, and explicit degraded payloads.
- [ ] Run focused tests and commit: `feat(app): expose secure rest admin services`.

## Task 5: Integrate Rest into the established Super Admin shell

**Files:**
- Create: `apps/vase-app/src/app/(platform)/app/admin/rest/page.tsx`
- Create: `apps/vase-app/src/components/admin/rest-admin-workspace.tsx`
- Modify: `apps/vase-app/src/components/layout/app-shell.tsx`
- Modify: `apps/vase-app/src/app/globals.css` or the existing Admin stylesheet owning these classes.
- Create: `apps/vase-app/src/tests/rest-admin-page.test.tsx`

- [ ] Port the functional pricing, publishing, contract, user-access, health, tenant, and Edge controls from `apps/vase-admin` into App components using `/api/admin/rest/*`.
- [ ] Preserve the full App shell visual language and add Rest to the Admin navigation/search map.
- [ ] Render real initial data; isolate operational failures into an unavailable/degraded panel while retaining App-owned pricing and contract controls.
- [ ] Test successful mutations and errors, then commit: `feat(app): integrate rest controls into super admin`.

## Task 6: Share and integrate Labs administration securely

**Files:**
- Create: `apps/vase-app/src/server/services/labs-admin.ts`
- Modify: `apps/vase-app/src/app/api/internal/admin/labs/tenants/route.ts`
- Create: `apps/vase-app/src/app/api/admin/labs/tenants/route.ts`
- Create: `apps/vase-app/src/app/(platform)/app/admin/labs/page.tsx`
- Create: `apps/vase-app/src/components/admin/labs-admin-workspace.tsx`
- Create: `apps/vase-app/src/tests/labs-admin-api.test.ts`

- [ ] Write failing authorization, list, override, restore, audit, and failed-sync tests.
- [ ] Extract tenant serialization and override persistence/synchronization into a shared service used by both internal and browser routes.
- [ ] Require verified `SUPER_ADMIN` on the browser route and derive the actor from the server session.
- [ ] Port the functional Labs entitlement UI into the complete App Admin shell and point it at `/api/admin/labs/tenants`.
- [ ] Add Labs to navigation/search, run focused tests, and commit: `feat(app): integrate labs controls into super admin`.

## Task 7: Align deployment configuration and run production verification

**Files:**
- Modify: `.env.example` and/or `apps/vase-app/.env.example`
- Modify: deployment documentation that describes `admin-vase`, App domains, or EasyPanel.
- Modify: `docs/superpowers/plans/2026-08-04-admin-host-routing.md` checkbox status.

- [ ] Document `VASE_ADMIN_HOST=admin.vase.ar`, `VASE_ADMIN_PUBLIC_URL=https://admin.vase.ar`, `VASE_PRIMARY_HOST=app.vase.ar`, `.vase.ar` cookie scope, trusted origins, internal service URLs, and shared service token requirements.
- [ ] Document the unchanged EasyPanel source/build values: build path `/`, Dockerfile `apps/vase-app/Dockerfile`, port `3002`; explain the domain move and rollback window.
- [ ] Run `npm run lint --workspace @vase/app`, `npm test --workspace @vase/app`, and `npm run build --workspace @vase/app`.
- [ ] Run repository `npm test` and inspect `git diff --check` plus `git status --short`.
- [ ] Commit: `docs(deploy): route admin domain through app service`.

## Task 8: Production handoff

- [ ] Verify locally with host-header requests for `/`, `/users`, `/rest`, `/labs`, an unknown path, and a legacy App Admin URL.
- [ ] Provide the exact EasyPanel environment/domain checklist and migration order.
- [ ] Keep `admin-vase` and `postgres-admin` recoverable until the production smoke test passes; do not delete databases as part of this code change.

