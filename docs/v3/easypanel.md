# EasyPanel V3

Esta guia explica como desplegar Vase Platform V3 y el editor existente en
EasyPanel usando un App Service independiente por producto.

La arquitectura V3 no se despliega como un monolito unico. Cada app vive en `apps/*`, tiene su propio `Dockerfile`, su propia base y su propio dominio.

## Idea principal

En EasyPanel no se debe levantar el repo completo como una sola app raiz. Se debe crear un servicio por cada producto y apuntar cada servicio al Dockerfile correspondiente.

Ejemplo:

- Para Business se crea un App Service `vase-business`.
- La ruta de compilacion del monorepo es `/apps/vase-editor`.
- EasyPanel usa el `Dockerfile` que existe dentro de esa carpeta.
- Ese servicio escucha en el puerto interno `3000`.
- Se le asigna el dominio `business.vase.ar`.
- Se conecta a la base PostgreSQL existente `vase-business-pg`.

## Servicios esperados

| Producto | Servicio EasyPanel | Dockerfile | Dominio | Puerto | Base de datos |
| --- | --- | --- | --- | --- | --- |
| Portal | `vase-portal-app` | `apps/vase-portal/Dockerfile` | `vase.ar` | `3001` | `postgres-portal` |
| App | `vase-app-next` | `apps/vase-app/Dockerfile` | `app.vase.ar` | `3002` | `vase-db` (MySQL transitorio) |
| Admin | `vase-admin-app` | `apps/vase-admin/Dockerfile` | `admin.vase.ar` | `3003` | `postgres-admin` |
| Help | `vase-help-app` | `apps/vase-help/Dockerfile` | `help.vase.ar` | `3004` | `postgres-help` |
| Business | `vase-business` | `/apps/vase-editor` | `business.vase.ar` | `3000` | `vase-business-pg` existente |
| Management | `vase-management-app` | `apps/vase-management/Dockerfile` | `management.vase.ar` | `3006` | `postgres-management` |
| Labs | `vase-labs-app` | `apps/vase-labs/Dockerfile` | `labs.vase.ar` | `3007` | `vase-db` (MySQL) |
| Rest | `vase-rest-app` | `apps/vase-rest/Dockerfile` | `rest.vase.ar` | `3009` | `postgres-rest` |
| Workplace | `vase-workplace-app` | `apps/vase-workplace/Dockerfile` | `workplace.vase.ar` | `3008` | `postgres-workplace` |

### Transicion de Vase App

El destino final de Vase App es `postgres-app`, pero la primera migracion usa
temporalmente el MySQL existente `vase-db` para conservar usuarios, empresas,
membresias y contrasenas. La migracion a PostgreSQL se ejecuta despues de
validar paridad funcional en `app.vase.ar`.

Durante esta etapa:

- el servicio actual de `vase.ar` permanece activo;
- el servicio nuevo se llama `vase-app-next`;
- `vase-app-next` usa `app.vase.ar`, puerto `3002` y `vase-db`;
- no se ejecutan resets ni migraciones destructivas.

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

Cada app necesita su propio `DATABASE_URL`. Vase App y Vase Labs usan MySQL;
los demas workspaces V3 usan PostgreSQL.

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
DATABASE_URL=mysql://USER:PASSWORD@vase-db:3306/vase
VASE_PRIMARY_HOST=app.vase.ar
BUSINESS_EDITOR_URL=https://business.vase.ar/admin/evolution
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

### Business V3 reservado

```env
NEXT_PUBLIC_APP_URL=CHANGE_ME_BUSINESS_V3_URL
DATABASE_URL=postgresql://vase_business_user:PASSWORD@postgres-business:5432/vase_business
APP_KEY=business
PORT=3005
```

El workspace Next.js `apps/vase-business` no se despliega mientras
`business.vase.ar` pertenezca al Business actual. Antes de activarlo se le debe
asignar otro dominio y otra base.

