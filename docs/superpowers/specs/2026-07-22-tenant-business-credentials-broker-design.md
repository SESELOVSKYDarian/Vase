# Tenant-aware Business credentials broker

## Goal

Allow Vase Labs to add an external-management knowledge source by reusing the
product-sync connection that the authenticated tenant already has in Vase
Business. Labs must not select a tenant from browser input, depend directly on
a Business API URL, or create credentials as a side effect of opening the
knowledge modal.

## Current problem

The Labs credential route resolves the authenticated `globalTenantId`, but then
calls Business directly through `TEFLON_API_URL`. That deployment variable is
not part of the Labs runtime contract. The Business handler also calls
`ensureProductSyncToken`, so a read can create a credential instead of reporting
the actual connection state. These two behaviors turn missing configuration or
a missing tenant credential into the same `502` shown by the modal.

## Architecture

Vase App will be the internal broker between Labs and Business. Labs already
uses Vase App as the authenticated platform context boundary through
`APP_INTERNAL_URL`; it will use the same service boundary for this lookup.

The request flow is:

1. Labs resolves the session and obtains `globalTenantId` server-side.
2. Labs calls a service-token-protected Vase App endpoint with that tenant ID.
3. Vase App validates that the tenant exists and proxies the lookup to the
   Business service using its existing Business service configuration.
4. Business looks up the latest existing `api_tokens` record for the tenant
   whose scope is `products:sync` or `*`.
5. Business returns a narrow credential response when found, or a typed
   not-connected response when absent.
6. Vase App and Labs preserve the typed outcome without exposing upstream
   errors or secrets.

The browser never supplies `globalTenantId`, Business location, or credential
values. Each server derives or validates tenant scope at its own boundary.

## Components and contracts

### Business

The internal product-sync credential endpoint will become read-only. It will
use an exported lookup helper rather than `ensureProductSyncToken`.

- Existing token: HTTP `200` with only `domain`, `tenantUuid`, and
  `consumerKey`.
- No token: HTTP `404` with `{ error: "EXTERNAL_MANAGEMENT_NOT_CONNECTED" }`.
- It will never insert, rotate, or delete an API token.
- Exact service-token authentication remains required.

The existing Business UI endpoint may continue using
`ensureProductSyncToken`; only the Labs-facing internal read changes.

### Vase App broker

A new internal endpoint will require `SERVICE_TO_SERVICE_TOKEN`, validate the
requested global tenant against the platform database, and call Business using
the Business address already owned by Vase App. It will forward only the narrow
success contract or the typed not-connected state. Authorization failures,
invalid responses, and unavailable upstreams will be sanitized.

### Labs

The Labs route will call the Vase App broker through `APP_INTERNAL_URL`; it will
no longer read `TEFLON_API_URL`. It will continue deriving the tenant solely
from `resolveLabsRequestContext` and will validate that a successful response
matches that tenant.

The route will map the broker's not-connected result to a typed client response,
separate from configuration, authorization, availability, and invalid-response
failures.

### Modal

The modal will display:

> No hay un sistema externo conectado en Vase Business.

for `EXTERNAL_MANAGEMENT_NOT_CONNECTED`. The add button will remain disabled
because there are no credentials to associate with the knowledge source.

## Error handling

- Missing credential is an expected `404`, not a `502`.
- Invalid or expired Labs sessions remain `401`; forbidden tenant access
  remains `403`.
- Service authentication mismatch and unavailable dependencies remain
  sanitized server errors.
- No response may include service tokens, consumer secrets, upstream bodies,
  stack traces, or credentials belonging to another tenant.
- The Cloudflare `ERR_BLOCKED_BY_CLIENT` console message is unrelated browser
  extension noise and is outside this change.

## Testing

Regression tests will prove that:

- Business returns an existing tenant token without inserting anything.
- Business returns the typed not-connected response when no token exists.
- Vase App rejects unauthenticated broker calls and unknown tenants.
- The broker preserves tenant scope and allowlists its response.
- Labs ignores tenant IDs supplied by the browser and uses the resolved tenant.
- Labs no longer depends on `TEFLON_API_URL`.
- The modal maps the typed absence to the approved Spanish message.
- Existing credential creation in the Business administration flow still
  works.

Focused tests, affected workspace typechecks, the Labs production build, and
diff checks will run before completion.

## Deployment

Labs needs no new Business URL. Vase App remains responsible for its Business
service address, and all three services must share the intended
`SERVICE_TO_SERVICE_TOKEN`. No database is shared across service boundaries.
