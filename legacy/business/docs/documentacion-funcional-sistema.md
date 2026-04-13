# Documentacion Funcional del Sistema

Fecha: 2026-03-20

## 1. Resumen

Proyecto Teflon es un ecommerce multi-tenant con panel administrativo, catalogo publico, gestion de pedidos y capa de integracion con sistemas externos. El sistema permite operar una tienda online con contenido editable, productos, categorias, marcas, reglas de precios y sincronizacion de inventario desde un ERP o sistema de gestion.

## 2. Objetivo del sistema

El sistema fue construido para cubrir estas necesidades:

- publicar una tienda online para venta minorista y mayorista
- administrar productos, categorias, marcas y paginas desde un panel propio
- controlar que precios se muestran al publico, solo a usuarios autenticados o a nadie
- recibir pedidos desde la web y gestionarlos internamente
- personalizar la apariencia del storefront y del admin
- sincronizar catalogo, stock y precios desde un sistema externo
- operar varios tenants sobre la misma base

## 3. Arquitectura general

### 3.1 Frontend

- Aplicacion React + Vite
- Incluye storefront publico y panel admin
- Rutas principales:
  - `/`
  - `/catalog`
  - `/product/:id`
  - `/cart`
  - `/checkout`
  - `/about`
  - `/login`
  - `/signup`
  - `/profile`
  - `/order-success`
  - `/order-details`
  - `/admin`
  - `/admin/evolution`
  - `/admin/legacy`
  - `/admin/preview`

### 3.2 Backend

- API Node.js + Express
- Expone modulos publicos, autenticados, administrativos e integraciones
- Endpoints base principales:
  - `/health`
  - `/auth`
  - `/api/me`
  - `/api/settings`
  - `/api/orders`
  - `/public`
  - `/checkout`
  - `/tenant`
  - `/admin`
  - `/api/v1/integrations`

### 3.3 Base de datos

- PostgreSQL / Supabase
- Datos principales:
  - tenants
  - dominios por tenant
  - configuracion de tenant
  - usuarios y roles
  - categorias y marcas
  - productos
  - listas de precios
  - pedidos
  - paginas y secciones

### 3.4 Despliegue actual recomendado

- Frontend: Vercel
- Backend: Render
- Base de datos: Supabase

## 4. Modelo multi-tenant

El sistema esta preparado para atender mas de una tienda desde la misma plataforma.

Cada tenant tiene:

- identidad propia
- dominio o resolucion local
- branding
- tema visual
- paginas y secciones
- catalogo y reglas comerciales
- usuarios relacionados
- integraciones propias

En entorno local se puede resolver el tenant con `X-Tenant-Id`. En produccion puede resolverse por dominio.

## 5. Storefront publico

### 5.1 Home y contenido

La tienda publica incluye una home configurable por secciones. Actualmente soporta bloques como:

- Hero / slider principal
- productos destacados
- servicios

El contenido puede publicarse y mantenerse en borrador desde admin.

### 5.2 Catalogo

El catalogo publico incluye:

- vista de productos paginada
- categorias
- marcas
- buscador
- productos agrupados por variaciones
- posibilidad de expandir un producto raiz y ver sus variaciones
- filtros avanzados:
  - categoria
  - marca
  - precio minimo
  - precio maximo
  - solo con stock
  - orden por nombre, precio y stock
- menu movil y filtros adaptados para pantallas chicas

Ademas, las categorias raiz pueden plegar y desplegar sus hijas para mejorar navegacion en desktop y mobile.

### 5.3 Productos destacados

La home puede mostrar un bloque de productos destacados tomado desde el backend. Esa vista utiliza el detalle corto del producto para mantener una tarjeta mas compacta.

### 5.4 Ficha de producto

Cada producto puede mostrar:

- imagenes
- nombre
- marca
- precios segun reglas del tenant y del usuario
- detalle corto
- descripcion larga
- stock
- productos relacionados
- especificaciones tecnicas

La ficha soporta tabs y oculta el bloque de especificaciones si el producto no tiene datos o si fue deshabilitado desde admin.

### 5.5 Cuenta de usuario

La tienda incluye:

- login
- registro
- perfil
- historial de pedidos
- detalle de pedido

## 6. Carrito y checkout

El flujo comercial cubre:

- agregar productos al carrito
- actualizar cantidades
- revisar resumen de compra
- validar checkout
- generar pedido

Modos contemplados:

- transferencia bancaria
- retiro / efectivo
- esquema preparado para medios online futuros

El sistema ya maneja estados de pedido y puede mostrar datos bancarios configurados por el tenant.

## 7. Panel administrativo

El admin concentra la operacion de la tienda.

### 7.1 Apariencia

Desde el panel se pueden configurar:

