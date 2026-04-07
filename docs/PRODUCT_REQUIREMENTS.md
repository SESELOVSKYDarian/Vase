# Product Requirements Document

## Vase - Plataforma Modular para Negocios Digitales

## 1. Resumen del Producto
**Vase** es una plataforma SaaS modular que permite a empresas construir, automatizar y escalar su negocio digital mediante la combinacion de dos productos principales:

- `Vase Business`: Ecommerce y presencia online
- `Vase Labs`: Automatizacion, chatbot e inteligencia artificial

El sistema esta disenado para ser flexible, escalable y configurable, permitiendo a cada cliente seleccionar solo los modulos que necesita.

## 2. Objetivo del Producto
- Simplificar la digitalizacion de negocios
- Permitir crear soluciones personalizadas sin desarrollo complejo
- Automatizar procesos de ventas y atencion
- Integrar sistemas externos mediante APIs
- Escalar segun el crecimiento del cliente

## 3. Publico Objetivo
- Emprendedores y pymes
- Negocios fisicos que quieren digitalizarse
- Ecommerce en crecimiento
- Empresas que buscan automatizar atencion al cliente
- Negocios que usan WhatsApp/Instagram como canal principal

## 4. Arquitectura del Producto

### 4.1 Estructura General
Vase se compone de:

- Plataforma central
- Productos independientes
- Modulos activables
- Sistema de configuracion dinamica

### 4.2 Productos

#### Vase Business
- Ecommerce
- Gestion de productos
- Plantillas personalizables
- Integracion con sistemas de gestion

#### Vase Labs
- Chatbot inteligente
- Automatizacion de procesos
- IA basada en prompts
- Integraciones con canales de comunicacion

## 5. Sistema de Modulos

### 5.1 Modulos de Vase Business
- Ecommerce base
- Hosting
- Personalizacion de frontend
- Integracion API con ERP o sistemas
- Gestion de productos

### 5.2 Modulos de Vase Labs
- Chatbot WhatsApp
- Chatbot Instagram
- Chatbot Facebook
- Sistema de reservas
- IA prompting
- Automatizaciones con n8n
- Integraciones externas

### 5.3 Caracteristicas de los modulos
- Independientes
- Configurables
- Activables/desactivables
- Con precio individual
- Pago unico o suscripcion mensual

## 6. Onboarding Inteligente
El sistema incluye un onboarding guiado con asistencia de IA.

### 6.1 Flujo de registro
1. Seleccion de producto
2. Recoleccion de datos de negocio
3. Recomendacion por IA
4. Personalizacion de modulos
5. Calculo dinamico del precio
6. Registro final

## 7. Modelo de Negocio

### 7.1 Estructura de ingresos
- Pago por modulos
- Suscripciones mensuales
- Desarrollo personalizado
- Hosting

### 7.2 Ejemplo
- Ecommerce base: pago unico
- Chatbot: mensual
- Automatizacion: mensual
- Custom frontend: presupuesto

## 8. Requisitos Funcionales

### 8.1 Gestion de cuentas
- Registro/login
- Panel de usuario
- Gestion de modulos activos

### 8.2 Sistema de modulos
- Activar/desactivar modulos
- Configuracion por modulo
- Persistencia en base de datos

### 8.3 Chatbot
- Interpretacion de mensajes
- Integracion con canales
- Personalizacion por negocio
- Conexion con automatizaciones

### 8.4 Ecommerce
- Gestion de productos
- Catalogo
- Carrito de compras
- Integracion con backend

### 8.5 Automatizacion
- Flujos con n8n o sistema propio
- Integraciones API
- Eventos automatizados

### 8.6 IA
- Sistema de recomendaciones
- Prompting configurable
- Adaptacion al negocio

## 9. Requisitos No Funcionales
- Escalabilidad multi-tenant
- Alta disponibilidad
- Seguridad
- Performance
- Modularidad
- Facilidad de uso

## 10. Arquitectura Tecnica Objetivo
- Backend: Node.js + Express + API REST
- Frontend: React / Vite
- Infraestructura: Docker + Docker Compose + VPS + Caddy
- Servicios: backend principal, chatbot, n8n y MySQL

## 11. Modelo de Datos Simplificado

### accounts
- id
- business_name
- email
- password

### products
- id
- name

### modules
- id
- name
- product_id
- price
- type

### account_modules
- account_id
- module_id
- status

## 12. Roadmap

### Fase 1
- Registro
- Ecommerce basico
- Chatbot simple
- Docker deploy

### Fase 2
- IA onboarding
- Modulos dinamicos
- n8n integrado

### Fase 3
- Multi-tenant avanzado
- Integraciones externas
- Escalabilidad cloud

## 13. Propuesta de Valor
- Crear el sistema digital sin conocimientos tecnicos
- Automatizar ventas y atencion
- Escalar sin cambiar de plataforma
- Adaptar el sistema al crecimiento del negocio

## 14. Diferencial Competitivo
- Sistema modular real
- IA aplicada al onboarding
- Integracion directa con canales de venta
- Flexibilidad total
- Enfoque en simplicidad

## 15. Conclusion
Vase busca transformar negocios tradicionales en sistemas digitales escalables combinando ecommerce, automatizacion e inteligencia artificial en una unica solucion modular.
