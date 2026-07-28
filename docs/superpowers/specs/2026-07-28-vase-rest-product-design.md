# Vase Rest Product Design

## Summary

Vase Rest will replace the untracked prototype in `apps/vase-rest` with a production-grade Vase product for restaurants. It will preserve the useful workflows of the current `noctua` frontend and `backend-reservas` backend while replacing their architecture, visual language, mock behavior, insecure authorization, and Supabase dependency.

The product will be a separately deployable module:

- Product name: Vase Rest
- Module key: `rest`
- Service key: `vase-rest`
- Workspace: `apps/vase-rest`
- Package: `@vase/rest`
- Public domain: `rest.vase.ar`
- Cloud database: dedicated PostgreSQL service `postgres-rest`
- Local continuity service: `services/vase-rest-edge`

Vase Rest is multi-tenant and multi-branch. Every active customer receives the complete feature set; Starter, Growth, Pro, and Enterprise differ only in capacity. Pricing and capacity versions are governed from Vase Admin and commercial contracts remain owned by Vase App.

## Goals and Boundaries

### Goals

- Deliver a complete restaurant operations product with no mock authentication, data, payments, fiscal documents, provider responses, or fallback orders.
- Follow the existing Vase V3 product, identity, deployment, security, and design conventions.
- Isolate every tenant and branch in server-side authorization and persistence.
- Support restaurant staff without requiring global Vase accounts.
- Keep branch operations synchronized over the local network during an Internet outage and reconcile safely afterward.
- Support real fiscal, payment, delivery, and printing integrations with visible operational health.
- Make all modules independently testable through explicit service and repository boundaries.

### Boundaries

- Vase App remains the owner of global users, tenants, billing, subscriptions, and entitlements.
- Vase Admin owns plan publishing, operational oversight, and cross-product governance; it never reads `postgres-rest` directly.
- Vase Workplace owns support tickets and human escalation.
- Vase Rest owns restaurant-specific staff, branches, devices, catalogs, operations, integrations, and audit records.
- Vase Management remains a separate ERP. Shared capabilities communicate through contracts or internal APIs, not database access.
- No Supabase data migration is required because the prototype contains no production data that must be preserved.
- The current arbitrary theme editor is removed. Tenants may configure restaurant identity, receipt details, and operational settings without replacing the Vase design system.
- Provider certification and production credentials are external launch dependencies. A connector is never shown as active before official verification.

## Architecture

### Vase Rest Cloud

`apps/vase-rest` is a Next.js 16.2.1 App Router application using React 19, strict TypeScript, Tailwind CSS 4, Prisma 6, Zod, and PostgreSQL.

- Server Components read through server-only services and repositories.
- Client Components are limited to interactive workstations and never hold database credentials.
- Route Handlers and Server Actions validate all input and re-check authentication, tenant, branch, role, device, and entitlement.
- PostgreSQL transactions protect order, stock, cash, payment, and fiscal state transitions.
- External webhooks validate provider signatures, timestamps, replay windows, and idempotency keys before any mutation.
- Cloud exposes `GET /api/health/live`, `GET /api/health/ready`, and token-protected `GET /api/internal/admin/health`.

The existing `noctua` and `backend-reservas` directories are migration sources only. They are not retained as active applications, and the browser-facing Supabase client and Express backend are removed.

### Vase Rest Edge

`services/vase-rest-edge` is a Node.js/TypeScript Windows service installed once per branch. It uses SQLite in WAL mode as a private operational store and durable outbox. Cloud PostgreSQL remains the consolidated source of truth.

Edge responsibilities:

- Serve authenticated branch devices over the local network.
- Maintain PIN sessions, tables, orders, kitchen tickets, cash state, printing, and a durable event log during WAN outages.
- Replicate idempotent events to cloud and apply signed configuration deltas after reconnection.
- Expose local health, version, printer, queue, and synchronization status.
- Continue local operation if an update fails, while reporting the rejected version.

The Windows installer is signed and runs Edge as a service. Updates use signed artifacts, gradual rollout, transactional migrations, health verification, and rollback. Each installation has a rotatable device certificate and is paired using a one-time enrollment code.

### Cloud/Edge Authority and Synchronization

