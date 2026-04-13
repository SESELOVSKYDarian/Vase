# Integracion ERP / Sistema de Gestion con Ecommerce

## Objetivo

Integrar un sistema de gestion externo con el ecommerce para sincronizar productos, stock y precios mediante API.

El sistema de gestion actua como cliente de la API del ecommerce:

1. Lee productos desde su propia base de datos.
2. Arma un payload JSON.
3. Hace `POST` al endpoint de sincronizacion.
4. El ecommerce crea o actualiza productos en `product_cache`.

## Endpoint

`POST /api/v1/integrations/products/sync`

Ejemplo local:

`http://localhost:4000/api/v1/integrations/products/sync`

Ejemplo productivo actual:

`https://proyecto-teflon.onrender.com/api/v1/integrations/products/sync`

Endpoint de prueba de conexion:

`GET /api/v1/integrations/ping`

## Capa de compatibilidad para sistemas de gestion

Si el sistema de gestion solo permite configurar `Dominio`, `Consumer Key` y `Consumer Secret`, tambien puede usar esta capa:

- `GET /api/v1/integrations/gestion/ping`
- `POST /api/v1/integrations/gestion/producto`
- `POST /api/v1/integrations/gestion/productos`

Tambien existe alias tecnico:

- `GET /api/v1/integrations/compat/ping`
- `POST /api/v1/integrations/compat/products/sync`

## Autenticacion

Headers requeridos:

```http
x-api-key: TU_TOKEN
x-tenant-id: TU_TENANT_UUID
Content-Type: application/json
```

Nota:

- si el token pertenece al tenant correcto, `x-tenant-id` puede omitirse
- si igual se envia, debe coincidir con el tenant del token

Tambien se acepta:

```http
Authorization: Bearer TU_TOKEN
```

El token debe tener scope:

`products:sync`

### Compatibilidad Consumer Key / Secret

Si el sistema no trabaja con headers custom, puede autenticarse con:

- `consumer_key`
- `consumer_secret`

Formas aceptadas:

- query string
- body JSON
- `application/x-www-form-urlencoded`
- `Basic Auth`

## Datos de acceso de este tenant

- `base_url`: `https://proyecto-teflon.onrender.com`
- `tenant_id`: `636736e2-e135-44cd-ac5c-5d4ccb839a73`
- `token`: `erp-sync-local-001`

Si el tenant no tiene token generado, el panel admin lo crea automaticamente al abrir `Integraciones`.

## Prueba de conexion

Antes de sincronizar productos, el sistema de gestion deberia probar:

`GET /api/v1/integrations/ping`

Ejemplo de respuesta:

```json
{
  "ok": true,
  "tenant_id": "636736e2-e135-44cd-ac5c-5d4ccb839a73",
  "token_name": "ERP Sync Local",
  "scope": "products:sync",
  "server_time": "2026-03-13T18:00:00.000Z"
}
```

Prueba de conexion en modo compatibilidad:

`GET /api/v1/integrations/gestion/ping?consumer_key=TU_KEY&consumer_secret=TU_SECRET`

## Formato del request

```json
{
  "source_system": "sistema-gestion-av",
  "items": [
    {
      "external_id": "PROD-1001",
      "sku": "PROD-1001",
      "name": "Notebook Lenovo 15",
      "price_retail": 1250000,
      "price_wholesale": 1170000,
      "stock": 6,
      "is_active": true,
      "brand": "Lenovo",
      "description": "Notebook 15 pulgadas",
      "images": [
        "https://sistema.local/media/prod-1001.jpg"
      ]
    }
  ]
}
```

## Formato alternativo compatible con gestion

El backend tambien acepta formatos mas cercanos a los nombres que suelen usar los sistemas de gestion:

```json
{
  "source_system": "gestion-escritorio",
  "producto": {
    "codigo_propio": "666",
    "detalle_ampliado": "ABLANDADOR AGUA AF1500 FLUVIAL",
    "detalle_abreviado": "ABLANDADOR AGUA AF1500 FLUVIAL",
    "texto_asociado": "Descripcion ampliada del articulo enviada por el sistema de gestion.",
    "familia": "UUID_CATEGORIA_BOMBAS",
    "precio": 1465583,
    "mayorista": 0,
    "disponibilidad": 12,
    "activo": true,
    "imagenes": [
      "https://dominio-del-sistema.com/imagenes/666_1.jpg",
      "https://dominio-del-sistema.com/imagenes/666_2.jpg"
    ]
  }
}
```

