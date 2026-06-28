# Vase - Empresa Y Producto

## Que Es Vase

Vase es una empresa de software que construye una plataforma SaaS modular para negocios que quieren digitalizarse, vender, gestionar operaciones e incorporar IA sin complejidad.

La empresa combina:

- ecommerce
- ERP/gestion
- automatizacion
- inteligencia artificial
- documentacion
- soporte operativo
- desarrollo interno

Vase no es solo una landing ni solo un panel. Es un ecosistema de productos conectados por identidad, tenants, licencias y experiencia de acceso.

## Promesa

Modernizar negocios sin complejidad.

Vase debe permitir que una empresa pase de operar de forma dispersa a tener:

- presencia digital
- tienda online
- gestion interna
- automatizacion comercial
- soporte asistido por IA
- reportes y trazabilidad
- equipo interno coordinado

## Productos

### Vase Portal

Dominio: `vase.ar`

Es la puerta de entrada publica.

Incluye:

- landing
- producto
- precios
- blog
- contacto
- casos de uso
- registro
- login

Objetivo: captar, explicar y convertir.

### Vase App

Dominio: `app.vase.ar`

Es el centro de identidad y negocio de la plataforma.

Incluye:

- login
- registro
- usuarios globales
- empresas
- tenants
- memberships
- licencias
- billing
- marketplace
- launcher

Objetivo: ser el punto unico de entrada autenticado.

### Vase Admin

Dominio: `admin.vase.ar`

Es el control plane global.

Incluye:

- usuarios globales
- tenants
- auditoria
- monitoreo
- service registry
- soporte de plataforma
- control IA
- pricing catalog

Objetivo: gobernar la plataforma sin romper ownership de cada producto.

### Vase Help

Dominio: `help.vase.ar`

Es la documentacion oficial y knowledge base.

Incluye:

- docs por producto
- FAQs
- tutoriales
- changelog
- status
- politicas
- contenido consultable por IA

Objetivo: responder primero desde conocimiento oficial.

### Vase Business

Dominio: `business.vase.ar`

Producto ecommerce SaaS.

Incluye:

- storefront
- productos
- categorias
- marcas
- clientes
- pedidos
- precios
- dominios
- integraciones
- pagos ecommerce
- bridge con `business.vase.ar`

Objetivo: que un negocio pueda vender y operar su presencia comercial digital.

### Vase Management

Dominio: `management.vase.ar`

ERP SaaS argentino.

Incluye:

- empresas
- sucursales
- POS
- clientes
- productos
- stock
- ventas
- compras
- proveedores
- caja
- bancos
- reportes
- preparacion para facturacion argentina

Objetivo: administrar la operacion real del negocio.

### Vase Labs

Dominio: `labs.vase.ar`

Producto IA SaaS.

Incluye:

- chatbots
- asistentes
- knowledge base
- training
- WhatsApp
- Instagram
- Facebook
- inbox
- automatizaciones
- handoffs humanos

Objetivo: automatizar atencion, soporte y procesos mediante IA.

### Vase Workplace

Dominio: `workplace.vase.ar`

Sistema interno para staff de Vase.

Incluye:

- tickets
- QA
- desarrollo
- diseno
- worklogs
- roadmaps
- seguimiento interno de clientes
- operaciones

Objetivo: coordinar el trabajo interno de la empresa.

## Usuarios

### Visitante

Persona que entra a `vase.ar` para conocer la plataforma.

### Cliente

Empresa o negocio que contrata productos Vase.

### Usuario De Empresa

Persona invitada a un tenant con permisos especificos.

### Owner

Responsable principal de una empresa/tenant.

### Staff Interno

Equipo de Vase: desarrollo, diseno, QA, soporte, operaciones.

### Super Admin

Usuario interno con acceso global a `admin.vase.ar`.

## Principios De Producto

- SaaS first.
- Multiempresa.
- Multiproducto.
- API first.
- Cloud ready.
- Docker ready.
- EasyPanel ready.
- Separacion por ownership.
- Sin cross database joins.
- Experiencia clara para usuarios no tecnicos.
- IA como ayuda, no como ruido.

## Regla De Decision

Si una funcionalidad afecta identidad, tenants, licencias o billing, pertenece a `vase-app`.

Si gobierna la plataforma, pertenece a `vase-admin`.

Si documenta o responde conocimiento oficial, pertenece a `vase-help`.

Si vende online, pertenece a `vase-business`.

Si gestiona operacion ERP, pertenece a `vase-management`.

Si automatiza con IA o canales, pertenece a `vase-labs`.

Si es trabajo interno de Vase, pertenece a `vase-workplace`.

Si es marketing o captacion, pertenece a `vase-portal`.