- Branch workstations use their paired Edge whenever it is reachable.
- Edge is authoritative for in-branch operational commands while connected locally.
- Cloud is authoritative for identity, entitlements, consolidated reporting, integrations, and versioned configuration.
- Every operational event contains an immutable event ID, tenant, branch, actor, device, aggregate version, timestamp assigned by Edge, and idempotency key.
- Cloud acknowledges events individually. Retried events produce the original result and never duplicate orders, payments, stock movements, fiscal documents, or print jobs.
- Configuration uses monotonic revisions. Edge applies deltas in order and requests a signed snapshot if revisions diverge.
- Financial and inventory conflicts are resolved through domain versions and commands, never last-write-wins timestamps.
- Remote owners see the last synchronized time and a stale-data warning while a branch is offline.

Two disconnected branches cannot know each other's live consumption from a shared warehouse. Each shared warehouse therefore assigns an offline allocation and safety stock to each branch. Edge may consume only its branch allocation while offline. When the allocation is exhausted, affected products become unavailable until synchronization or an authorized allocation change. Reconciliation never silently creates negative stock.

## Identity, Roles, and Authorization

### Global Owners

Owners and global tenant administrators enter through the shared Vase session. Vase Rest resolves their current tenant, membership, role, and Rest entitlement from Vase App through a token-protected internal API. It does not query the Vase App database.

### Local Restaurant Staff

Operational staff are Vase Rest identities and do not require email or global Vase accounts.

- An owner or manager creates an employee and branch assignments.
- An employee may hold different roles at different branches.
- A paired device presents a fast login using employee code and individual PIN.
- PINs are stored with a memory-hard password hash, never reversibly encrypted.
- Rate limits, lockouts, session expiry, shift closure, remote revocation, and device revocation apply in cloud and Edge.
- Offline Edge keeps only the minimum signed staff and permission projection needed for its branch.
- A local employee may optionally be linked to a global Vase user later, but linking is not required and does not consume a global seat by default.

Initial roles:

- Owner
- Manager
- Cashier
- Waiter
- Kitchen
- Stock
- Delivery

Permissions are capability-based and checked server-side. Sensitive actions such as refunds, voids, cash closure, fiscal configuration, credential changes, permission changes, and manual stock adjustments require explicit capabilities and immutable audit entries.

## Multi-Branch Configuration and Data Model

Every cloud-owned record includes `globalTenantId`. Operational records also include `branchId`. Tenant and branch IDs come from authenticated context and are never trusted from a client payload.

Configuration families can be scoped to the tenant, a branch group, or an individual branch:

- Catalog and categories
- Recipes and modifiers
- Price lists
- Promotions
- Warehouses and inventory policies
- Fiscal identities and points of sale
- Payment providers
- Delivery providers
- Devices, stations, and printers

The effective value is resolved from the closest explicit scope. Branch overrides retain their source revision and can be reset to inherited configuration. Scope changes show an impact preview and require confirmation before publishing.

Tables, floor plans, reservations, shifts, cash drawers, and kitchen execution always belong to one branch. A warehouse may supply multiple branches, and employees may be assigned to multiple branches.

Core aggregate families:

- Tenant contract, plan projection, branch, branch group, and scoped policy
- Local employee, branch role, device, Edge enrollment, session, and shift
- Floor, zone, table, reservation, and guest
- Category, menu item, modifier group, recipe, ingredient, warehouse, stock lot, movement, waste, and allocation
- Order, order item, course, kitchen ticket, station, and fulfillment
- Promotion, price list, and branch override
- Cash drawer, cash movement, payment, refund, customer account, and reconciliation
- Fiscal identity, point of sale, fiscal document, CAE response, and receipt
- Provider connection, webhook delivery, delivery order, and integration event
- Printer, routing rule, print job, and attempt
- Audit event and operational alert

## Functional Modules

### Operations

- Role-specific home with live metrics, alerts, and sync status
- Visual floor plan by floor and zone
- Table opening, transfer, merge, split, guest count, timers, and status
- Reservations with conflict detection, table assignment, confirmation, cancellation, and history
- Orders with modifiers, notes, courses, split/merge, voids, and complete audit
- KDS workstations per station with preparation timing, priority, recall, and completion

### Catalog and Inventory

