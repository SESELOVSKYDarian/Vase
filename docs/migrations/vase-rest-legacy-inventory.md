# Vase Rest legacy prototype inventory

Date: 2026-07-28
Source snapshot: `apps/vase-rest` before the Vase V3 migration

## Preservation status

The legacy source is preserved as a migration reference. It is not production-ready,
is excluded from the compiled workspace, and is protected by
`tests/v3-rest-no-legacy-runtime.test.ts`. No production route imports it.

The snapshot contains 283 files (about 1.6 MB excluding generated dependency/build directories) in four roots:

- `noctua/`: Next.js 16.2.6 and React 19 client application.
- `backend-reservas/`: Express API with direct Supabase access and a legacy SQLite Prisma history.
- `supabase/`: manual SQL additions.
- `Proyecto-Restaurante/`: early static/reference implementation.

No committed `.env` file or credential value was found. Only environment variable references and `.env.example` placeholders are present. The Rest ignore rules now exclude local databases, WAL files, certificates, device enrollment material, private provider fixtures, and generated installers.

## User-facing routes

### Operations

- Login and dashboard overview.
- Salon floor, tables, gestures, merge/split behavior, diners, timers, and waiter alerts.
- Order capture and order history.
- Kitchen display.
- Reservations.
- Dishes, categories, ingredients, recipes, and stock.
- Promotions.
- Invoices, checkout, cash movements, current accounts, and exports.
- Delivery provider overview and provider-specific pages.
- Analytics and support.
- User administration.

### Legacy super admin

- Kitchen, tables, waiters, stock, delivery, design, and general configuration.
- A separate PIN login and browser-local settings.

The production replacement moves platform-owned settings, plans, limits, health, and release controls to `vase-admin`. Restaurant configuration remains in the Rest owner application and is tenant-scoped.

## Client state and services

The prototype uses Zustand stores for authentication, delivery, dishes, tables, waiters, notifications, orders, promotions, stock, and super-admin settings. Several stores persist operational or configuration state in `localStorage`.

Client services cover analytics, users, support, dishes, ingredients, stock, tables, orders, kitchen, promotions, invoices, current diners, table merging, and delivery adapters. Data access is inconsistent: some paths call Supabase directly from the browser, some call the Express API, and others only mutate local or mock state.

Production ownership:

| Legacy concern | Production owner |
| --- | --- |
| Browser Supabase queries/realtime | Rest server domain services and authenticated event transport |
| Zustand/localStorage operational state | Server state plus Edge SQLite WAL/outbox |
| `backend-reservas` Express controllers | Rest Next.js route handlers calling server-only services |
| Supabase Auth | Vase SSO for owners; Rest staff identity and PIN sessions for workers |
| Global `superadm` screens | Vase Admin for platform controls; Rest settings for tenant controls |
| Provider adapters | Server-only official provider connectors with encrypted credentials |
| Fiscal/cash logic | Transactional PostgreSQL services, audited commands, real ARCA integration |

## API surface

The Express backend exposes routes for:

- Tables: list, status, availability, create, and delete.
- Reservations: create, list, detail, and cancel.
- Products and categories: CRUD and availability.
- Orders: open, list/detail, add products, update diners/status, close, cancel, and delete.
- Billing: ARCA check, ready orders, checkout, internal non-fiscal payments, cash confirmation, invoices, cash movements, current accounts, adjustments, reversals, and Excel exports.
- Users: list.

The Next.js prototype also contains handlers for administration analytics/users/waiters, support, and Glovo/Rappi/Uber Eats webhooks.

## Legacy database inventory

The Supabase-oriented schema/documentation references:

- `usuarios`, `profiles`, and `mozos`
- `mesas` and `reservas`
- `categorias`, `productos`, `ingredientes`, and `producto_ingredientes`
- `pedidos` and `pedido_items`
- `movimientos_stock`
- `pagos`, `facturas`, and `movimientos_caja`
- `clientes`, `cuentas_corrientes`, `pagos_cuenta_corriente`, and `movimientos_cuenta_corriente`
- `tickets_soporte`

The old Prisma migration history separately models SQLite tables `Mesa`, `Reserva`, `Producto`, `Pedido`, `DetallePedido`, and `Factura`. These histories are references only; they are not a migration source for the new database.

The production tables are implemented in the dedicated PostgreSQL Rest schema with
explicit tenant and branch ownership, tenant-scoped uniqueness, audit fields,
idempotency, and sync metadata where required. There is no Supabase runtime or data
import requirement.

## Unsafe or simulated behavior that must not survive migration

- Dashboard login accepts the hard-coded credentials `admin` / `1234`, writes an unsigned JSON cookie, and trusts a client-controlled `isAuthenticated` flag.
- Super-admin authentication defaults to PIN `123456`, logs the received and expected PIN, and stores the literal session value `valid`.
- Restaurant staff have no tenant/branch-scoped identity, device pairing, rate limiting, lockout, or revocation model.
- Stock and dish stores fall back to mock data when the backend is empty or unavailable.
- Legacy order hooks use an in-memory mock order array.
- Table, order, and stock services contain unimplemented Supabase TODO paths.
- ARCA returns random simulated CAE and receipt numbers.
- Uber Eats authentication returns `mocked_uber_eats_token`; Uber Eats and Glovo status/payload paths contain unimplemented API calls.
- Delivery configuration can be browser-local and is not an encrypted, audited server configuration.
- The code mixes direct browser database access, RLS assumptions, Express service-role access, and local persistence.
- There is no offline command log, deterministic conflict policy, shared-warehouse allocation, per-branch continuity service, or durable printer queue.
- Fiscal, payment, and provider actions do not consistently enforce transactional idempotency.

No simulated success or fallback data is allowed in the production module. Missing provider approval or credentials must produce an explicit inactive/pending configuration state.

## Production migration boundaries

The legacy trees remain read-only reference material until their corresponding production acceptance tests pass. New implementation code must live in the V3 Rest workspace and use:

- Next.js 16.2.12, React 19, TypeScript, Tailwind 4, Prisma 6.19.3, and PostgreSQL.
- `globalTenantId` plus explicit branch or branch-group scope on all restaurant resources.
- Vase SSO for owners and individually attributable, revocable staff PIN access on paired devices.
- Cloud PostgreSQL as the canonical consolidated source.
- A branch Edge service with SQLite WAL, durable outbox/inbox replication, LAN operation, and resumable synchronization.
- Real Mercado Pago, ARCA, delivery-provider, and ESC/POS integrations with encrypted credentials and auditable operations.

The preserved prototype may inform workflows and terminology, but its authentication, persistence, integrations, and visual system are not reusable production foundations.
