# EasyPanel V3

Esta guia explica como desplegar Vase Platform V3 y el editor existente en
EasyPanel usando un App Service independiente por producto.

La arquitectura V3 no se despliega como un monolito unico. Cada app vive en `apps/*`, tiene su propio `Dockerfile`, su propia base PostgreSQL y su propio dominio.

## Idea principal

En EasyPanel no se debe levantar el repo completo como una sola app raiz. Se debe crear un servicio por cada producto y apuntar cada servicio al Dockerfile correspondiente.

Ejemplo:

- Para Business se crea un App Service `vase-business-app`.
- Ese App Service usa el Dockerfile `apps/vase-business/Dockerfile`.
- Ese servicio escucha en el puerto interno de Business.
- Se le asigna el dominio `business.vase.ar`.
- Se le conecta una base PostgreSQL propia llamada, por ejemplo, `postgres-business`.

## Servicios esperados

| Producto | Servicio EasyPanel | Dockerfile | Dominio | Puerto | Base PostgreSQL |
| --- | --- | --- | --- | --- | --- |
| Portal | `vase-portal-app` | `apps/vase-portal/Dockerfile` | `vase.ar` | `3001` | `postgres-portal` |
| App | `vase-app-app` | `apps/vase-app/Dockerfile` | `app.vase.ar` | `3002` | `postgres-app` |
| Admin | `vase-admin-app` | `apps/vase-admin/Dockerfile` | `admin.vase.ar` | `3003` | `postgres-admin` |
| Help | `vase-help-app` | `apps/vase-help/Dockerfile` | `help.vase.ar` | `3004` | `postgres-help` |
| Business | `vase-business-app` | `apps/vase-business/Dockerfile` | `business.vase.ar` | `3005` | `postgres-business` |
| Editor | `vase-editor` | `apps/vase-editor/Dockerfile` | `editor.vase.ar` | `3000` | `vase-business-pg` existente |
| Management | `vase-management-app` | `apps/vase-management/Dockerfile` | `management.vase.ar` | `3006` | `postgres-management` |
| Labs | `vase-labs-app` | `apps/vase-labs/Dockerfile` | `labs.vase.ar` | `3007` | `postgres-labs` |
| Workplace | `vase-workplace-app` | `apps/vase-workplace/Dockerfile` | `workplace.vase.ar` | `3008` | `postgres-workplace` |

> Nota: si algun `package.json` de una app define otro puerto, EasyPanel debe respetar el puerto real de esa app. El puerto de EasyPanel debe coincidir con el `next start --port` de cada workspace.

## Infraestructura compartida

Crear tambien un Redis compartido:

```env
REDIS_URL=redis://redis-platform:6379
```

Uso esperado de Redis:

- cache
- sesiones distribuidas cuando aplique
- rate limiting
- colas
- eventos internos
- invalidacion de permisos o claims

## Variables compartidas por todas las apps

Estas variables deben repetirse en todos los App Services, cambiando solo las especificas de cada producto.

```env
AUTH_SECRET=CHANGE_ME_BASE64_32
AUTH_COOKIE_DOMAIN=.vase.ar
SERVICE_TO_SERVICE_TOKEN=CHANGE_ME_BASE64_32
SESSION_ISSUER=app.vase.ar
SESSION_AUDIENCE=vase-platform
REDIS_URL=redis://redis-platform:6379
TRUSTED_ORIGINS=https://vase.ar,https://app.vase.ar,https://admin.vase.ar,https://help.vase.ar,https://business.vase.ar,https://management.vase.ar,https://labs.vase.ar,https://workplace.vase.ar
```

Reglas:

- `AUTH_SECRET` debe ser el mismo en las apps que compartan sesion o validacion de identidad.
- `AUTH_COOKIE_DOMAIN=.vase.ar` permite cookies compartibles entre subdominios.
- `SERVICE_TO_SERVICE_TOKEN` protege endpoints internos entre apps.
- `TRUSTED_ORIGINS` debe contener todos los dominios oficiales de la plataforma.
- No subir secretos reales al repositorio.

