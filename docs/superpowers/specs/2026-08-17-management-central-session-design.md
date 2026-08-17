# Vase Management Central Session Design

## Status

Approved design. This document defines how `vase-management` will adopt the same central identity and shared-session model used by Vase Labs.

## Problem

`vase-management` currently exposes its own credentials form and checks passwords in its PostgreSQL `User` table. A user who is already authenticated in `app.vase.ar` can therefore be rejected by Management because the two applications do not share password records. The existing ticket-based Management SSO also creates a second local Auth.js session and makes direct `/auth/login` access look like a supported path.

The intended product behavior is one Vase account, one password, and one browser session across Vase App, Labs, and Management. Management must still own its operational PostgreSQL data and remain independently deployable.

## Goals

- Make `vase-app` the only source of truth for user authentication, tenant membership, and Management entitlement.
- Let `management.vase.ar` consume the shared Vase session cookie directly, following the Labs pattern.
- Remove local email/password login as a user-facing Management authentication path.
- Preserve the separate Management PostgreSQL database for companies, products, warehouse data, sales, and other ERP records.
- Link operational records to the central identity through `globalUserId` and `globalTenantId`.
- Keep authorization tenant-scoped and fail closed when context cannot be verified.

## Non-goals

- Merging the MySQL schema used by `vase-app` with the PostgreSQL schema used by Management.
- Moving Management operational tables into `vase-app`.
- Sharing Prisma clients or running cross-database joins.
- Supporting Management-owned passwords for centrally provisioned users.
- Changing Labs or Business authentication behavior as part of this work.

## Chosen Architecture

Management will use the Labs shared-session pattern.

1. The user authenticates only at `app.vase.ar`.
2. Vase App writes the Auth.js session cookie for the shared `.vase.ar` domain.
3. A request reaches `management.vase.ar` with that cookie.
4. Management decodes and validates the cookie using the same `AUTH_SECRET` and cookie-name rules from `@vase/auth`.
5. Management calls a protected Vase App endpoint to resolve current user, tenant, role, and Management entitlement.
6. Management upserts local identity and company projections using the returned global identifiers.
7. The request proceeds with a tenant-scoped Management context.

The browser cookie establishes identity. The server-to-server context request establishes current authorization. Management does not trust tenant IDs, roles, or module access supplied by the browser.

## Components

### Shared session reader

Management will add a small server-only session reader equivalent to `apps/vase-labs/app/lib/shared-session.ts`. It will:

- read the shared or local Auth.js cookie name through `@vase/auth`;
- decode the encrypted JWT with `AUTH_SECRET`;
- require a subject (`sub`);
- reject expired sessions using `sessionExpiresAt`;
- return only the central user ID, email, and expiry needed for context resolution.

No Prisma access or Management password verification belongs in this component.

### Management session-context contract

`@vase/contracts` will define a strict response schema containing:

- `globalUserId`;
- user display name and verified email;
- `globalTenantId`, tenant slug, and tenant name;
- tenant role;
- Management module status;
- effective Management role;
- a stable authorization version or timestamp suitable for diagnostics.

The contract must not include password hashes, session tokens, secrets, or unrelated tenant data.

### Vase App context endpoint

Vase App will expose `GET /api/internal/management/session-context`.

The endpoint will:

- require `SERVICE_TO_SERVICE_TOKEN`;
- accept the central `userId` and an optional requested tenant slug;
- resolve an active membership using Vase App data;
- reject suspended tenants;
- require an active `vase_management` tenant module;
- reject an explicitly disabled `UserModuleAccess` or `ManagementIdentityLink`;
- map the tenant role to the effective Management role;
- return the strict contract payload.

The endpoint is the authorization source of truth. Management will not infer access from the existence of a local user or company.

### Management context resolver

Management will add a request-context service equivalent in purpose to Labs `resolveLabsRequestContext`.

It will:

- validate the shared cookie;
- request authoritative context from Vase App using `APP_INTERNAL_URL` and `SERVICE_TO_SERVICE_TOKEN`;
- upsert the local company by `globalTenantId`;
- upsert the local user by `globalUserId`;
- maintain the local `CompanyUser` relation and mapped role;
- return a typed context used by dashboard layouts, route handlers, and server actions.

Provisioned central users will have no usable local password. Existing local-only users are not automatically deleted, but the public credentials path will no longer authenticate them.

### Route protection

Management route protection will stop creating a separate NextAuth session. Protected pages and APIs will resolve the central context server-side.

