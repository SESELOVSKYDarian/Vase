## Table `usuarios`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `varchar` |  |
| `username` | `varchar` |  Unique |
| `rol` | `user_role` |  |
| `activo` | `bool` |  Nullable |
| `creado_en` | `timestamp` |  Nullable |
| `auth_user_id` | `uuid` |  Nullable Unique |

## Table `mesas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `numero` | `int4` |  Unique |
| `capacidad` | `int4` |  Nullable |
| `pos_x` | `numeric` |  Nullable |
| `pos_y` | `numeric` |  Nullable |
| `estado` | `mesa_estado` |  Nullable |
| `creada_en` | `timestamp` |  Nullable |
| `piso` | `text` |  Nullable |
| `zona` | `text` |  Nullable |
| `forma` | `text` |  Nullable |
| `disponible` | `bool` |  Nullable |

## Table `categorias`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `varchar` |  |
| `color` | `varchar` |  Nullable |

## Table `productos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `categoria_id` | `uuid` |  Nullable |
| `nombre` | `varchar` |  |
| `descripcion` | `text` |  Nullable |
| `precio` | `numeric` |  |
| `stock_actual` | `numeric` |  Nullable |
| `disponible` | `bool` |  Nullable |
| `creado_en` | `timestamp` |  Nullable |
| `stock` | `int4` |  Nullable |

## Table `pedidos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `mesa_id` | `uuid` |  Nullable |
| `usuario_id` | `uuid` |  Nullable |
| `estado` | `pedido_estado` |  Nullable |
| `subtotal` | `numeric` |  Nullable |
| `impuestos` | `numeric` |  Nullable |
| `total` | `numeric` |  Nullable |
| `abierto_en` | `timestamp` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `comensales` | `int4` |  Nullable |

## Table `pedido_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pedido_id` | `uuid` |  Nullable |
| `producto_id` | `uuid` |  Nullable |
| `cantidad` | `numeric` |  |
| `precio_unitario` | `numeric` |  |
| `subtotal` | `numeric` |  |
| `estado` | `pedido_estado` |  Nullable |
| `notas` | `text` |  Nullable |

## Table `facturas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pedido_id` | `uuid` |  Nullable |
| `estado` | `factura_estado` |  Nullable |
| `cae` | `varchar` |  Nullable |
| `qr_fiscal` | `text` |  Nullable |
| `total` | `numeric` |  Nullable |
| `creada_en` | `timestamp` |  Nullable |
| `pago_id` | `uuid` |  Nullable |
| `metodo_pago` | `text` |  Nullable |
| `descuento` | `numeric` |  Nullable |
| `tipo_cbte` | `int4` |  Nullable |
| `punto_venta` | `int4` |  Nullable |
| `numero_cbte` | `int8` |  Nullable |
| `vencimiento_cae` | `text` |  Nullable |
| `qr` | `text` |  Nullable |
| `error` | `text` |  Nullable |
| `mesa_id` | `uuid` |  Nullable |
| `numero_comprobante` | `text` |  Nullable |
| `subtotal` | `numeric` |  Nullable |
| `impuestos` | `numeric` |  Nullable |
| `arca_estado` | `text` |  Nullable |
| `arca_error` | `text` |  Nullable |
| `creado_en` | `timestamptz` |  Nullable |
| `tipo_comprobante` | `int4` |  Nullable |

## Table `reservas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre_cliente` | `varchar` |  |
| `telefono` | `varchar` |  Nullable |
| `cantidad_personas` | `int4` |  |
| `fecha` | `date` |  |
| `hora` | `time` |  |
| `creada_en` | `timestamp` |  Nullable |
| `mesa_id` | `uuid` |  Nullable |
| `email_cliente` | `text` |  Nullable |
| `codigo_reserva` | `text` |  Nullable |
| `mesas_ids` | `jsonb` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `email` | `text` |  Nullable |
| `estado` | `text` |  Nullable |
| `cancelada_en` | `timestamptz` |  Nullable |

## Table `movimientos_stock`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `producto_id` | `uuid` |  Nullable |
| `cantidad` | `numeric` |  |
| `motivo` | `text` |  Nullable |
| `creado_en` | `timestamp` |  Nullable |
| `tipo` | `text` |  Nullable |
| `stock_anterior` | `numeric` |  Nullable |
| `stock_nuevo` | `numeric` |  Nullable |
| `pedido_id` | `uuid` |  Nullable |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `text` |  Nullable |
| `telefono` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `pagos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pedido_id` | `uuid` |  |
| `mesa_id` | `uuid` |  Nullable |
| `metodo_pago` | `text` |  |
| `monto` | `numeric` |  |
| `estado` | `text` |  |
| `referencia_pago` | `text` |  Nullable |
| `proveedor` | `text` |  Nullable |
| `recibido_por` | `text` |  Nullable |
| `vuelto` | `numeric` |  Nullable |
| `creado_en` | `timestamptz` |  Nullable |
| `actualizado_en` | `timestamptz` |  Nullable |
| `expira_en` | `timestamptz` |  Nullable |
| `monto_recibido` | `numeric` |  Nullable |
| `temporal` | `bool` |  Nullable |
| `arca_estado` | `text` |  Nullable |
| `arca_tipo_cbte` | `int4` |  Nullable |
| `arca_punto_venta` | `int4` |  Nullable |
| `arca_numero_cbte` | `int8` |  Nullable |
| `arca_cae` | `text` |  Nullable |
| `arca_vencimiento_cae` | `text` |  Nullable |
| `arca_qr` | `text` |  Nullable |
| `arca_error` | `text` |  Nullable |
| `tipo_tarjeta` | `text` |  Nullable |
| `marca_tarjeta` | `text` |  Nullable |
| `banco_tarjeta` | `text` |  Nullable |
| `proveedor_billetera` | `text` |  Nullable |
| `confirmado_en` | `timestamptz` |  Nullable |
| `tipo_comprobante` | `int4` |  Nullable |

## Table `tickets_soporte`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `usuario_id` | `uuid` |  Nullable |
| `auth_user_id` | `uuid` |  Nullable |
| `nombre_usuario` | `varchar` |  Nullable |
| `rol_usuario` | `text` |  Nullable |
| `asunto` | `varchar` |  |
| `categoria` | `text` |  |
| `descripcion` | `text` |  |
| `estado` | `text` |  |
| `prioridad` | `text` |  |
| `respuesta_interna` | `text` |  Nullable |
| `creado_en` | `timestamptz` |  Nullable |
| `actualizado_en` | `timestamptz` |  Nullable |
| `resuelto_en` | `timestamptz` |  Nullable |

## Table `mozos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `varchar` |  |
| `apellido` | `varchar` |  |
| `zona` | `text` |  |
| `posicion_ciclo` | `int4` |  |
| `activo` | `bool` |  |
| `creado_en` | `timestamptz` |  Nullable |

