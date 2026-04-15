# Vase

Base enterprise de Vase sobre Next.js App Router, Prisma, Auth.js y PostgreSQL lista para despliegue en VPS con Docker Compose y Caddy.

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
- `db`: PostgreSQL accesible internamente como `db`
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

## Documentación operativa

- `docs/production/TESTING_STRATEGY.md`
- `docs/production/OPERATIONS_RUNBOOK.md`
- `docs/production/TECHNICAL_ARCHITECTURE.md`
- `docs/security/SECURITY_AUDIT.md`
