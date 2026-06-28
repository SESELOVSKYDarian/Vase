# Vase App V3 Migration Design

## Objective

Move the authenticated Vase application from the root application in `main`
into `apps/vase-app`, then deploy it at `app.vase.ar` without interrupting the
current production service at `vase.ar`.

The first migration stage preserves the existing users, tenants, memberships,
credentials, billing state, and Business launcher by continuing to use the
current MySQL `vase-db` database.

## Product Boundaries

- `vase.ar` is the public Portal.
- `app.vase.ar` is the authenticated Vase application.
- `business.vase.ar` is the current Business editor.
- Portal sign-in and registration actions redirect to `app.vase.ar`.
- Business access starts at `app.vase.ar/app/business/launch`.

The Portal replacement at `vase.ar` is outside this first implementation. The
existing production application remains there until `app.vase.ar` passes the
cutover checklist.

## Migration Approach

Use a conservative lift-and-shift:

1. Treat the complete root application from `origin/main` as the behavioral
   reference.
2. Integrate its application routes, Prisma schema, public assets, scripts, and
   supporting code into the `apps/vase-app` workspace on `Vase-Test-Repos`.
3. Preserve the existing MySQL schema and data model during this stage.
4. Adapt paths, workspace dependencies, environment examples, and Docker
   packaging for the monorepo.
5. Deploy a separate EasyPanel service named `vase-app-next`.
6. Validate the new service at `app.vase.ar` before changing `vase.ar`.

This stage does not migrate MySQL to PostgreSQL. That database migration is a
separate project after production parity is established.

## Runtime Architecture

### EasyPanel service

```text
Service: vase-app-next
Source repository: SESELOVSKYDarian/Vase
Branch: Vase-Test-Repos
Build context: /
Dockerfile: apps/vase-app/Dockerfile
Domain: app.vase.ar
Internal port: 3002
```

The Dockerfile must build from the repository root because the workspace uses
root package metadata, shared packages, and the root TypeScript configuration.

### Database

`vase-app-next` connects to the existing EasyPanel MySQL service `vase-db`.
Both the old and new application may read the same data during validation.

Schema migrations must remain backward-compatible while both services are
running. No destructive migration or reset is permitted in this stage.

### Authentication

- The canonical authenticated origin is `https://app.vase.ar`.
- The shared cookie domain remains `.vase.ar`.
- Trusted origins include `https://vase.ar`, `https://app.vase.ar`, and
  `https://business.vase.ar`.
- Existing password hashes and user identities remain unchanged.
- Authentication callbacks and absolute URLs use `app.vase.ar`.

### Business SSO

The Business launcher remains part of Vase App:

```text
https://app.vase.ar/app/business/launch
```

It issues the existing short-lived Business SSO token and redirects to:

```text
https://business.vase.ar/admin/evolution
```

The SSO issuer and audience remain stable. The SSO secret must match in
`vase-app-next` and the Business service without being stored in the repository.

Business frontend variables that link back to Vase must use `app.vase.ar` for
login, registration, and launch URLs.

## Data Flow

1. A visitor enters the public Portal at `vase.ar`.
2. Sign-in and registration links send the visitor to `app.vase.ar`.
3. Vase App authenticates the user against the current MySQL data.
4. Vase App resolves the active tenant and membership.
5. Selecting Business calls `/app/business/launch`.
6. The launcher signs a short-lived token and redirects to
   `business.vase.ar`.
7. Business validates the token and opens the tenant editor.

## Failure Handling

- Database connectivity failures make the readiness endpoint fail and must not
  be reported as a healthy deployment.
- Missing SSO configuration returns an explicit service error instead of
  redirecting with an invalid token.
- Invalid or missing sessions return users to the `app.vase.ar` sign-in flow.
- Users without an eligible Business membership return to Vase App with a
  forbidden state.
- The existing `vase.ar` service remains available as the rollback path until
  all acceptance checks pass.

## Validation

### Automated validation

- Workspace typecheck passes.
- Production build for `@vase/app` passes.
- Docker image builds from the repository root.
- Existing application tests migrated from `main` pass.
- Tests cover authentication redirects and the Business launcher.

### Deployment smoke tests

- `https://app.vase.ar/api/health/live` returns success.
- `https://app.vase.ar/api/health/ready` confirms database readiness.
- Existing users can sign in without resetting passwords.
- Existing tenants and memberships appear correctly.
- Registration creates records in the existing database.
- `https://app.vase.ar/app/business/launch` redirects an eligible user to
  `https://business.vase.ar/admin/evolution`.
- Logout and cookie behavior work across the official Vase subdomains.

## Cutover Criteria

The first stage is complete only when:

- the new service has passed all automated and smoke tests;
- existing users and tenant data are verified;
- Business SSO works end to end;
- no production route still requires `vase.ar` as the authenticated origin;
- rollback to the old service has been documented and tested.

After those conditions pass, `apps/vase-portal` can be deployed at `vase.ar`.
The old root application can then be retired in a separate controlled cutover.

## Security

- Production secrets remain only in EasyPanel.
- Credentials previously exposed in chat or deployment logs must be rotated.
- Migration scripts default to dry-run and require explicit confirmation before
  modifying production data.
- Deployment logs must not print secret values or signed SSO tokens.