Tambien se aceptan aliases como:

- `codigo`, `codigo_propio`, `codigo_producto`
- `titulo`, `detalle_ampliado`
- `descripcion`, `texto_asociado`, `desc_ampliada`
- `familia`, `category` o `categoria`
- `precio`, `precio_venta`, `precio_iva`
- `mayorista`, `precio_mayorista`
- `disponibilidad`, `stock_actual`
- `activo`
- `imagenes`, `imagen1..8`

Nota:

- si el sistema envia `familia`, `category`, `categoria`, `category_id` o `category_ids`, puede mandar:
  - UUID real de categoria
  - slug de categoria
  - `erp_id` de categoria
  - nombre de categoria
- si la categoria no existe y llega como texto, el backend la crea en forma plana para no frenar la sincronizacion

## Campos soportados por item

Campos recomendados:

- `external_id`: identificador unico y estable del sistema de gestion. Obligatorio.
- `sku`: codigo comercial del producto.
- `name`: nombre del producto.
- `price_retail`: precio minorista.
- `price_wholesale`: precio mayorista.
- `stock`: stock disponible.
- `is_active`: estado base en el sistema de gestion.
- `brand`: marca.
- `description`: descripcion base.
- `images`: array de URLs o imagenes.
- `category_id` o `category_ids`: UUIDs, slugs, `erp_id` o nombres de categoria.

Importante:

- `stock` viaja dentro del mismo item de producto.
- No hace falta una URL o endpoint separado para stock si el sistema ya arma el JSON de productos.

## Contrato exacto para el proveedor

### 1. Campo estrictamente obligatorio

El unico campo estrictamente obligatorio por item es:

- `external_id`

Si falta, ese item vuelve con:

```json
{
  "ok": false,
  "status": "error",
  "action": "ignored",
  "error": "external_id_required"
}
```

### 2. Campos opcionales con fallback

Estos campos no frenan el item si faltan:

- `sku`
- `name`
- `description`
- `brand`
- `price_retail`
- `price_wholesale`
- `stock`
- `is_active`
- `images`
- `category_id` / `category_ids` / `category` / `familia`

Comportamiento real del backend:

- si falta `name`, intenta usar `sku`, luego `codigo`, luego `external_id`
- si falta `price_retail`, usa `0` al crear y mantiene el precio actual al actualizar
- si falta `price_wholesale`, usa el mayorista actual o el minorista
- si falta `stock`, usa `0` al crear y mantiene el stock actual al actualizar
- si falta `is_active`, asume `true` al crear y mantiene el estado actual al actualizar
- si falta `description`, `brand` o `images`, no falla; solo no actualiza esos campos si no llegaron

### 3. Regla create / update

El proveedor no tiene que decidir si crea o actualiza. Solo tiene que enviar `external_id`.

El ecommerce hace esto:

- si no existe un producto con ese `external_id`, crea
- si ya existe, actualiza

La respuesta por item informa lo que paso:

- `status: "created"` + `action: "create"`
- `status: "updated"` + `action: "update"`
- `status: "error"` + `action: "ignored" | "create" | "update"`

### 3.1. Regla especial para updates

Si el producto ya existe, el backend ahora exige update completo.

En un item de update deben venir, ademas de `external_id`:

- `sku`
- `name`
- `price_retail`
- `stock`
- `is_active`
- `brand`
- `description`
- `category` o `category_id` / `category_ids` / `familia`

Si falta cualquiera de esos campos, ese item no se actualiza y vuelve con:

```json
{
  "ok": false,
  "status": "error",
  "action": "update",
  "error": "update_payload_incomplete",
  "missing_fields": [
    "description",
    "category"
  ]
}
```

Esto evita updates parciales silenciosos y obliga al sistema de gestion a enviar el producto completo.

### 4. Regla de errores por lote

La sincronizacion es parcial. Un item con error no invalida todo el lote.

El proveedor debe leer siempre:

- `created`
- `updated`
- `failed`
- `item_results`

`item_results[index]` corresponde a la misma posicion enviada en el array original.

### 5. Errores por item que el proveedor debe registrar

Errores concretos que hoy puede devolver cada item:

- `invalid_product_item`
- `external_id_required`
- `update_payload_incomplete`
- `invalid_category_ids`
- `sync_item_failed`

Tambien puede propagar `err.code` o `err.message` si una validacion interna falla de forma mas especifica.

