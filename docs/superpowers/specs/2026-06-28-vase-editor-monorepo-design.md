# Vase Editor Monorepo Design

## Goal

Move the production editor source from `Proyecto-Teflon` into the `Vase`
repository without changing its runtime behavior, database, public domains, or
EasyPanel port.

## Selected Approach

The editor will live in `apps/vase-editor` as an independently deployable
Express and Vite application. Only source code, package manifests, static
assets, SQL files, and safe examples are imported. Generated dependencies,
build output, uploads, caches, local environment files, and scratch data remain
outside the monorepo.

The existing `apps/vase-business` Next.js application remains reserved:

- `apps/vase-business` is not deployed until it receives another domain.
- `apps/vase-editor` serves Business at `business.vase.ar` on port `3000`.
- `vase-app` launches the editor through the existing SSO bridge.

## Deployment

EasyPanel builds from the repository root with
`apps/vase-editor/Dockerfile`. Docker `COPY` paths therefore include the
`apps/vase-editor` prefix. The editor continues using the existing
`vase-business-pg` service during migration.

The new EasyPanel service is deployed first on a temporary domain. After
`/health`, editor login, SSO launch, storefronts, uploads, and custom domains
are verified, production domains move from the old service to the new service.

## Security

No real `.env` file or credential is committed. Public examples use
placeholders. Credentials exposed during migration must be rotated in
EasyPanel, including the database password, SSO secret, uploads JWT secret,
SMTP password, Cloudflare token, and webhook secret.

## Verification

Automated checks verify the deployment structure, port, health endpoint,
root-context Docker paths, and absence of committed runtime `.env` files.
The Vite frontend and Docker image must also build successfully.