## Variables especificas por app

Cada app necesita su propio `DATABASE_URL` apuntando a su PostgreSQL.

### Portal

```env
NEXT_PUBLIC_APP_URL=https://vase.ar
DATABASE_URL=postgresql://vase_portal_user:PASSWORD@postgres-portal:5432/vase_portal
APP_KEY=portal
PORT=3001
```

### App

```env
NEXT_PUBLIC_APP_URL=https://app.vase.ar
DATABASE_URL=postgresql://vase_app_user:PASSWORD@postgres-app:5432/vase_app
APP_KEY=app
PORT=3002
```

### Admin

```env
NEXT_PUBLIC_APP_URL=https://admin.vase.ar
DATABASE_URL=postgresql://vase_admin_user:PASSWORD@postgres-admin:5432/vase_admin
APP_KEY=admin
PORT=3003
```

### Help

```env
NEXT_PUBLIC_APP_URL=https://help.vase.ar
DATABASE_URL=postgresql://vase_help_user:PASSWORD@postgres-help:5432/vase_help
APP_KEY=help
PORT=3004
```

### Business

```env
NEXT_PUBLIC_APP_URL=https://business.vase.ar
DATABASE_URL=postgresql://vase_business_user:PASSWORD@postgres-business:5432/vase_business
APP_KEY=business
PORT=3005
```

Business debe integrarse con:

```env
EDITOR_URL=https://editor.vase.ar
VASE_APP_URL=https://app.vase.ar
```

Business V3 no debe usar la base del editor. Su schema Prisma pertenece a
`postgres-business`, mientras que el editor conserva la base existente
`vase-business-pg`.

### Editor

