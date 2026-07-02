# Vase App/Labs Separate Services Design

## Objective

Keep the three public Vase surfaces isolated by domain and by EasyPanel service:

- `vase.ar` serves the marketing portal from `portal-vase`.
- `app.vase.ar` serves the authenticated customer app from `app-vase`.
- `labs.vase.ar` serves the Labs experience from `vase-labs`.

The goal is to preserve the current full App experience for Labs while allowing
Portal and Labs to run on internal port `3000` without breaking `app-vase`.

## Current Problem

`vase-labs` is deployed with `PORT=3000`, but it currently builds from
`apps/vase-app/Dockerfile`, whose runtime command hardcodes
`next start -H 0.0.0.0 -p 3002`.

That mismatch causes EasyPanel to send traffic to port `3000` while the
container is only listening on `3002`, producing upstream `502` responses on
`labs.vase.ar`, including `/favicon.ico`, `/api/health/live`, and the Labs UI
routes.

## Recommended Approach

Use three independent EasyPanel services:

1. `portal-vase` for `vase.ar`
2. `app-vase` for `app.vase.ar`
3. `vase-labs` for `labs.vase.ar`

`portal-vase` keeps using `apps/vase-portal/Dockerfile` on internal port
`3000`.

`app-vase` and `vase-labs` both use `apps/vase-app/Dockerfile`, but that
Dockerfile must stop hardcoding the runtime port. It should honor the runtime
`PORT` environment variable and fall back to `3002` when `PORT` is not set.

This preserves the existing shared auth/database behavior while making the Labs
service reachable on port `3000`.

## Service Contract

```text
portal-vase
  Build path: /
  Dockerfile: apps/vase-portal/Dockerfile
  Internal port: 3000
  Domain: vase.ar

app-vase
  Build path: /
  Dockerfile: apps/vase-app/Dockerfile
  Internal port: 3002
  Domain: app.vase.ar

vase-labs
  Build path: /
  Dockerfile: apps/vase-app/Dockerfile
  Internal port: 3000
  Domain: labs.vase.ar
```

## Routing Behavior

- Visiting `https://vase.ar` stays on the public marketing portal.
- Visiting `https://app.vase.ar/signin` shows the customer login.
- Visiting `https://app.vase.ar/app` shows the authenticated app dashboard.
- Clicking the main Vase logo inside the app shell sends the user to
  `https://vase.ar`.
- Visiting `https://labs.vase.ar/app/owner/labs` stays inside the Labs
  experience.
- Labs navigation should not send the user to the customer app home unless a
  Labs-specific "back to portal" action explicitly does so.

## Application Changes

### 1. `apps/vase-app/Dockerfile`

Change the runtime command so the same image can boot on either port:

- default runtime port: `3002`
- override via environment: `PORT`

Implementation contract:

- the image must start Next.js with `0.0.0.0`
- the startup command must use `PORT` when EasyPanel provides it
- the image metadata should not imply that only port `3002` is valid

### 2. App shell links

The authenticated app shell must treat the brand/logo action as a public-site
navigation to `https://vase.ar` instead of routing back to `/app`.

Any "Inicio" action inside the customer app should remain an app-local route
for authenticated dashboard navigation unless the current UI explicitly intends
to leave the app and return to the public site.

### 3. Labs shell isolation

The Labs shell must keep the user inside the Labs route space. Customer-app
navigation items that do not belong in Labs should be removed or replaced with
Labs-local destinations.

The existing "Volver al Panel de Vase" action remains the one explicit escape
hatch from Labs back to the app/customer surface.

## Environment Contract

### `portal-vase`

Portal-specific runtime:

```text
PORT=3000
NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=https://vase.ar
NEXT_PUBLIC_APP_URL=https://app.vase.ar
APP_INTERNAL_URL=http://app-vase:3002
SERVICE_TO_SERVICE_TOKEN=<shared-internal-token>
```

Portal should not duplicate the full app/labs secret set unless a variable is
actually required by Portal code.

### `app-vase`

Key runtime requirements:

```text
PORT=3002
NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=https://vase.ar
NEXT_PUBLIC_APP_URL=https://app.vase.ar
NEXT_PUBLIC_LABS_URL=https://labs.vase.ar
AUTH_COOKIE_DOMAIN=.vase.ar
VASE_PRIMARY_HOST=app.vase.ar
VASE_LABS_HOST=labs.vase.ar
```

### `vase-labs`

Key runtime requirements:

```text
PORT=3000
NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=https://vase.ar
NEXT_PUBLIC_APP_URL=https://app.vase.ar
NEXT_PUBLIC_LABS_URL=https://labs.vase.ar
AUTH_COOKIE_DOMAIN=.vase.ar
VASE_LABS_HOST=labs.vase.ar
```

`TRUSTED_ORIGINS` must include all active public domains that participate in
auth or cross-surface traffic:

- `https://vase.ar`
- `https://www.vase.ar`
- `https://app.vase.ar`
- `https://labs.vase.ar`
- `https://business.vase.ar`

`app-vase` and `vase-labs` must share the same auth/database secrets because
they operate against the same session and data model.

## Non-Goals

- Do not migrate customer Labs traffic to the standalone `apps/vase-labs`
  project in this change.
- Do not redesign the business editor or `business.vase.ar`.
- Do not split auth storage or create separate databases for App and Labs.

## Verification

- Migration tests cover the new `apps/vase-app/Dockerfile` runtime-port
  behavior.
- Portal migration tests continue asserting port `3000`.
- `next build` succeeds for `apps/vase-portal` and `apps/vase-app`.
- A Docker build for `apps/vase-app/Dockerfile` succeeds.
- EasyPanel smoke checks succeed after deploy:
  - `https://app.vase.ar/api/health/live`
  - `https://labs.vase.ar/api/health/live`
  - `https://labs.vase.ar/favicon.ico`
  - `https://app.vase.ar/app`
  - `https://labs.vase.ar/app/owner/labs`