- Categories, products, variants, modifiers, recipes, and availability
- Tenant, group, and branch-specific price lists
- Warehouses shared or isolated by owner-defined policy
- Stock lots, movements, consumption from recipes, waste, manual adjustments, thresholds, and history
- Promotions by date, schedule, branch, product, customer condition, and payment method

### Cash, Payments, and Fiscal Documents

- Cash shifts, opening float, movements, reconciliation, closure, variance, and audit
- Manual recording of cash, bank transfer, external card terminal, external wallet, and customer account payments
- Mercado Pago OAuth, Point, and QR operations with provider IDs, signed webhooks, idempotency, cancellation, refund, and reconciliation
- ARCA WSAA/WSFEv1 integration with encrypted certificate/key, CUIT, environment, point of sale, invoice authorization, CAE, expiration, QR, and error history
- Fiscal documents are marked issued only after a valid ARCA authorization
- Invoices A, B, and C plus their corresponding credit and debit notes
- Customer accounts with payments, adjustments, reversals, balance, and export

### Delivery

Adapters are implemented against each provider's official contract:

- PedidosYa
- Rappi
- Glovo
- Uber Eats

Each connection supports the provider-approved authentication flow, merchant/store selection, webhook receipt, order retrieval, acceptance/rejection, preparation updates, cancellation, and reconciliation. Credentials or OAuth grants are configured by the tenant or branch from Settings and stored encrypted.

Connection states are explicit: unconfigured, validating, sandbox, pending approval, active, degraded, revoked, or certification required. There is no local-order fallback when a provider request fails.

### Printing and Support

- Edge controls ESC/POS printers over USB or network
- Stations route categories to kitchen, bar, cashier, or custom destinations
- Print jobs are durable, idempotent, retried with bounded backoff, and visibly failed if unconfirmed
- KDS remains authoritative for kitchen progress if a printer fails
- Support requests are sent to Vase Workplace over a signed internal API with tenant, branch, actor, diagnostic IDs, and user-provided context

## Product Experience

Vase Rest uses a dark operational direction:

- Carbon and graphite foundations
- Jade primary actions
- Sage and semantic status colors
- Manrope for interface and headings
- IBM Plex Mono for order numbers, amounts, times, CAE, and technical metadata
- Controlled glass surfaces, strong hierarchy, restrained motion, and no purple SaaS styling
- AA contrast, visible focus, reduced-motion support, and touch-friendly targets

Role-specific entry points:

- Owner/Manager: consolidated health, branches, alerts, analytics, and settings
- Waiter: assigned floor, tables, orders, and reservations
- Kitchen: full-screen KDS for assigned stations
- Cashier: cash, payments, fiscal documents, and customer accounts
- Stock: inventory, recipes, movements, and alerts
- Delivery: external orders, status, and reconciliation

Owner onboarding is a verifiable sequence:

1. Business and fiscal identity
2. Branches and branch groups
3. Configuration scope policies
4. Staff and roles
5. Edge installation and device pairing
6. Stations and printer tests
7. Catalog, recipes, prices, and stock
8. ARCA homologation
9. Mercado Pago and manual payment methods
10. Delivery provider onboarding

Tenant customization is limited to restaurant name, logo, fiscal identity, receipt content, and operational settings. Vase tokens, typography, accessibility, and interaction patterns remain governed by the shared design system.

## Plans, Billing, and Activation

All plans include every functional module.

| Plan | Branches | Local employees | Devices | Edge installations |
| --- | ---: | ---: | ---: | ---: |
| Starter | 1 | 15 | 5 | 1 |
| Growth | 3 | 60 | 20 | 3 |
| Pro | 10 | 250 | 75 | 10 |
| Enterprise | Contract value | Contract value | Contract value | Contract value |

Vase Admin owns draft and published plan versions, currency, monthly price, limits, and effective dates. A plan cannot be published without all required price and limit values. No price is hardcoded in Vase Rest.

Vase App owns the accepted commercial contract. Published changes apply to new contracts; existing contracts retain their agreed version until an explicit commercial migration. Vase Rest consumes only a signed entitlement projection.

Reaching a plan limit blocks creation of additional branches, employees, devices, or Edge enrollments. It never interrupts an open shift, active order, fiscal flow, existing branch, or offline Edge. Downgrades require the tenant to reduce usage before the new plan can become effective.

Activation flow:

