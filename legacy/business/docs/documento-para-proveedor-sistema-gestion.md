# Documento para proveedor del sistema de gestion

## Objetivo

Integrar el sistema de gestion con el ecommerce para sincronizar productos, stock y precios por API.

La integracion no escribe directo en la base del ecommerce.

La integracion trabaja asi:

1. el sistema de gestion lee sus propios productos
2. arma un JSON
3. hace un `POST` a la API del ecommerce
4. el ecommerce crea o actualiza productos segun `external_id`

## Punto importante sobre el contrato

Esta integracion no trabaja con:

- `GET` lista de productos
- `PUT` por producto
- `DELETE` por producto

Esta integracion trabaja con:

- `GET /ping` para probar conexion
- `POST /products/sync` para crear o actualizar

El `POST` funciona como `upsert`:

- si el `external_id` no existe, crea
- si el `external_id` ya existe, actualiza

Tambien se puede forzar la operacion por item con:

- `operation: "create"`
- `operation: "update"`
- `operation: "upsert"`

## Datos productivos

- `base_url`: `https://proyecto-teflon.onrender.com`
- `tenant_id`: `636736e2-e135-44cd-ac5c-5d4ccb839a73`
- `token`: completar con el token actual desde `Admin > Integraciones`

## Endpoints

### Conexion

- `GET /api/v1/integrations/ping`

Ejemplo:

```txt
GET https://proyecto-teflon.onrender.com/api/v1/integrations/ping
```

### Sync principal

- `POST /api/v1/integrations/products/sync`

Ejemplo:

```txt
POST https://proyecto-teflon.onrender.com/api/v1/integrations/products/sync
```

### Compatibilidad para sistemas que solo aceptan Consumer Key / Secret

- `GET /api/v1/integrations/gestion/ping`
- `POST /api/v1/integrations/gestion/producto`
- `POST /api/v1/integrations/gestion/productos`

Alias tecnico equivalente:

- `GET /api/v1/integrations/compat/ping`
- `POST /api/v1/integrations/compat/products/sync`

### Schema tecnico

- `GET /api/v1/integrations/schema/product`

Sirve para inspeccionar el schema publicado por el backend.

## Autenticacion

### Modo recomendado

Headers:

```http
x-api-key: TU_TOKEN
x-tenant-id: 636736e2-e135-44cd-ac5c-5d4ccb839a73
Content-Type: application/json
```

Tambien se acepta:

```http
Authorization: Bearer TU_TOKEN
```

Notas:

- si el token pertenece a ese tenant, `x-tenant-id` puede omitirse
- si se envia `x-tenant-id`, debe coincidir con el tenant del token
- el token debe tener scope `products:sync`

### Modo compatibilidad

Si el sistema no soporta headers custom, puede autenticarse con:

- `consumer_key`
- `consumer_secret`

Formas aceptadas:

- query string
- body JSON
- `application/x-www-form-urlencoded`
- `Basic Auth`

## Formato del request

```json
{
  "source_system": "sistema-gestion-av",
  "items": [
    {
      "operation": "upsert",
      "external_id": "PROD-1001",
      "sku": "PROD-1001",
      "name": "Producto",
      "price_retail": 1000,
      "price_wholesale": 900,
      "stock": 20,
      "is_active": true,
      "brand": "Marca",
      "description": "Descripcion",
      "category_id": "UUID_O_NOMBRE_DE_CATEGORIA",
      "images": [
        "https://dominio-del-sistema.com/imagenes/prod-1001.jpg"
      ]
    }
  ]
}
```

## Formatos alternativos aceptados

El backend acepta aliases comunes de sistemas de gestion.

Ejemplos:

- `codigo`, `codigo_propio`, `codigo_producto` como alias de identificador/SKU
- `titulo`, `detalle_ampliado` como alias de nombre
- `descripcion`, `texto_asociado`, `desc_ampliada` como alias de descripcion
- `familia`, `category`, `categoria`, `category_id`, `category_ids`
- `precio`, `precio_venta`, `precio_iva`
- `mayorista`, `precio_mayorista`
- `disponibilidad`, `stock_actual`
- `activo`
- `imagenes`, `imagen1..8`