- Unauthenticated page requests redirect to `https://app.vase.ar/signin` with an absolute, allowlisted return URL to Management.
- Unauthorized or unentitled users redirect to `https://app.vase.ar/app?management=required`.
- API requests return structured `401`, `403`, or `503` JSON and never HTML redirects.
- Internal health and service endpoints retain their service-token rules and are excluded from browser-session middleware.

The legacy `/auth/login` route will redirect to the central sign-in flow. The legacy `/auth/sso` ticket route and credentials provider can be removed after the shared-session path is deployed and verified.

## Data Ownership

Vase App owns:

- password hashes and authentication state;
- email verification;
- users and platform roles;
- tenants and memberships;
- product/module entitlement;
- user-level Management access.

Management owns:

- operational companies and local ERP roles;
- products, stock, sales, purchases, invoices, treasury, and reports;
- Warehouse AI sectors, products, devices, commands, and conversation logs;
- local projections required to relate operational rows to the central identity.

Identity links are explicit:

- `Management.User.globalUserId -> VaseApp.User.id`;
- `Management.Company.globalTenantId -> VaseApp.Tenant.id`.

These references are application-level identifiers, not database foreign keys across services.

## Environment Contract

Vase App and Management must share:

- `AUTH_SECRET`, so Management can decode the shared Auth.js cookie;
- `SERVICE_TO_SERVICE_TOKEN`, for the context endpoint.

Management additionally requires:

- `APP_INTERNAL_URL`, pointing to the internal Vase App service or `https://app.vase.ar`;
- `NEXT_PUBLIC_APP_URL=https://management.vase.ar` for its own public URL;
- `VASE_APP_PUBLIC_URL=https://app.vase.ar` for central-login redirects.

`NEXTAUTH_URL` and `MANAGEMENT_SSO_SECRET` become legacy during migration and are removed only after ticket SSO is no longer needed.

Production configuration must never use localhost origins.

## Error Handling

- Missing cookie: `MANAGEMENT_SESSION_REQUIRED`.
- Invalid cookie: `MANAGEMENT_SESSION_INVALID`.
- Expired cookie: `MANAGEMENT_SESSION_EXPIRED`.
- Missing shared secret: `MANAGEMENT_AUTH_SECRET_MISSING`.
- Missing service token: `SERVICE_TOKEN_NOT_CONFIGURED`.
- Unreachable Vase App: `MANAGEMENT_CONTEXT_UNAVAILABLE` with a `503` response.
- Missing or inactive membership: `MANAGEMENT_TENANT_FORBIDDEN`.
- Suspended tenant: `MANAGEMENT_TENANT_SUSPENDED`.
- Inactive module or user access: `MANAGEMENT_NOT_ENTITLED`.

Logs may include error codes, request IDs, and global identifiers, but never cookies, JWTs, passwords, or service tokens.

## Migration and Rollout

1. Add the shared contract and Vase App context endpoint without removing ticket SSO.
2. Add Management shared-session and context-resolution services with focused tests.
3. Switch Management dashboard and APIs to the central context.
4. Change `/auth/login` into a central-login redirect and remove demo credentials from the UI.
5. Deploy Vase App with correct shared cookie, `AUTH_SECRET`, and service-token configuration.
6. Deploy Management with the same `AUTH_SECRET` and service token.
7. Verify an existing Vase user can open Management without re-entering credentials.
8. Verify a disabled or unentitled user is rejected.
9. Remove ticket SSO, Management Credentials provider, and obsolete nonce storage after production verification.

The migration is additive until step 9, which keeps rollback possible while the shared-session flow is validated.

## Testing

Focused automated coverage will include:

- decoding a valid shared cookie;
- rejecting missing, invalid, and expired cookies;
- rejecting a mismatched `AUTH_SECRET`;
- authorizing the internal context endpoint with the service token;
- resolving the correct tenant and role;
- rejecting suspended tenants and inactive Management entitlements;
- provisioning idempotently by `globalUserId` and `globalTenantId`;
- preventing cross-tenant company access;
- redirecting `/auth/login` to Vase App without an open redirect;
- returning JSON errors for protected APIs;
- preserving service-token access to internal endpoints.

Production verification must confirm that `management.vase.ar` receives the shared cookie, opens without a second login, and returns to `app.vase.ar` when the central session expires.

## Success Criteria

- A user authenticated in Vase App opens Management without entering credentials again.
- The same central account and tenant determine access in App, Labs, and Management.
- Changing or disabling access in Vase App takes effect in Management on the next request.
- Management contains no user-facing local password flow.
- Operational Management and Warehouse AI data remain isolated in the Management PostgreSQL database.