### 6. Recomendacion minima de implementacion

El sistema de gestion deberia registrar por cada item:

- `index`
- `external_id`
- `status`
- `action`
- `ok`
- `product_id` si vino
- `error` si vino

Con eso ya puede dejar trazabilidad de:

- producto creado
- producto actualizado
- producto rechazado
- motivo exacto del rechazo

## Reglas de negocio

- `external_id` debe ser unico por tenant y no debe cambiar con el tiempo.
- Si el producto no existe, se crea.
- Si ya existe por `external_id`, se actualiza.
- No se hace borrado fisico desde la integracion.
- Si `is_active = false`, el producto queda inactivo a nivel origen.
- El admin del ecommerce mantiene control sobre visibilidad final y bloqueo manual.

## Que controla el sistema de gestion

El sistema de gestion es fuente de verdad para:

- stock
- precio base
- estado base del producto
- codigo externo

## Que controla el ecommerce

El admin del ecommerce mantiene control sobre:

- `Visible en web`
- contenido editorial/manual
- `Bloquear sync admin`

Eso significa:

- si el admin oculta un producto, el sync no lo vuelve a publicar automaticamente
- si el admin activa `admin_locked`, el sync no debe pisar contenido editorial/manual

## Mapeo sugerido desde la base del sistema de gestion

Ejemplo de mapeo:

| Base sistema de gestion | Campo API ecommerce |
| --- | --- |
| `codigo_producto` | `external_id` |
| `codigo_producto` | `sku` |
| `nombre` | `name` |
| `precio_venta` | `price_retail` |
| `precio_mayorista` | `price_wholesale` |
| `stock_actual` | `stock` |
| `activo` | `is_active` |
| `marca` | `brand` |
| `descripcion` | `description` |
| `familia` | `category_id` |
| `imagen_url` | `images[0]` |

## Respuesta esperada

Creacion:

```json
{
  "ok": true,
  "tenant_id": "636736e2-e135-44cd-ac5c-5d4ccb839a73",
  "source_system": "sistema-gestion-av",
  "total": 1,
  "created": 1,
  "updated": 0
}
```

Actualizacion:

```json
{
  "ok": true,
  "tenant_id": "636736e2-e135-44cd-ac5c-5d4ccb839a73",
  "source_system": "sistema-gestion-av",
  "total": 1,
  "created": 0,
  "updated": 1,
  "categories_created": 0
}
```

Lote mixto con altas, actualizaciones y errores:

```json
{
  "ok": false,
  "partial": true,
  "tenant_id": "636736e2-e135-44cd-ac5c-5d4ccb839a73",
  "source_system": "sistema-gestion-av",
  "total": 3,
  "created": 1,
  "updated": 1,
  "failed": 1,
  "categories_created": 0,
  "item_results": [
    {
      "index": 0,
      "external_id": "PROD-1001",
      "sku": "PROD-1001",
      "name": "Notebook Lenovo 15",
      "source_system": "sistema-gestion-av",
      "ok": true,
      "status": "created",
      "action": "create",
      "product_id": "UUID_PRODUCTO_CREADO",
      "categories_created": 0
    },
    {
      "index": 1,
      "external_id": "PROD-0008",
      "sku": "PROD-0008",
      "name": "Producto existente",
      "source_system": "sistema-gestion-av",
      "ok": true,
      "status": "updated",
      "action": "update",
      "product_id": "UUID_PRODUCTO_EXISTENTE",
      "categories_created": 0
    },
    {
      "index": 2,
      "external_id": "PROD-0099",
      "sku": "PROD-0099",
      "name": "Producto incompleto",
      "source_system": "sistema-gestion-av",
      "ok": false,
      "status": "error",
      "action": "update",
      "error": "update_payload_incomplete",
      "missing_fields": [
        "description",
        "category"
      ]
    }
  ]
}
```

Notas:

- el lote ya no se invalida completo por un item con error
- cada posicion enviada vuelve en `item_results[index]`
- `created`, `updated` y `failed` resumen el resultado del lote
- si `ok = false` y `partial = true`, hubo mezcla de exitos y errores
- si el sistema de gestion necesita registrar producto por producto, debe leer `item_results`

## Errores comunes

### Errores globales HTTP

Estos errores frenan toda la request y no dependen de un producto puntual:

`401 api_key_required`
- falta `x-api-key` o `Authorization: Bearer`

`403 invalid_api_key`
- el token no existe o ya no es valido

