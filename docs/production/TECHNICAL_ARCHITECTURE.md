# Vase Platform V3 - Technical Architecture

## Resumen

Vase Platform V3 es un monorepo de servicios SaaS independientes. Cada producto tiene app Next.js, Dockerfile y base PostgreSQL propia.

## Estructura

```text
apps/
  vase-portal
  vase-app
  vase-admin
  vase-help
  vase-business
  vase-management
  vase-labs
  vase-workplace
packages/
  contracts
  config
  auth
  ui
  internal-api
```

## Ownership

- App owns identity, tenants, billing, entitlements.
- Admin owns governance, audit, service registry, AI control.
- Help owns docs and KB.
- Business owns ecommerce.
- Management owns ERP.
- Labs owns AI SaaS.
- Workplace owns internal operations.
- Portal owns marketing and acquisition.

## Data

Cada app tiene PostgreSQL propia:

- `postgres-portal`
- `postgres-app`
- `postgres-admin`
- `postgres-help`
- `postgres-business`
- `postgres-management`
- `postgres-labs`
- `postgres-workplace`

Reglas:

- No cross database joins.
- No acceso directo a DB de otro servicio.
- Proyecciones locales cuando haga falta.
- Integracion por API interna o eventos.

## Shared Redis

Servicio:

```text
redis-platform
```

Uso:

- cache
- rate limiting
- sesiones distribuidas si aplica
- eventos
- colas
- locks
- invalidacion de claims

## Internal APIs

Cada app debe exponer:

- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/internal/admin/health`

Las rutas internas usan:

- `SERVICE_TO_SERVICE_TOKEN`
- allowlist cuando se implemente
- auditoria en endpoints administrativos sensibles

## Deploy

Cada app se despliega como servicio EasyPanel independiente.

Ver:

- `docs/v3/easypanel.md`
- `docs/v3/worktree-deploy.md`

## CI

El CI ejecuta:

- `npm run test:v3`
- `npm run typecheck`
- `npm run build`
- `npm run lint`
- `prisma validate` por app

## Reglas De Cambio

- No crear monolito nuevo.
- No crear DB compartida.
- No mezclar billing en productos.
- No mover gobierno global a productos.
- No mover operacion interna a Admin si corresponde a Workplace.
- Si una capacidad se comparte, crear contrato o helper en `packages/*`.