Tambien acepta payloads tipo:

```json
{
  "source_system": "gestion-escritorio",
  "producto": {
    "codigo_propio": "666",
    "detalle_ampliado": "ABLANDADOR AGUA AF1500 FLUVIAL",
    "texto_asociado": "Descripcion ampliada enviada por el sistema de gestion.",
    "familia": "Bombas",
    "precio": 1465583,
    "mayorista": 0,
    "disponibilidad": 12,
    "activo": true,
    "imagenes": [
      "https://dominio-del-sistema.com/imagenes/666_1.jpg"
    ]
  }
}
```

## Regla de categorias

En `category`, `categoria`, `familia`, `category_id` o `category_ids` se puede enviar:

- UUID real de categoria
- slug de categoria
- `erp_id` de categoria
- nombre de categoria

Si la categoria no existe y llega como texto, el ecommerce la crea automaticamente en forma plana.

## Campos obligatorios y regla de create/update

### Create

Para crear, el unico campo estrictamente obligatorio es:

- `external_id`

El resto puede venir o no, aunque lo correcto es enviar el producto completo.

Si el proveedor quiere forzar alta y evitar que un `external_id` existente se actualice, puede enviar:

```json
{
  "operation": "create"
}
```

Si ese `external_id` ya existe, el item vuelve con:

```json
{
  "ok": false,
  "status": "error",
  "action": "create",
  "error": "external_id_already_exists"
}
```

### Update

Si el `external_id` ya existe, el backend exige update completo.

Campos obligatorios para update:

- `external_id`
- `sku`
- `name`
- `price_retail`
- `stock`
- `is_active`
- `brand`
- `description`
- `category` o `category_id` / `category_ids` / `familia`

Si falta cualquiera de esos campos, ese item no se actualiza.

Si el proveedor quiere forzar update y evitar que un `external_id` inexistente se cree por error, puede enviar:

```json
{
  "operation": "update"
}
```

Si ese `external_id` no existe, el item vuelve con:

```json
{
  "ok": false,
  "status": "error",
  "action": "update",
  "error": "product_not_found"
}
```

Si no se envia `operation`, el comportamiento por defecto es:

```json
{
  "operation": "upsert"
}
```

## Ejemplo exacto del caso pedido por el proveedor

Request:

```json
{
  "source_system": "sistema-gestion-av",
  "items": [
    {
      "operation": "create",
      "external_id": "PROD-NUEVO-001",
      "sku": "PROD-NUEVO-001",
      "name": "Producto nuevo",
      "price_retail": 15000,
      "stock": 10,
      "is_active": true,
      "brand": "Marca Demo",
      "description": "Descripcion completa",
      "category": "Sanitarios"
    },
    {
      "operation": "update",
      "external_id": "PROD-EXISTENTE-001",
      "sku": "PROD-EXISTENTE-001",
      "name": "Producto existente actualizado",
      "price_retail": 17000,
      "stock": 8,
      "is_active": true,
      "brand": "Marca Demo",
      "description": "Descripcion actualizada",
      "category": "Sanitarios"
    },
    {
      "operation": "update",
      "external_id": "PROD-INVALIDO-001",
      "sku": "PROD-INVALIDO-001",
      "name": "Producto con error",
      "price_retail": 19000,
      "stock": 5,
      "is_active": true
    }
  ]
}
```

Respuesta esperada:

```json
{
  "ok": false,
  "partial": true,
  "total": 3,
  "created": 1,
  "updated": 1,
  "failed": 1,
  "item_results": [
    {
      "index": 0,
      "requested_operation": "create",
      "external_id": "PROD-NUEVO-001",
      "ok": true,
      "status": "created",
      "action": "create",
      "product_id": "UUID_INTERNO_DEL_ECOMMERCE"
    },
    {
      "index": 1,
      "requested_operation": "update",
      "external_id": "PROD-EXISTENTE-001",
      "ok": true,
      "status": "updated",
      "action": "update",
      "product_id": "UUID_INTERNO_DEL_ECOMMERCE"
    },
    {
      "index": 2,
      "requested_operation": "update",
      "external_id": "PROD-INVALIDO-001",
      "ok": false,
      "status": "error",
      "action": "update",
      "error": "update_payload_incomplete",
      "missing_fields": [
        "brand",
        "description",
        "category"
      ]
    }
  ]
}
```

