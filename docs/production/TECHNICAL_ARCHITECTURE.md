# Vase Technical Architecture

## Resumen
Vase es una plataforma SaaS multi-tenant orientada a una arquitectura modular con dos productos principales:

- `Vase Business`
- `Vase Labs`

La direccion funcional del producto debe priorizar:

- onboarding guiado con recomendacion de modulos
- activacion progresiva de capacidades por tenant
- pricing dinamico por modulo
- separacion clara entre negocio, automatizacion e IA

## Direccion de arquitectura
Aunque el estado actual del repositorio use una app unificada, la arquitectura objetivo del producto debe contemplar:

- frontend separado para experiencia comercial y onboarding
- backend desacoplado por dominios funcionales
- servicio de chatbot independiente
- servicio de automatizacion con n8n
- base de datos relacional central
- despliegue con contenedores y reverse proxy por subdominios

## Capas de dominio

### Core
- auth
- cuentas
- tenants
- billing
- modulos
- pricing
- permisos

### Business
- ecommerce
- storefront
- productos
- frontend configurable
- integraciones ERP y sistemas de gestion

### Labs
- chatbot
- prompting
- canales conversacionales
- automatizaciones
- integraciones externas

### Admin/Ops
- soporte
- auditoria
- observabilidad
- operaciones internas

## Decisiones operativas para produccion
- App stateless para escalar horizontalmente
- Persistencia central para tenants, productos, modulos y activaciones
- Rate limiting persistido para consistencia multi-instancia
- Logs estructurados JSON para observabilidad externa
- Health probes y metricas operativas separadas
- Seeds reproducibles para bootstrap de staging y demo

## Reparabilidad
- Servicios y queries desacoplados
- Seeds y fixtures para reconstruir entornos
- Health endpoints para diagnostico automatico
- Runbook explicito para deploy, rollback y backups

## Escalabilidad global
- Frontend publico detras de cache/CDN
- APIs y paneles detras de autoscaling
- Base de datos primaria con posibilidad de replicas
- Worker pool futuro para webhooks, scraping, entrenamiento, lifecycle y automatizaciones

## Mantenibilidad
- Validacion Zod en servidor
- Dominio separado por carpetas o servicios
- Seguridad centralizada
- Testing por capas: unit, integration y e2e

## Regla de diseno para cambios futuros
Todo cambio funcional o tecnico deberia responder estas preguntas:

1. A que producto pertenece: `Business`, `Labs` o `Core`
2. Si es un modulo activable o una capacidad base
3. Como impacta en pricing, onboarding y multi-tenant
4. Si debe operar como feature flag, configuracion de tenant o servicio separado
