# Vase Security Policy

## Alcance

Esta politica aplica a Vase Platform V3 y sus apps:

- `vase-portal`
- `vase-app`
- `vase-admin`
- `vase-help`
- `vase-business`
- `vase-management`
- `vase-labs`
- `vase-workplace`

## Principios

- Separacion por servicio y por base de datos.
- Sin joins cross-database.
- Sin acceso directo a DB de otro servicio.
- APIs internas protegidas por `SERVICE_TO_SERVICE_TOKEN`.
- Secretos fuera del repo.
- `.env` local no versionado.
- Validacion server-side para datos de usuario.
- Menor privilegio por rol, tenant y producto.
- `vase-app` es fuente canonica de identidad, tenants, billing y entitlements.
- `vase-admin` gobierna por API, no por acceso directo a DBs de productos.
- `vase-workplace` solo para staff interno.

## Reporte De Vulnerabilidades

Si se detecta una vulnerabilidad:

1. No abrir un issue publico con secretos, tokens, payloads explotables o datos de clientes.
2. Reportar por canal interno del equipo Vase.
3. Incluir descripcion, impacto, pasos de reproduccion y servicio afectado.
4. Si hay credenciales expuestas, rotarlas inmediatamente.

## Reglas Para Desarrollo

- No commitear `.env`.
- No commitear logs con tokens, cookies o dumps.
- No guardar uploads de prueba en git.
- No desactivar auth o validaciones para "probar rapido" sin revertirlo.
- No exponer rutas `/api/internal/*` sin token.
- No mezclar billing de plataforma dentro de productos.
- No recuperar codigo legacy como dependencia activa.

## Verificacion Recomendada

```bash
npm run test:v3
npm run typecheck
npm run build
npm run lint
```

Validar Prisma:

```bash
npx prisma validate --schema apps/<app>/prisma/schema.prisma
```

## Pendientes De Hardening

- Definir proveedor de secretos por entorno.
- Agregar allowlist service-to-service por servicio llamador.
- Agregar auditoria persistente para llamadas internas sensibles.
- Integrar rate limiting distribuido con Redis.
- Integrar monitoreo y alertas.
- Definir proceso formal de rotacion de tokens.