El editor migrado vive en `apps/vase-editor`. No es una app Next.js ni usa el
puerto de Business V3:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://postgres:CHANGE_ME_PASSWORD@vase_vase-business-pg:5432/vase?sslmode=disable
PUBLIC_API_URL=https://editor.vase.ar
PUBLIC_ADMIN_URL=https://editor.vase.ar/admin/evolution
VASE_BUSINESS_SSO_SECRET=CHANGE_ME_SSO_SECRET
VASE_BUSINESS_SSO_ISSUER=vase-app
VASE_BUSINESS_SSO_AUDIENCE=vase-business
```

Usar `apps/vase-editor/.env.example` como lista completa. Las variables
`VITE_*` deben cargarse tambien como Docker build arguments porque Vite las
incorpora durante el build.

El bridge de autenticacion entre App y Editor esta documentado en
`docs/deployment/business-editor-bridge.md`.

### Management

```env
NEXT_PUBLIC_APP_URL=https://management.vase.ar
DATABASE_URL=postgresql://vase_management_user:PASSWORD@postgres-management:5432/vase_management
APP_KEY=management
PORT=3006
```

Management sera el ERP SaaS argentino y debe integrarse con App para identidad, tenants y permisos.

### Labs

```env
NEXT_PUBLIC_APP_URL=https://labs.vase.ar
DATABASE_URL=postgresql://vase_labs_user:PASSWORD@postgres-labs:5432/vase_labs
APP_KEY=labs
PORT=3007
```

Variables futuras o esperadas para Labs:

```env
OPENAI_API_KEY=CHANGE_ME
META_APP_ID=CHANGE_ME
META_APP_SECRET=CHANGE_ME
META_VERIFY_TOKEN=CHANGE_ME
WHATSAPP_ACCESS_TOKEN=CHANGE_ME
INSTAGRAM_ACCESS_TOKEN=CHANGE_ME
FACEBOOK_PAGE_ACCESS_TOKEN=CHANGE_ME
```

Labs debe manejar:

- WhatsApp
- Instagram
- Facebook
- webchat
- inbox
- asistentes IA
- knowledge base
- training
- handoff humano

### Workplace

```env
NEXT_PUBLIC_APP_URL=https://workplace.vase.ar
DATABASE_URL=postgresql://vase_workplace_user:PASSWORD@postgres-workplace:5432/vase_workplace
APP_KEY=workplace
PORT=3008
```

Workplace es interno de Vase. Debe exigir rol interno/staff y no debe estar disponible para clientes comunes.

## Paso a paso en EasyPanel para una app

Ejemplo con Business.

### 1. Crear PostgreSQL

1. Entrar a EasyPanel.
2. Crear un servicio PostgreSQL.
3. Nombre sugerido: `postgres-business`.
4. Crear base: `vase_business`.
5. Crear usuario: `vase_business_user`.
6. Guardar password segura.
7. Confirmar que el servicio quede en estado `Running`.

### 2. Crear App Service

1. Crear nuevo servicio tipo App.
2. Fuente: GitHub.
3. Repo: `SESELOVSKYDarian/Vase`.
4. Branch: `Vase-Test-Repos` o la rama productiva que contenga V3.
5. Build type: Dockerfile.
6. Dockerfile path: `apps/vase-business/Dockerfile`.
7. Puerto interno: `3005`.
8. Dominio: `business.vase.ar`.

### 3. Cargar variables

Cargar variables compartidas y especificas:

```env
NEXT_PUBLIC_APP_URL=https://business.vase.ar
DATABASE_URL=postgresql://vase_business_user:PASSWORD@postgres-business:5432/vase_business
AUTH_SECRET=CHANGE_ME_BASE64_32
AUTH_COOKIE_DOMAIN=.vase.ar
SERVICE_TO_SERVICE_TOKEN=CHANGE_ME_BASE64_32
SESSION_ISSUER=app.vase.ar
SESSION_AUDIENCE=vase-platform
REDIS_URL=redis://redis-platform:6379
TRUSTED_ORIGINS=https://vase.ar,https://app.vase.ar,https://admin.vase.ar,https://help.vase.ar,https://business.vase.ar,https://management.vase.ar,https://labs.vase.ar,https://workplace.vase.ar
APP_KEY=business
PORT=3005
```

### 4. Deploy

1. Guardar variables.
2. Ejecutar deploy.
3. Revisar logs de build.
4. Revisar logs de arranque.
5. Asociar dominio y SSL.

### 5. Verificar health checks

Cada app debe exponer:

```txt
/api/health/live
/api/health/ready
/api/internal/admin/health
```

Para Business:

```bash
curl https://business.vase.ar/api/health/live
curl https://business.vase.ar/api/health/ready
```

Respuesta esperada:

```json
{"status":"ok"}
```

El Editor conserva su health check existente:

```bash
curl https://editor.vase.ar/health
```

Respuesta esperada:

```json
{"ok":true}
```

## Migrar el Editor existente

El servicio actual de `editor.vase.ar` puede pasar del repositorio
`Proyecto-Teflon` al monorepo sin cambiar la base ni los dominios.

1. Hacer backup de `vase-business-pg`.
2. No borrar ni modificar todavia el servicio actual `vase-business`.
3. Crear un App Service temporal llamado `vase-editor-next`.
4. Usar el repo `SESELOVSKYDarian/Vase` y la rama productiva que contenga `apps/vase-editor`.
5. Elegir build por Dockerfile con path `apps/vase-editor/Dockerfile`.
6. Configurar puerto interno `3000`.
7. Copiar las variables del servicio anterior sin guardarlas en Git.
8. Cargar cada variable `VITE_*` tambien como Docker build argument.
9. Mantener `DATABASE_URL` apuntando a `vase-business-pg`.
10. Usar primero un dominio temporal, por ejemplo `editor-next.vase.ar`.
11. Confirmar que `https://editor-next.vase.ar/health` devuelve `{"ok":true}`.
12. Probar login, `/admin/evolution`, uploads y una tienda publicada.
13. Restaurar los valores finales `editor.vase.ar` y volver a desplegar.
14. Mover `editor.vase.ar`, `*.vase.ar` y los dominios personalizados del servicio anterior al nuevo.
15. Probar `https://vase.ar/app/business/launch`.
16. Eliminar el servicio anterior solo despues de verificar el corte. No eliminar `vase-business-pg`.