### Business actual

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://postgres:CHANGE_ME_PASSWORD@vase_vase-business-pg:5432/vase?sslmode=disable
PUBLIC_API_URL=https://business.vase.ar
PUBLIC_ADMIN_URL=https://business.vase.ar/admin/evolution
VASE_BUSINESS_SSO_SECRET=CHANGE_ME_SSO_SECRET
VASE_BUSINESS_SSO_ISSUER=vase-app
VASE_BUSINESS_SSO_AUDIENCE=vase-business
SERVICE_TO_SERVICE_TOKEN=CHANGE_ME_BASE64_32
VITE_VASE_APP_URL=https://app.vase.ar
VITE_VASE_APP_LAUNCH_URL=https://app.vase.ar/app/business/launch
VITE_VASE_APP_LOGIN_URL=https://app.vase.ar/signin
VITE_VASE_APP_SIGNUP_URL=https://app.vase.ar/register
```

Usar `apps/vase-editor/.env.example` como lista completa. Las variables
`VITE_*` deben cargarse tambien como Docker build arguments porque Vite las
incorpora durante el build.

El bridge de autenticacion entre App y Business esta documentado en
`docs/deployment/business-editor-bridge.md`.

### Management

```env
NODE_ENV=production
PORT=3006
NEXT_PUBLIC_APP_URL=https://management.vase.ar
DATABASE_URL=postgresql://vase_management_user:PASSWORD@postgres-management:5432/vase_management
NEXTAUTH_URL=https://management.vase.ar
NEXTAUTH_SECRET=CHANGE_ME_BASE64_32
NEXT_PUBLIC_APP_NAME=Vase Management
AFIP_ENV=sandbox
CRON_SECRET=CHANGE_ME_BASE64_32
APP_KEY=management
```

Management es el ERP SaaS argentino. Esta app se despliega de forma aislada
desde `apps/vase-management` porque conserva su propio `package-lock.json`,
Next.js 14, Prisma 5 y dependencias separadas del monorepo V3. En EasyPanel:

- ruta de compilacion: `/apps/vase-management`;
- Dockerfile: `Dockerfile`;
- puerto interno: `3006`;
- dominio: `management.vase.ar`.

La base debe inicializarse con el schema Prisma de
`apps/vase-management/prisma/schema.prisma` antes de tratar el servicio como
listo. El contenedor no ejecuta migraciones automaticamente porque esta app aun
no incluye carpeta `prisma/migrations`.

### Labs

```env
NEXT_PUBLIC_APP_URL=https://labs.vase.ar
APP_INTERNAL_URL=http://app-vase:3002
DATABASE_URL=mysql://vase_labs_user:PASSWORD@vase-db:3306/vase_labs
AUTH_SECRET=CHANGE_ME_BASE64_32
AUTH_COOKIE_DOMAIN=.vase.ar
SERVICE_TO_SERVICE_TOKEN=CHANGE_ME_BASE64_32
SESSION_ISSUER=app.vase.ar
SESSION_AUDIENCE=vase-platform
REDIS_URL=redis://redis-platform:6379
TRUSTED_ORIGINS=https://vase.ar,https://app.vase.ar,https://admin.vase.ar,https://help.vase.ar,https://business.vase.ar,https://management.vase.ar,https://labs.vase.ar,https://workplace.vase.ar
APP_KEY=labs
PORT=3007
```

Variables Meta, IA y secretos operativos para Labs:

```env
OPENAI_API_KEY=CHANGE_ME
META_APP_ID=CHANGE_ME
META_APP_SECRET=CHANGE_ME
META_GRAPH_VERSION=v24.0
META_WHATSAPP_CONFIG_ID=CHANGE_ME
META_VERIFY_TOKEN=CHANGE_ME
META_WEBHOOK_SECRET=CHANGE_ME_BASE64_32
META_OAUTH_REDIRECT_URI=https://labs.vase.ar/api/v1/meta/oauth/callback
TOKEN_ENCRYPTION_SECRET=CHANGE_ME_BASE64_32
```

`APP_INTERNAL_URL` debe apuntar al nombre interno del servicio App en EasyPanel, no al dominio publico. Labs valida la cookie compartida y usa `SERVICE_TO_SERVICE_TOKEN` para resolver tenant/rol sin acceder a la base de App.

Labs también consulta las credenciales existentes del sistema de gestión externo mediante Vase App. Labs envía únicamente el `globalTenantId` resuelto desde su sesión a `APP_INTERNAL_URL`; Vase App valida el tenant y deriva el origen de Business desde `BUSINESS_EDITOR_URL`. Business devuelve una credencial `products:sync` existente o el estado `EXTERNAL_MANAGEMENT_NOT_CONNECTED`, sin crear credenciales durante la consulta. `SERVICE_TO_SERVICE_TOKEN` debe tener exactamente el mismo valor en Labs, Vase App y Business.

La integracion interna App/Admin -> Labs debe usar `SERVICE_TO_SERVICE_TOKEN` contra `https://labs.vase.ar/api/internal/admin/labs/entitlements`. Esa ruta sincroniza la proyeccion local `LabsEntitlement` y evita joins entre bases.

