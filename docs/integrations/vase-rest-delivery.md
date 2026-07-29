# Vase Rest delivery integrations

## Runtime policy

Vase Rest stores delivery credentials encrypted per tenant, branch, provider, and
environment. Saving credentials creates a `PENDING_APPROVAL` connection; it does
not activate an adapter.

A provider can enter `ACTIVE` only after all of the following evidence exists:

1. A partner contract granted directly to Vase.
2. Official API documentation and authentication scopes for the enabled market.
3. A provider-issued sandbox or certification environment.
4. Contract tests built from redacted official fixtures.
5. Provider confirmation that webhook verification, retry, cancellation, and
   status-transition behavior passed certification.
6. A recorded production approval date, API version, enabled markets, scopes,
   and escalation contact.

The production adapter registry returns no adapter when this evidence is absent.
Webhook and operator calls then fail with
`REST_DELIVERY_CERTIFICATION_REQUIRED`; no sample order or fallback provider is
used.

## Current certification ledger

| Provider | Runtime state | Contract | Sandbox | Adapter | Production |
| --- | --- | --- | --- | --- | --- |
| PedidosYa | `PENDING_APPROVAL` | Not supplied | Not supplied | Not installed | Blocked |
| Rappi | `PENDING_APPROVAL` | Not supplied | Not supplied | Not installed | Blocked |
| Glovo | `PENDING_APPROVAL` | Not supplied | Not supplied | Not installed | Blocked |
| Uber Eats | `PENDING_APPROVAL` | Not supplied | Not supplied | Not installed | Blocked |

This ledger must be updated with real evidence before an adapter is added. A
user-entered client ID, secret, store ID, or webhook secret is configuration
input only and is not certification evidence.
