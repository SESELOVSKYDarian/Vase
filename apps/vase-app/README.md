# Vase App

Servicio canonico para identidad, tenants, memberships, billing, marketplace, licencias y launcher.

## Production role

Vase App is the authenticated product at `app.vase.ar`. Stage one keeps the
existing MySQL `vase-db`; PostgreSQL migration happens after parity validation.

## Local commands

```powershell
npm run prisma:generate --workspace @vase/app
npm run dev --workspace @vase/app
```

## EasyPanel

- Build context: `/`
- Dockerfile: `apps/vase-app/Dockerfile`
- Internal port for `app-vase`: `3002`
- Internal port for `vase-labs`: `3000`
- Domains: `app.vase.ar`, `labs.vase.ar`