Los packs de tokens productivos son:

- `BASIC`: 500.000 tokens.
- `MEDIUM`: 1.200.000 tokens.
- `PRO`: 3.000.000 tokens.

Antes del deploy productivo de Labs, ejecutar migraciones Prisma de `apps/vase-labs/prisma/schema.prisma` y verificar:

```bash
npm run prisma:generate --workspace @vase/labs
npm run prisma:migrate:deploy --workspace @vase/labs
npm run migrate:legacy-channels --workspace @vase/labs
curl https://labs.vase.ar/api/health/live
curl https://labs.vase.ar/api/health/ready
```

El flujo oficial requiere además completar en Meta Business:

- verificacion del negocio y App Review;
- acceso avanzado para WhatsApp, Instagram Messaging y Pages Messaging;
- callback OAuth `https://labs.vase.ar/api/v1/meta/oauth/callback`;
- callbacks globales de la app Meta bajo `/api/v1/meta/webhooks/{whatsapp|instagram|facebook}`;
- las rutas históricas por tenant se conservan temporalmente para compatibilidad, pero las nuevas suscripciones deben usar los callbacks globales;
- configuración de Embedded Signup cuyo ID se guarda en `META_WHATSAPP_CONFIG_ID`.

`ready` debe devolver `status: "ok"` y `checks.database: "mysql-labs"`. Si devuelve `status: "degraded"` con `checks.database: "error"`, revisar `DATABASE_URL`, credenciales, red interna y migraciones.

Callbacks Meta que deben cargarse en la app de Meta:

- OAuth: `https://labs.vase.ar/api/v1/meta/oauth/callback`
- WhatsApp webhook: `https://labs.vase.ar/api/v1/channels/whatsapp/{tenantSlug}/webhook`
- Instagram webhook: `https://labs.vase.ar/api/v1/channels/instagram/{tenantSlug}/webhook`
- Facebook webhook: `https://labs.vase.ar/api/v1/channels/facebook/{tenantSlug}/webhook`

Las rutas de webhook deben responder rapido. El webhook solo valida, deduplica y persiste; IA/outbound debe correr fuera del request HTTP mediante worker, cron interno protegido o cola.

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

### Rest

```env
NEXT_PUBLIC_APP_URL=https://rest.vase.ar
DATABASE_URL=postgresql://vase_rest_user:PASSWORD@postgres-rest:5432/vase_rest
VASE_APP_INTERNAL_URL=http://app-vase:3002
VASE_ADMIN_INTERNAL_URL=http://vase-admin:3003
VASE_WORKPLACE_INTERNAL_URL=http://vase-workplace:3008
AUTH_SECRET=CHANGE_ME_BASE64_32
SERVICE_TO_SERVICE_TOKEN=CHANGE_ME_BASE64_32
REST_CREDENTIAL_ENCRYPTION_KEY=CHANGE_ME_BASE64_32
REST_EDGE_SIGNING_KEY=CHANGE_ME_BASE64_32
REDIS_URL=redis://redis-platform:6379
APP_KEY=rest
PORT=3009
```

Crear el App Service `vase-rest-app` desde `apps/vase-rest/Dockerfile`, asociar
`rest.vase.ar`, exponer el puerto `3009` y conectar exclusivamente la base
PostgreSQL `postgres-rest`. El comando del contenedor valida las variables,
aplica `prisma migrate deploy` y recién entonces inicia Next.js.

Antes de habilitar tráfico:

```bash
curl https://rest.vase.ar/api/health/live
curl https://rest.vase.ar/api/health/ready
```

`ready` debe responder `status: "ok"` y `checks.database: "postgres-rest"`.
Las credenciales de proveedores, certificados fiscales y material de Edge se
cargan como secretos de runtime; nunca como variables públicas ni archivos del
repositorio.

### Workplace

```env
NEXT_PUBLIC_APP_URL=https://workplace.vase.ar
DATABASE_URL=postgresql://vase_workplace_user:PASSWORD@postgres-workplace:5432/vase_workplace
APP_KEY=workplace
PORT=3008
```

Workplace es interno de Vase. Debe exigir rol interno/staff y no debe estar disponible para clientes comunes.

