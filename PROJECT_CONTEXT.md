# Vase Platform V3 - Contexto Maestro Para IA

Este archivo es la fuente principal de contexto para cualquier IA o colaborador que trabaje en Vase.

Debe explicar que es Vase, como esta organizada la empresa/producto, que hace cada app, que estilo visual debe respetarse y cuales son las reglas tecnicas que no se deben romper.

## Que Es Vase

Vase es una empresa y plataforma SaaS modular para ayudar a negocios a digitalizar, operar, vender, automatizar y escalar sin complejidad tecnica.

La vision de Vase es construir un ecosistema de productos empresariales conectados entre si, pero separados por responsabilidad:

- marketing y captacion
- identidad y billing
- ecommerce
- ERP/gestion
- IA y automatizaciones
- documentacion
- operaciones internas
- gobierno global

Vase no debe sentirse como una herramienta tecnica fria. Debe sentirse como una plataforma premium, clara, confiable y facil de usar para usuarios no tecnicos, pymes, equipos internos y empresas que quieren ordenarse.

## Personalidad De Marca

Vase debe comunicar:

- claridad
- confianza
- orden
- modernidad
- calma
- capacidad tecnica sin complejidad visible
- calidad premium sin ruido visual

Tono recomendado:

- directo y humano
- profesional sin sonar corporativo pesado
- simple para usuarios no tecnicos
- seguro, calmo y orientado a accion
- evitar jerga tecnica cuando el usuario final no la necesita

Frase mental guia:

> Moderniza tu negocio sin complejidad.

## Publico Objetivo

Vase apunta a:

- emprendedores y pymes que quieren digitalizarse
- negocios fisicos que quieren vender online
- ecommerce en crecimiento
- empresas que necesitan ERP, stock, ventas y gestion
- negocios que atienden por WhatsApp, Instagram o Facebook
- equipos que necesitan soporte interno, QA, diseno, desarrollo y seguimiento operativo
- clientes que valoran automatizacion e IA pero necesitan una experiencia simple

## Arquitectura Actual

Vase esta separado como monorepo V3 con apps independientes en `apps/*` y paquetes compartidos en `packages/*`.

La raiz no es una app Next.js. La raiz solo orquesta:

- workspaces
- tests
- lint
- typecheck
- build
- documentacion

No existen como fuente activa:

- `src/`
- `prisma/` raiz
- `legacy/`
- `docker/`
- `Dockerfile` raiz
- `docker-compose.yml` raiz

No deben recuperarse esas carpetas como dependencia activa.

## Apps Y Dominios

| Producto | Dominio | Workspace | Base |
| --- | --- | --- | --- |
| Portal | `vase.ar` | `@vase/portal` | `postgres-portal` |
| App | `app.vase.ar` | `@vase/app` | `postgres-app` |
| Admin | `admin.vase.ar` | `@vase/admin` | `postgres-admin` |
| Help | `help.vase.ar` | `@vase/help` | `postgres-help` |
| Business | `business.vase.ar` | `@vase/business` | `postgres-business` |
| Management | `management.vase.ar` | `@vase/management` | `postgres-management` |
| Labs | `labs.vase.ar` | `@vase/labs` | `postgres-labs` |
| Workplace | `workplace.vase.ar` | `@vase/workplace` | `postgres-workplace` |

Cada app tiene:

- `package.json`
- `Dockerfile`
- `.env.example`
- `README.md`
- `app/api/health/live`
- `app/api/health/ready`
- `app/api/internal/admin/health`
- `prisma/schema.prisma` con PostgreSQL

## Responsabilidad Por App

### `vase-portal`

Dominio: `vase.ar`

Responsable de:

- landing publica
- marketing
- productos
- precios
- blog
- contacto
- SEO
- registro inicial
- login inicial
- redireccion a `app.vase.ar`

No debe contener billing operativo ni logica interna de productos.

### `vase-app`

Dominio: `app.vase.ar`

Es el centro canonico de:

- identidad
- Auth.js
- usuarios globales
- sesiones
- MFA/OAuth cuando se implemente
- empresas
- tenants
- sucursales
- memberships
- roles globales
- billing de plataforma
- marketplace
- planes
- suscripciones
- licencias
- entitlements
- launcher de productos

Regla principal:

> Todo usuario autenticado entra primero a `app.vase.ar`.

### `vase-admin`

Dominio: `admin.vase.ar`

Es el control plane global.

Responsable de:

- gobierno global
- auditoria
- monitoreo
- service registry
- soporte operativo
- configuracion global
- pricing catalog
- control transversal de IA
- operaciones administrativas

No cobra, no procesa pagos y no es owner del billing. Lee esa informacion desde `vase-app`.

### `vase-help`

Dominio: `help.vase.ar`

Responsable de:

- documentacion oficial
- FAQs
- tutoriales
- changelog
- status
- policies
- knowledge base para asistentes IA

Regla IA:

> Los asistentes deben consultar Help antes de responder cuando la pregunta depende de documentacion de producto.

### `vase-business`

Dominio: `business.vase.ar`

Producto ecommerce SaaS.

Responsable de:

- storefronts
- productos
- categorias
- marcas
- clientes ecommerce
- pedidos
- pagos propios del ecommerce
- precios comerciales
- dominios
- integraciones ecommerce
- bridge a `editor.vase.ar`

No gestiona suscripciones ni licencias de la plataforma Vase.

### `vase-management`

Dominio: `management.vase.ar`

Producto ERP SaaS argentino.

Responsable de:

