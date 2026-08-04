# Admin Host Routing Design

## Objective

Serve the complete existing Vase Super Admin experience from `admin.vase.ar`
with clean public URLs, while keeping a single implementation, identity system,
and source of truth inside `vase-app`.

The reduced frontend currently deployed from `apps/vase-admin` will no longer be
the public Admin interface. Its Rest and Labs controls will be integrated into
the complete Super Admin shell before the old service is retired.

## Confirmed product behavior

- `admin.vase.ar` displays the same full Super Admin shell currently available
  at `app.vase.ar/app/admin`.
- Public Admin URLs omit the internal `/app/admin` prefix.
- Navigation, forms, mutations, search results, redirects, and post-action
  destinations remain on `admin.vase.ar`.
- Only verified `SUPER_ADMIN` users may access the Admin host.
- Authentication and account recovery remain canonical on `app.vase.ar`.
- Vase Rest and Vase Labs administration remain available as sections of the
  complete Super Admin product.

## Public route map

| Public Admin URL | Internal reusable page |
| --- | --- |
| `/` | `/app/admin` |
| `/users` | `/app/admin/users` |
| `/modules` | `/app/admin/modules` |
| `/management` | `/app/admin/management` |
| `/labs` | new full-shell Labs administration page |
| `/rest` | new full-shell Rest administration page |
| `/finance` | `/app/admin/finance` |
| `/expenses` | `/app/admin/expenses` |
| `/meetings` | `/app/admin/meetings` |
| `/customizations` | `/app/admin/customizations` |
| `/development` | `/app/admin/development` |
| `/tickets` | `/app/admin/tickets` |
| `/support` | `/app/admin/support` |
| `/faqs` | `/app/admin/faqs` |
| `/wiki` | `/app/admin/wiki` |
| `/settings` | `/app/admin/settings` |
| `/audit` | `/app/admin/audit` |

Nested paths preserve their suffix below the clean public section. The route
mapping is explicit; arbitrary App routes are not exposed on the Admin host.

## Architecture

### Single application, host-specific entrypoint

`app-vase` serves both domains:

```text
app.vase.ar   -> client application and canonical authentication
admin.vase.ar -> clean Super Admin routes
```

The Next.js request proxy recognizes `admin.vase.ar` as a platform host. It
maps allowed clean paths to their existing internal `/app/admin` pages by
rewrite, so the browser retains the clean URL and the implementation remains
single-source.

Requests to legacy `app.vase.ar/app/admin` URLs redirect to the equivalent
clean `admin.vase.ar` URL. Internal rewrites are distinguished from browser
requests to prevent redirect loops.

### Navigation

Admin routing is centralized in a typed route map shared by:

- host request resolution;
- sidebar and search navigation;
- page-level links;
- form destinations;
- post-mutation redirects;
- legacy URL canonicalization.

The App shell treats the Admin host as Admin even though `usePathname()` exposes
a clean path such as `/users`. Active navigation is resolved from the route map
rather than from the old hardcoded prefix.

### Rest and Labs integration

The controls currently rendered by `apps/vase-admin` move into full-shell pages
inside `vase-app`:

- `/rest` manages versioned pricing, tenant contracts, global user access,
  Rest service health, tenants, and Edge installations.
- `/labs` manages tenant entitlements and approved limit overrides.

Shared business logic is extracted from route handlers where necessary. The UI
does not call itself through public HTTP. App-owned data is queried through App
services/repositories, and operational Rest/Labs data uses authenticated
service-to-service calls over EasyPanel's internal network.

## Data ownership

- Vase App's MySQL database owns global users, memberships, module access,
  Rest pricing versions, and Rest tenant contracts.
- Vase Rest's PostgreSQL database owns restaurant operation, branches, staff,
  devices, Edge state, and offline synchronization data.
- Labs retains its existing service-owned operational data.
- No data is copied to `postgres-admin`.
- The unused Admin PostgreSQL database is not required by the resulting
  architecture.

## Authentication and authorization

- The shared Auth.js session cookie remains scoped to `.vase.ar`.
- Unauthenticated Admin-host requests redirect once to the canonical App login
  with the clean Admin return URL.
- Authenticated users without `SUPER_ADMIN` receive a forbidden response and
  are not redirected in a loop.
- Every reused Admin page keeps its existing server-side `SUPER_ADMIN` or
  permission guard.
- Admin-host routing rejects storefront, customer workspace, owner, support,
  and arbitrary API pages that are outside the explicit Admin allowlist.
- Service-to-service failures are rendered as operational errors and never
  interpreted as missing browser authentication.

## Failure handling

- A Rest or Labs outage degrades only the corresponding product page.
- Invalid internal service configuration produces an explicit unavailable
  state with a traceable error code.
- A missing or expired browser session produces one login redirect.
- A forbidden platform role produces `403` without bouncing between domains.
- Clean routes that do not exist return `404` and are never interpreted as
  tenant storefronts.

## EasyPanel migration

1. Deploy the host-routing implementation to `app-vase` while
   `admin.vase.ar` still points to the old `admin-vase` service.
2. Verify the new Admin-host behavior against a temporary hostname or direct
   EasyPanel preview if available.
3. Remove `admin.vase.ar` from `admin-vase`.
4. Add `admin.vase.ar` as a second domain on `app-vase`, using internal port
   `3002` and HTTPS.
5. Verify login, every sidebar section, Rest, Labs, Server Actions, and logout.
6. Keep `admin-vase` stopped but recoverable for a short rollback window.
7. Remove `admin-vase` and `postgres-admin` only after the rollback window and
   after confirming no external consumer uses their health endpoints.

The `app-vase` build remains:

```text
Build Path: /
Dockerfile: apps/vase-app/Dockerfile
Internal port: 3002
```

No change is required to the App database connection solely for host routing.

## Rollback

If the Admin host fails after the domain switch:

1. remove `admin.vase.ar` from `app-vase`;
2. restore it on the stopped `admin-vase` service;
3. restart `admin-vase` with the previously verified image and shared token.

The database is not migrated or duplicated during this change, so domain
rollback does not require data restoration.

## Verification

Automated coverage must include:

- clean-to-internal route mapping for every public Admin section;
- legacy App Admin URL canonical redirects;
- root Admin-host behavior for signed-out, non-admin, and `SUPER_ADMIN` users;
- clean navigation generation and active sidebar state;
- forms and Server Actions that do not leak `/app/admin` into the browser;
- explicit `404` for non-Admin clean paths;
- Rest and Labs degraded-state isolation;
- absence of authentication redirect loops;
- production builds for `@vase/app`;
- complete repository test suite.

Manual production verification covers HTTPS, shared cookie behavior, login
return URLs, all sidebar entries, mutation flows, logout, and EasyPanel health.

## Out of scope

- Redesigning the established Super Admin visual language.
- Moving global App data to PostgreSQL.
- Creating a separate Admin identity system.
- Keeping two independently implemented Admin frontends.
- Deleting `admin-vase` before production verification and the rollback window.