## Paso a paso en EasyPanel para Business

### 1. Respaldar PostgreSQL

1. Entrar a EasyPanel.
2. Entrar a `vase-business-pg`.
3. Crear un backup manual.
4. Confirmar que el backup termine correctamente.

### 2. Crear App Service

1. Crear nuevo servicio tipo App.
2. Fuente: GitHub.
3. Repo: `SESELOVSKYDarian/Vase`.
4. Branch: `Vase-Test-Repos` o la rama productiva que contenga V3.
5. Build type: Dockerfile.
6. Ruta de compilacion: `/apps/vase-editor`.
7. Puerto interno: `3000`.
8. Dominio temporal: `business-next.vase.ar`.

### 3. Cargar variables

Cargar las variables de `apps/vase-editor/.env.example`. Para la prueba
temporal usar:

```env
PUBLIC_API_URL=https://business-next.vase.ar
INTEGRATIONS_PUBLIC_BASE_URL=https://business-next.vase.ar
PUBLIC_ADMIN_URL=https://business-next.vase.ar/admin/evolution
VITE_API_URL=https://business-next.vase.ar
VITE_EDITOR_HOST=business-next.vase.ar
PORT=3000
```

Mantener `DATABASE_URL` apuntando a `vase-business-pg`. Configurar cada
variable `VITE_*` tambien como Docker build argument.

### 4. Deploy

1. Guardar variables.
2. Ejecutar deploy.
3. Revisar logs de build.
4. Revisar logs de arranque.
5. Asociar dominio y SSL.

### 5. Verificar health checks

```bash
curl https://business-next.vase.ar/health
```

Respuesta esperada:

```json
{"ok":true}
```

## Migrar el Editor existente

El servicio actual de `business.vase.ar` puede pasar del repositorio
`Proyecto-Teflon` al monorepo sin cambiar la base ni los dominios.

1. Hacer backup de `vase-business-pg`.
2. No borrar ni modificar todavia el servicio actual `vase-business`.
3. Crear un App Service temporal llamado `vase-business-next`.
4. Usar el repo `SESELOVSKYDarian/Vase` y la rama productiva que contenga `apps/vase-editor`.
5. Configurar la ruta de compilacion `/apps/vase-editor`; EasyPanel detecta el `Dockerfile` de esa carpeta.
6. Configurar puerto interno `3000`.
7. Copiar las variables del servicio anterior sin guardarlas en Git.
8. Cargar cada variable `VITE_*` tambien como Docker build argument.
9. Mantener `DATABASE_URL` apuntando a `vase-business-pg`.
10. Usar primero el dominio temporal `business-next.vase.ar`.
11. Confirmar que `https://business-next.vase.ar/health` devuelve `{"ok":true}`.
12. Probar login, `/admin/evolution`, uploads y una tienda publicada.
13. Restaurar los valores finales `business.vase.ar` y volver a desplegar.
14. Mover `business.vase.ar`, `*.vase.ar` y los dominios personalizados del servicio anterior al nuevo.
15. Probar `https://app.vase.ar/app/business/launch`.
16. Eliminar el servicio anterior solo despues de verificar el corte. No eliminar `vase-business-pg`.

El wildcard `*.vase.ar` pertenece a Business y captura subdominios de tiendas.
Los dominios exactos de las apps V3 deben permanecer asociados a sus propios
servicios.

## Build por app localmente

Para Business actual, desde la raiz del repo:

```bash
npm ci --prefix apps/vase-editor/server
npm ci --prefix apps/vase-editor/web
npm run build --prefix apps/vase-editor/web
docker build -t vase-business apps/vase-editor
```

El schema Prisma de `apps/vase-business` no se aplica sobre
`vase-business-pg`.

## Orden recomendado de despliegue

1. `vase-app` porque centraliza identidad, tenants, billing, marketplace y launcher.
2. `vase-admin` porque gobierna la plataforma.
3. `vase-business` desde `apps/vase-editor` para servir Business y las tiendas.
4. `vase-labs` porque es prioridad para IA, Instagram, Facebook e inbox.
5. `vase-help` porque documenta y alimenta knowledge base.
6. `vase-workplace` porque coordina el trabajo interno.
7. `vase-management` cuando se empiece el ERP.
8. `vase-portal` cuando se quiera dejar la captacion publica prolija.

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
- Cada app debe tener su propia base; la excepcion temporal de Vase App es `vase-db`.
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