- empresas
- sucursales
- POS
- clientes
- productos
- stock
- depositos
- ventas
- compras
- proveedores
- tesoreria
- bancos/caja
- contabilidad futura
- reportes
- preparacion para ARCA/AFIP/CAE/QR
- consultas IA sobre datos ERP

### `vase-labs`

Dominio: `labs.vase.ar`

Producto IA SaaS.

Responsable de:

- asistentes IA
- chatbots
- inbox
- WhatsApp
- Instagram
- Facebook
- webchat
- training
- knowledge base
- conversaciones
- automatizaciones
- handoffs

### `vase-workplace`

Dominio: `workplace.vase.ar`

Sistema interno exclusivo para staff.

Responsable de:

- tickets internos
- QA
- tareas de desarrollo
- tareas de diseno
- roadmaps
- worklogs
- seguimiento de clientes
- operaciones internas
- handoffs humanos desde IA

Debe exigir rol interno/staff.

## Paquetes Compartidos

- `@vase/contracts`: tipos, schemas y contratos compartidos.
- `@vase/config`: catalogo de apps, dominios y servicios.
- `@vase/auth`: tipos y helpers compartidos de identidad.
- `@vase/ui`: primitivas UI compartidas.
- `@vase/internal-api`: helpers de service-to-service e internal admin APIs.

Reglas:

- Las apps no importan codigo de otras apps usando rutas relativas.
- Las apps no importan desde rutas eliminadas del monolito.
- Codigo compartido debe vivir en `packages/*`.
- Si dos apps necesitan un contrato, va en `@vase/contracts`.
- Si dos apps necesitan una primitiva visual, va en `@vase/ui`.
- Si dos apps necesitan auth compartida, va en `@vase/auth`.

## Base De Datos E Integracion

Cada app tiene su propia PostgreSQL.

Reglas:

- sin joins cross-database
- sin lectura directa de DB de otro servicio
- integracion por API interna, eventos o proyecciones locales
- IDs globales compartidos:
  - `globalUserId`
  - `globalTenantId`
  - `globalCompanyId`
  - `membershipId`
  - `productKey`

Redis compartido:

- `redis-platform`

Usos:

- cache
- sesiones distribuidas cuando aplique
- rate limiting
- colas
- eventos
- invalidacion de permisos/claims

## Seguridad

Principios:

- service-to-service protegido con `SERVICE_TO_SERVICE_TOKEN`
- no exponer endpoints internos sin token
- no guardar secretos en repo
- `.env` local no se versiona
- validar inputs en servidor
- separar permisos por app y producto
- admin no accede directo a DBs externas
- workplace solo staff

Endpoints minimos por app:

- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/internal/admin/health`

## Diseno E Identidad Visual

La guia base esta en:

- `docs/company/brand-and-design.md`
- `docs/design-system/MASTER.md`

Direccion visual:

- premium
- clara
- sobria
- editorial
- tecnologica sin parecer fria
- interfaces amplias y respiradas
- glassmorphism controlado
- jerarquia fuerte
- estados visibles

Colores principales:

- carbon: `#000202`
- carbon suave: `#2F3030`
- jade: `#3B633D`
- sage: `#739374`
- mist: `#EFF3F4`
- blanco: `#FFFFFF`

Reglas visuales:

- evitar interfaces genericas
- evitar exceso de violeta o gradientes comunes de SaaS
- no usar dark mode por default en marketing si la direccion pide una experiencia editorial clara
- usar dark/operational surfaces en paneles cuando ayude a jerarquia
- botones claros, estados consistentes, foco visible
- copiar menos de dashboards genericos y mas de herramientas premium de negocio

## Documentacion Clave

- `PROJECT_CONTEXT.md`: contexto maestro para IA.
- `README.md`: resumen operativo del repo.
- `docs/company/brand-and-design.md`: identidad, colores, tono y UI.
- `docs/company/product-and-company.md`: que es la empresa y que hace cada producto.
- `docs/v3/easypanel.md`: deploy por servicio en EasyPanel.
- `docs/v3/worktree-deploy.md`: deploy con worktree/sparse checkout.
- `docs/production/TECHNICAL_ARCHITECTURE.md`: arquitectura tecnica V3.
- `docs/production/OPERATIONS_RUNBOOK.md`: operacion y mantenimiento.
- `SECURITY.md`: politica y reglas de seguridad.

## Como Debe Trabajar Una IA En Este Repo

Antes de tocar codigo:

1. Leer `PROJECT_CONTEXT.md`.
2. Identificar a que app pertenece el cambio.
3. Revisar docs relacionadas en `docs/`.
4. No reintroducir monolito.
5. No crear dependencias entre apps por rutas relativas.
6. Si algo es compartido, moverlo a `packages/*`.
7. Mantener cada app deployable por separado.
8. Verificar con tests/build/lint.

Comandos de verificacion:

```bash
npm run test:v3
npm run typecheck
npm run build
npm run lint
```

Validacion Prisma:

```bash
npx prisma validate --schema apps/vase-app/prisma/schema.prisma
```

Repetir por app.

## Estado De Implementacion

Hoy la arquitectura V3 esta separada y buildable. Las apps tienen bases, Dockerfile, health checks y schemas propios.

Las funcionalidades profundas deben implementarse app por app dentro de esta separacion, sin recuperar el monolito.

Prioridad recomendada:

1. `vase-app`: auth real, tenants, billing y entitlements.
2. `vase-portal`: marketing real, registro/login inicial y SEO.
3. `vase-business`: ecommerce MVP.
4. `vase-management`: ERP MVP.
5. `vase-labs`: asistentes, knowledge e inbox.
6. `vase-help`: documentacion y KB.
7. `vase-admin`: control plane.
8. `vase-workplace`: operacion interna y tickets.