`403 api_scope_required`
- el token no tiene scope configurado

`403 insufficient_api_scope`
- el token existe, pero no tiene `products:sync`

`400 tenant_required`
- no se pudo resolver `tenant_id` desde el token ni desde el header

`400 invalid_tenant_id`
- el `tenant_id` enviado no tiene formato UUID valido

`403 tenant_mismatch`
- el `x-tenant-id` enviado no coincide con el tenant del token

`400 products_array_required`
- el body no contiene `items`, `products`, `productos` o un item interpretable

### Errores por item dentro de `item_results`

Estos errores no frenan todo el lote. Solo marcan ese item como fallido:

`invalid_product_item`
- la posicion enviada no es un objeto JSON valido

`external_id_required`
- el item no trae identificador estable

`update_payload_incomplete`
- el item intenta actualizar un producto existente pero no trae todos los campos obligatorios del update
- el backend devuelve tambien `missing_fields`

`invalid_category_ids`
- llegaron UUIDs de categoria que no existen para ese tenant

### Como distinguir error global de error por item

- si la respuesta HTTP es `4xx`, fallo la request completa
- si la respuesta HTTP es `200` pero `failed > 0`, hubo error parcial
- si `ok = false` y `partial = true`, hubo mezcla de items correctos e incorrectos

## Recomendacion de implementacion en el sistema de gestion

Agregar un modulo o pantalla interna con:

- URL API ecommerce
- Token
- Tenant UUID
- Source system
- Boton `Probar conexion`
- Boton `Sincronizar ahora`
- Log de resultado

## Ejemplo de implementacion en JavaScript

```js
async function syncProducts(products) {
  const response = await fetch("http://localhost:4000/api/v1/integrations/products/sync", {
    method: "POST",
    headers: {
      "x-api-key": "erp-sync-local-001",
      "x-tenant-id": "636736e2-e135-44cd-ac5c-5d4ccb839a73",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      source_system: "sistema-gestion-av",
      items: products
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "sync_failed");
  }

  for (const itemResult of data.item_results || []) {
    if (itemResult.ok) {
      console.log("SYNC OK", itemResult.external_id, itemResult.status, itemResult.product_id);
      continue;
    }

    console.error("SYNC ERROR", itemResult.external_id, itemResult.error);
  }

  return data;
}
```

## Ejemplo de consulta SQL del lado del sistema de gestion

Ejemplo conceptual:

```sql
select
  codigo_producto as external_id,
  codigo_producto as sku,
  nombre as name,
  precio_venta as price_retail,
  precio_mayorista as price_wholesale,
  stock_actual as stock,
  activo as is_active,
  marca as brand,
  descripcion as description,
  imagen_url
from productos
where eliminado = 0;
```

Luego cada fila debe transformarse a este formato:

```json
{
  "external_id": "PROD-1001",
  "sku": "PROD-1001",
  "name": "Producto",
  "price_retail": 1000,
  "price_wholesale": 900,
  "stock": 20,
  "is_active": true,
  "brand": "Marca",
  "description": "Descripcion",
  "images": [
    "https://..."
  ]
}
```

## Recomendaciones tecnicas

- No escribir directamente en la base del ecommerce.
- No usar `name` como identificador.
- No cambiar `external_id` para el mismo producto.
- Preferir sync por lotes.
- Registrar la respuesta completa del lote y tambien `item_results`.
- Si el sistema quiere marcar estado por producto, debe usar `item_results[index]`.
- Si hay imagenes, enviar URLs publicas o accesibles por el ecommerce.

## Texto corto para pasar al proveedor del sistema de gestion

Necesitamos que el sistema de gestion lea productos desde su propia base de datos y los envie por API al ecommerce. El endpoint es `POST /api/v1/integrations/products/sync`. Deben enviar `x-api-key`, `x-tenant-id` y un JSON con `source_system` + `items`. Cada item debe incluir como minimo `external_id`, `sku`, `name`, `price_retail`, `stock` e `is_active`. El `external_id` debe ser estable y unico, porque se usa para crear o actualizar productos. No deben escribir directamente en la base del ecommerce; toda la integracion debe hacerse por API.

Si su software solo permite configurar `Dominio`, `Consumer Key` y `Consumer Secret`, puede usar la capa de compatibilidad del ecommerce con `GET /api/v1/integrations/gestion/ping` y `POST /api/v1/integrations/gestion/producto` o `POST /api/v1/integrations/gestion/productos`.
