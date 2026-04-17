# Vase

Base enterprise de Vase sobre Next.js App Router, Prisma, Auth.js y MySQL lista para despliegue en VPS con Docker Compose y Caddy.

## Scripts principales

```bash
npm run dev
npm run lint
npm run test
npm run test:integration
npm run test:e2e
npm run typecheck
npm run build
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
```

## Despliegue con Docker

1. Crear `.env` a partir de `.env.example` y completar secretos reales.
2. Apuntar DNS de `vase.ar`, `api.vase.ar`, `bot.vase.ar` y `n8n.vase.ar` al VPS.
3. Levantar la plataforma:

```bash
docker compose up -d
```

### Servicios

- `frontend`: Next.js para `https://vase.ar`
- `backend`: instancia separada para `https://api.vase.ar`
- `db`: MySQL accesible internamente como `db`
- `caddy`: reverse proxy con HTTPS automatico
- `chatbot`: opcional con perfil `chatbot`
- `n8n`: opcional con perfil `automation`

### Perfiles opcionales

```bash
docker compose --profile chatbot --profile automation up -d
```

## Health y operaciones

- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/ops/metrics` con `MONITORING_TOKEN`

## Deploy en EasyPanel

Estrategia: **1 App Service** (Dockerfile raíz) + **1 MySQL Service**.  
EasyPanel gestiona el reverse proxy y SSL — **no se usa docker-compose ni Caddy** en este modo.

- Guía completa paso a paso: [`docs/deployment/easypanel.md`](docs/deployment/easypanel.md)
- Variables de entorno: [`.env.easypanel.example`](.env.easypanel.example)
- Build Argument requerido: `NEXT_PUBLIC_APP_URL=https://tu-dominio.com`
- Puerto: `3000`

## Documentación operativa

- `docs/production/TESTING_STRATEGY.md`
- `docs/production/OPERATIONS_RUNBOOK.md`
- `docs/production/TECHNICAL_ARCHITECTURE.md`
- `docs/security/SECURITY_AUDIT.md`