## Respuesta del sync

La API devuelve resultado por lote y por item.

Ejemplo:

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
      "requested_operation": "create",
      "external_id": "PROD-1001",
      "sku": "PROD-1001",
      "name": "Producto nuevo",
      "source_system": "sistema-gestion-av",
      "ok": true,
      "status": "created",
      "action": "create",
      "product_id": "UUID_PRODUCTO_CREADO",
      "categories_created": 0
    },
    {
      "index": 1,
      "requested_operation": "update",
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
      "requested_operation": "update",
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

## Como interpretar la respuesta

- `created`: cantidad de productos creados
- `updated`: cantidad de productos actualizados
- `failed`: cantidad de items fallidos
- `item_results[index]`: resultado del item enviado en esa posicion
- `requested_operation`: operacion pedida por el proveedor para ese item

Estados esperables por item:

- `created`
- `updated`
- `error`

Acciones esperables por item:

- `create`
- `update`
- `ignored`

## Errores globales HTTP

Estos errores frenan toda la request:

- `401 api_key_required`
- `403 invalid_api_key`
- `403 api_scope_required`
- `403 insufficient_api_scope`
- `400 tenant_required`
- `400 invalid_tenant_id`
- `403 tenant_mismatch`
- `400 products_array_required`

## Errores por item dentro de item_results

Estos errores no frenan todo el lote. Solo fallan esos items:

- `invalid_product_item`
- `external_id_required`
- `update_payload_incomplete`
- `invalid_category_ids`
- `product_not_found`
- `external_id_already_exists`
- `sync_item_failed`

### Significado de los mas importantes

`external_id_required`
- falta el identificador estable del producto

`update_payload_incomplete`
- el producto ya existia y el update vino incompleto
- el backend devuelve tambien `missing_fields`

`product_not_found`
- se envio `operation: "update"` para un `external_id` que no existe

`external_id_already_exists`
- se envio `operation: "create"` para un `external_id` que ya existe

`invalid_category_ids`
- llegaron UUIDs de categoria que no existen para el tenant

## Recomendacion minima para el sistema de gestion

El proveedor deberia guardar por cada item:

- `index`
- `external_id`
- `status`
- `action`
- `ok`
- `product_id`
- `error`
- `missing_fields`

Con eso puede registrar correctamente:

- que producto se creo
- que producto se actualizo
- que producto fallo
- por que fallo

## Recomendacion operativa

El sistema de gestion deberia tener una pantalla o modulo con:

- URL API ecommerce
- token
- tenant UUID
- source system
- boton `Probar conexion`
- boton `Sincronizar ahora`
- log de request y response

## Ejemplo JavaScript

```js
async function syncProducts(products) {
  const response = await fetch("https://proyecto-teflon.onrender.com/api/v1/integrations/products/sync", {
    method: "POST",
    headers: {
      "x-api-key": "TU_TOKEN",
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

    console.error("SYNC ERROR", itemResult.external_id, itemResult.error, itemResult.missing_fields || []);
  }

  return data;
}
```

## Resumen corto para el proveedor

La integracion del ecommerce funciona por API HTTP. Deben consumir `GET /api/v1/integrations/ping` para probar conexion y `POST /api/v1/integrations/products/sync` para sincronizar productos. La logica por defecto es `upsert` por `external_id`: si no existe, crea; si existe, actualiza. Si necesitan control estricto, pueden enviar `operation: "create"` o `operation: "update"` por item. En create, el unico campo estrictamente obligatorio es `external_id`. En update, el item debe venir completo con `sku`, `name`, `price_retail`, `stock`, `is_active`, `brand`, `description` y `category`; si falta alguno, la API responde `update_payload_incomplete` con `missing_fields`. Si se fuerza `update` y el producto no existe, responde `product_not_found`. Si se fuerza `create` y el producto ya existe, responde `external_id_already_exists`. La respuesta del sync devuelve resultado por lote y por item en `item_results`, por lo que el sistema debe registrar por separado que productos se crearon, cuales se actualizaron y cuales devolvieron error.
