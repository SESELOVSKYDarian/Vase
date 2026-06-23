# Vase Platform V3 - Product Requirements

## Objetivo

Construir Vase como una plataforma SaaS modular, multiempresa y multiproducto para digitalizar, gestionar, vender y automatizar negocios.

## Productos

- `vase-portal`: captacion y marketing.
- `vase-app`: identidad, tenants, billing, marketplace y launcher.
- `vase-admin`: control plane global.
- `vase-help`: documentacion y knowledge base.
- `vase-business`: ecommerce SaaS.
- `vase-management`: ERP SaaS argentino.
- `vase-labs`: IA SaaS.
- `vase-workplace`: operacion interna.

## Requisitos Funcionales Globales

- Registro desde portal.
- Login centralizado desde App.
- Creacion de empresa y tenant.
- Membresias por tenant.
- Roles globales y por tenant.
- Billing y licencias centralizadas en App.
- Launcher de productos contratados.
- Redireccion a billing si no hay entitlement.
- Admin con visibilidad global sin acceso directo a DBs de productos.
- Help como fuente oficial para documentacion e IA.
- Handoff de IA hacia Workplace cuando no haya respuesta.

## Requisitos Por Producto

### Portal

- Landing principal.
- Productos.
- Precios.
- Blog.
- Contacto.
- SEO.
- Registro/login inicial.

### App

- Auth.js.
- Usuarios.
- Empresas.
- Tenants.
- Memberships.
- Branches.
- Planes.
- Suscripciones.
- Entitlements.
- Marketplace.
- Launcher.

### Admin

- Service registry.
- Health dashboards.
- Auditoria.
- Usuarios globales.
- Tenants.
- Soporte.
- Pricing catalog.
- Control de IA.

### Help

- Docs por producto.
- FAQs.
- Changelog.
- Status.
- Knowledge chunks para IA.

### Business

- Storefronts.
- Productos.
- Categorias.
- Marcas.
- Clientes ecommerce.
- Pedidos.
- Pagos ecommerce.
- Dominios.
- Integraciones.
- Bridge con `editor.vase.ar`.

### Management

- Empresas.
- Sucursales.
- POS.
- Clientes.
- Productos.
- Stock.
- Depositos.
- Ventas.
- Compras.
- Proveedores.
- Tesoreria.
- Reportes.
- Preparacion ARCA/AFIP.

### Labs

- Assistants.
- Chatbots.
- Canales.
- Inbox.
- Knowledge.
- Training.
- Conversations.
- Handoffs.
- Automatizaciones.

### Workplace

- Staff profiles.
- Tickets.
- Comentarios.
- QA.
- Worklogs.
- Roadmap.
- Seguimiento interno.

## Requisitos No Funcionales

- Next.js App Router.
- TypeScript.
- Tailwind CSS cuando se implemente UI completa.
- Prisma ORM.
- PostgreSQL por app.
- Redis compartido.
- Docker por app.
- EasyPanel ready.
- API interna protegida por token.
- Tests de estructura, contratos y health.

## Criterios De Aceptacion

- Cada app builda por workspace.
- Cada app tiene DB propia.
- Cada app responde health live/ready.
- Internal admin health exige token.
- No existe monolito activo.
- No hay imports desde rutas eliminadas.
- CI valida V3.