1. The owner selects Vase Rest in the Vase App marketplace.
2. Vase App creates the Rest tenant contract and entitlement projection.
3. The launcher directs the authenticated owner to `rest.vase.ar/onboarding`.
4. Vase Rest resolves the shared session and provisions its local tenant context idempotently.
5. Local employees remain entirely within Vase Rest.

## Security and Operations

- AES-256-GCM protects provider credentials, fiscal certificate material, and private integration settings with versioned, rotatable platform keys.
- Secrets are never returned after submission; APIs expose only redacted configuration state.
- Service-to-service routes require `SERVICE_TO_SERVICE_TOKEN` and validated Zod contracts.
- Edge enrollment and sync use per-installation certificates, signed payloads, nonce/replay protection, and revocation.
- Rate limits protect PIN login, enrollment, provider verification, fiscal requests, payment mutations, and expensive exports.
- Logs are structured and exclude PINs, payment credentials, private certificates, and direct personal contact/payment identifiers.
- Audit records capture actor, tenant, branch, device, action, aggregate, before/after metadata where safe, request ID, and event ID.
- PostgreSQL backups, point-in-time recovery policy, and restore drills are required before general availability.
- EasyPanel deploys Vase Rest independently with Docker and Prisma migrations against `postgres-rest`.
- Health and observability cover cloud readiness, database, event lag, webhook failures, ARCA, payments, delivery, Edge heartbeat, print queue, and installed version.

## Error Handling

- Domain services return stable error codes and human-readable Spanish messages.
- Retriable provider failures remain pending with bounded backoff and visible status.
- Non-retriable failures require an authorized operator decision.
- Duplicate webhooks and Edge events return the prior successful result.
- Payment ambiguity is reconciled with the provider before allowing another charge.
- Fiscal ambiguity queries ARCA for the last authorized number before retrying.
- Printer failures never mark a job successful and never hide the associated KDS ticket.
- Offline configuration changes are queued with revisions; conflicting owner changes produce an impact resolution screen rather than silent overwrite.
- Stale cloud views show their last synchronization time.

## Verification and Acceptance

### Automated tests

- Unit tests for permissions, scope inheritance, plan limits, recipes, stock, promotions, cash, payments, fiscal state machines, printing, and conflict policies
- PostgreSQL integration tests for transactional domain operations and tenant isolation
- SQLite Edge integration tests for event log, outbox, sessions, printing, migrations, and crash recovery
- Contract tests for App, Admin, Workplace, Edge, ARCA, Mercado Pago, and each delivery adapter
- E2E browser tests for every role, onboarding, branch switching, and settings
- Security tests that tamper with tenant IDs, branch IDs, headers, cookies, event versions, webhook signatures, and device credentials
- Accessibility and responsive tests for desktop, tablet, touch KDS, and reduced motion
- Load tests for representative peak order, KDS, webhook, and synchronization traffic

### Required scenarios

- Two tenants with identical local IDs cannot see or mutate each other's data
- One employee has different roles at two branches and receives the correct capabilities after switching
- Multiple LAN devices keep tables, orders, KDS, cash, and print queues synchronized while WAN is disconnected
- Reconnection uploads each event exactly once and produces the same consolidated totals
- Shared warehouse offline allocations prevent overselling and reconcile correctly
- Edge process, device, and printer restarts do not lose accepted commands or print jobs
- ARCA homologation and production issue verifiable CAE-backed documents
- Mercado Pago sandbox and production complete Point and QR payments, repeated webhooks, cancellation, refund, and reconciliation
- Each delivery sandbox completes receive, accept/reject, update, and cancel flows
- Backup restoration and Edge update rollback preserve operation and audit history

## Rollout

1. Homologation: all automated suites pass; ARCA, Mercado Pago, printers, Edge outage, and provider sandboxes are certified.
2. Pilot: one real branch runs parallel operational checks with alerting, backup restore, and Edge rollback drills.
3. General availability: pricing is published in Vase Admin, provider production approvals are recorded, operational runbooks are complete, and no mock or fallback path is reachable.

Provider approvals, official private API contracts, sandbox accounts, production credentials, ARCA certificates, signing certificates for the Windows installer, and representative ESC/POS hardware are required inputs. Missing external approval keeps only that connector in `pending approval` and blocks general availability certification for the connector; it never activates simulated behavior.
