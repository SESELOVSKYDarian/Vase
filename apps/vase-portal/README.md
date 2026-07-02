# Vase Portal

Servicio público canónico de `vase.ar`. Contiene marketing, documentación
pública, SEO y captación; autenticación y operación permanecen en
`app.vase.ar`.

## Desarrollo local

Desde la raíz del monorepo:

```powershell
npm install
npm run dev --workspace @vase/portal
```

El Portal escucha en `http://localhost:3001`. Copia `.env.example` a `.env`
y usa el mismo `SERVICE_TO_SERVICE_TOKEN` que Vase App para consultas internas.

## Producción

EasyPanel debe construir desde `/` con
`apps/vase-portal/Dockerfile` y exponer el puerto `3001`. Los valores públicos
`NEXT_PUBLIC_PUBLIC_SITE_ORIGIN` y `NEXT_PUBLIC_APP_URL` son argumentos de
build. `APP_INTERNAL_URL` y `SERVICE_TO_SERVICE_TOKEN` son variables de runtime.

El procedimiento completo de despliegue, verificación y rollback está en
[`docs/runbooks/vase-domain-cutover.md`](../../docs/runbooks/vase-domain-cutover.md).