El wildcard `*.vase.ar` pertenece al Editor y captura subdominios de tiendas.
Los dominios exactos de las apps V3 deben permanecer asociados a sus propios
servicios.

## Build por app localmente

Desde la raiz del repo:

```bash
npm install
npm run build --workspace @vase/business
```

Para validar Prisma de Business:

```bash
npx prisma validate --schema apps/vase-business/prisma/schema.prisma
```

Repetir el mismo criterio para cada app cambiando el workspace y el schema.

## Orden recomendado de despliegue

1. `vase-app` porque centraliza identidad, tenants, billing, marketplace y launcher.
2. `vase-admin` porque gobierna la plataforma.
3. `vase-business` porque ya tiene utilidad comercial inmediata.
4. `vase-editor` para servir el editor y las tiendas existentes desde el monorepo.
5. `vase-labs` porque es prioridad para IA, Instagram, Facebook e inbox.
6. `vase-help` porque documenta y alimenta knowledge base.
7. `vase-workplace` porque coordina el trabajo interno.
8. `vase-management` cuando se empiece el ERP.
9. `vase-portal` cuando se quiera dejar la captacion publica prolija.

El orden puede cambiar si comercialmente conviene desplegar primero Business o Labs, pero tecnicamente `vase-app` deberia estar antes para identidad y permisos.

## Diferencia entre App, Admin y Workplace

- `vase-app`: lo usa el cliente. Maneja identidad, empresas, licencias, modulos, billing y launcher.
- `vase-admin`: lo usa Vase para gobernar la plataforma, clientes, modulos, pricing y monitoreo global.
- `vase-workplace`: lo usa el staff interno de Vase para tickets, QA, desarrollo, diseno, roadmaps, worklogs y handoffs humanos.

## Reglas que no se deben romper

- No reintroducir monolito.
- No crear `src/` raiz.
- No crear `prisma/` raiz.
- No usar `legacy/` como fuente activa.
- No importar codigo entre apps con rutas relativas.
- Compartir codigo solo desde `packages/*`.
- Cada app debe poder buildear y desplegarse por separado.
- Cada app debe tener su propia base PostgreSQL.
- Editor y Business V3 no deben compartir base ni schema.
- No hacer joins cross-database.
- Integrar apps por API interna, eventos o proyecciones locales.

## Problemas comunes

### EasyPanel muestra 502

Revisar:

- que el puerto interno sea el correcto
- que el comando `next start` escuche en `0.0.0.0`
- que el dominio apunte al servicio correcto
- que el contenedor no se haya caido por variables faltantes

### Build falla

Revisar:

- Dockerfile path correcto
- branch correcta
- que `package-lock.json` exista en la raiz
- que los packages compartidos existan en `packages/*`
- que el workspace exista en el `package.json` raiz

### Ready health falla

Revisar:

- `DATABASE_URL`
- nombre del servicio PostgreSQL
- usuario/password
- nombre de la base
- migraciones o schema Prisma

### Cookies o login entre subdominios no funcionan

Revisar:

- `AUTH_SECRET` igual entre apps relacionadas
- `AUTH_COOKIE_DOMAIN=.vase.ar`
- `TRUSTED_ORIGINS`
- HTTPS activo en todos los subdominios
- `SESSION_ISSUER=app.vase.ar`
- `SESSION_AUDIENCE=vase-platform`

## Checklist antes de dar una app por lista

- App Service creado.
- PostgreSQL propio creado.
- Dominio asociado.
- SSL activo.
- Variables compartidas cargadas.
- Variables especificas cargadas.
- Health live responde.
- Health ready responde.
- Build sin errores.
- Logs sin errores criticos.
- Workspace build localmente.
- Prisma validate OK.
- No depende de `legacy/`.
- No depende de `src/` raiz.
- No depende de `prisma/` raiz.