- nombre comercial
- logo
- footer
- links rapidos
- datos de contacto
- tema del storefront
- colores del catalogo
- tema del admin panel

### 7.2 Paginas y secciones

Se pueden editar paginas como `home` y `about`, con control de borrador/publicacion.

### 7.3 Catalogo y productos

El modulo de catalogo permite:

- crear, editar y eliminar productos
- asignar categorias
- asignar marca
- marcar producto como destacado
- ordenar productos destacados
- controlar stock
- configurar visibilidad
- definir imagenes
- trabajar con grupos de variaciones
- marcar un producto como raiz de variaciones
- definir etiqueta de variacion

### 7.4 Descripciones del producto

Cada producto puede manejar dos niveles de descripcion:

- `detalle corto`
  - se usa en catalogo y productos destacados
- `descripcion larga`
  - se usa en la ficha de producto

Esto mejora la lectura comercial sin sacrificar informacion tecnica en el detalle.

### 7.5 Especificaciones tecnicas

Cada producto puede tener un apartado de especificaciones cargado como celdas `Campo / Valor`.

Ejemplos:

- Material | Bronce
- Color | Negro mate
- Medida | 30 cm

El admin puede:

- agregar filas
- editar filas
- quitar filas
- habilitar o deshabilitar la visualizacion publica de esas especificaciones

### 7.6 Categorias y marcas

El panel permite mantener:

- categorias jerarquicas
- marcas
- vinculacion entre productos y categorias
- navegacion publica derivada de esa estructura

### 7.7 Precios

El sistema soporta:

- precio minorista
- precio mayorista
- listas de precios
- reglas comerciales
- visibilidad de precios

El admin puede definir si los precios quedan:

- publicos
- visibles solo con inicio de sesion
- ocultos

Esto aplica al catalogo, destacados, ficha de producto y otras vistas del storefront.

### 7.8 Usuarios

El panel incluye gestion de usuarios por tenant:

- alta
- aprobacion
- cambio de rol
- cambio de estado
- asignacion de lista de precios

### 7.9 Pedidos

El admin puede revisar pedidos y su informacion asociada para operacion comercial.

## 8. Integracion con ERP o sistema de gestion

El backend expone una capa de integracion para sincronizacion de productos.

### 8.1 Capacidades

- ping de conectividad
- autenticacion por token
- compatibilidad con consumer key / secret
- alta o actualizacion de productos por `external_id`
- actualizacion de stock
- actualizacion de precios
- actualizacion de estado base del producto

### 8.2 Datos sincronizables

- codigo externo
- sku
- nombre
- descripcion
- imagenes
- marca
- stock
- precio minorista
- precio mayorista
- categoria
- estado activo/inactivo

### 8.3 Control compartido

El sistema externo es la fuente de verdad para:

- stock
- precio base
- estado base
- identificador externo

El ecommerce mantiene control sobre:

- visibilidad en web
- contenido editorial
- bloqueo manual

## 9. Flujos principales

### 9.1 Flujo de compra

1. El visitante entra al storefront.
2. Navega home, categorias, marcas o catalogo completo.
3. Filtra productos por categoria, marca, precio o stock.
4. Abre un producto o una variacion.
5. Agrega al carrito.
6. Completa checkout.
7. Se genera el pedido.

### 9.2 Flujo de administracion

1. El admin inicia sesion.
2. Ingresa al panel.
3. Actualiza catalogo, categorias, marcas o contenido.
4. Ajusta precios, visibilidad y configuracion comercial.
5. Publica cambios.

### 9.3 Flujo de integracion

1. El sistema externo arma un payload JSON.
2. Consume el endpoint de sincronizacion.
3. El backend crea o actualiza productos.
4. El storefront refleja el nuevo stock y los precios sincronizados.

## 10. Diferenciales del sistema

- multi-tenant real
- storefront y admin en la misma plataforma
- edicion de contenido y catalogo sin depender del codigo
- reglas de visibilidad de precios
- variantes y productos raiz
- especificaciones tecnicas administrables
- capa de integracion ERP lista para consumo por terceros
- despliegue separado de frontend y backend

## 11. Limitaciones y consideraciones operativas

- el backend actualmente sirve `uploads/` locales; para una operacion mas robusta conviene usar storage externo
- la calidad del catalogo depende de que categorias, marcas y productos esten bien relacionados
- las integraciones deben enviar `external_id` estable para evitar duplicados
- la configuracion CORS debe mantenerse alineada con la URL publica del frontend

## 12. Conclusion

Proyecto Teflon no es solo una web de productos. Es una plataforma ecommerce multi-tenant con administracion comercial, contenido editable, reglas de precios, detalle tecnico de producto y sincronizacion con sistemas externos. El sistema ya cubre el nucleo operativo para vender, administrar catalogo y conectar la tienda con una fuente externa de stock y precios.
