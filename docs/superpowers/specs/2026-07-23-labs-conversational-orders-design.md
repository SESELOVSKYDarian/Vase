# Pedidos conversacionales confirmados en Vase Labs

## Objetivo

Permitir que el chatbot arme un pedido y lo cree en Vase Business únicamente
después de una confirmación explícita del cliente, reutilizando precios, stock,
envíos, sucursales y reglas configuradas en Business.

## Fuente de verdad

Vase Business es autoritativo para:

- catálogo, precios y stock;
- métodos de pago;
- sucursales y retiro;
- zonas, distancias, costos y reglas de envío;
- cotización;
- pedido final y número de pedido.

Labs no duplica reglas comerciales. Vase App actúa como broker interno:
autentica el servicio, resuelve el tenant global y llama al tenant correcto de
Business. No se amplía la API pública.

## Endpoints internos

Business y el broker exponen contratos autenticados para:

- obtener configuración de fulfillment;
- validar/cotizar items y datos del cliente;
- crear un pedido con clave de idempotencia;
- consultar un pedido por ID/número;
- listar pedidos por teléfono o email exactos.

Las respuestas omiten secretos y sólo incluyen datos necesarios para Labs.

## Pedido borrador

Labs agrega `ConversationOrderDraft`:

- `conversationId`
- `status`: `COLLECTING`, `AWAITING_CONFIRMATION`, `SUBMITTING`, `CREATED`,
  `CANCELED`, `EXPIRED`
- `revision`
- `items`
- `customer`
- `fulfillment`
- `quote`
- `confirmationHash`
- `confirmationExpiresAt`
- `businessOrderId`
- `businessOrderNumber`
- timestamps

Sólo puede existir un borrador activo por conversación. Toda modificación
incrementa `revision`, invalida la confirmación y exige una nueva cotización.

## Acciones del asistente

La salida estructurada de IA puede proponer:

- agregar, quitar o cambiar cantidad;
- seleccionar producto/SKU;
- actualizar datos del cliente;
- elegir entrega o sucursal;
- solicitar cotización;
- mostrar resumen;
- cancelar.

Estas propuestas se validan contra el catálogo y el estado del borrador. La IA
no tiene una acción que cree directamente el pedido.

## Datos obligatorios

Siempre:

- nombre;
- teléfono;
- items y cantidades.

Entrega:

- dirección y datos que exija la regla de Business;
- zona/localidad o ubicación cuando sea necesaria.

Retiro:

- sucursal configurada.

Email y notas son opcionales salvo que Business los marque como requeridos.

## Confirmación explícita

Cuando el borrador está completo:

1. Labs cotiza en Business.
2. Presenta items, cantidades, precios, subtotal, envío, total, método y datos.
3. Genera una frase de un solo uso, por ejemplo `CONFIRMAR PEDIDO 4821`.
4. Guarda únicamente su hash, revisión y vencimiento.
5. El siguiente mensaje debe coincidir exactamente.
6. Labs vuelve a validar precio, stock, fulfillment y total.
7. Crea el pedido con una clave idempotente derivada de tenant, conversación,
   borrador y revisión.

Un “sí” ambiguo nunca crea el pedido. Si cambió precio, stock o envío, se
presenta el nuevo resumen y se exige otra confirmación.

## Canal de origen

Business amplía el origen de pedido para distinguir:

- `WHATSAPP`
- `INSTAGRAM`
- `MESSENGER`
- canales actuales existentes.

La relación con la conversación y el canal se conserva en metadata interna
auditada sin exponer IDs sensibles al cliente.

## Concurrencia y fallos

- El borrador se actualiza con control optimista por `revision`.
- `SUBMITTING` se adquiere mediante transición condicional.
- Reintentos usan la misma clave de idempotencia.
- Un timeout consulta el resultado antes de intentar crear nuevamente.
- Nunca se confirma con una cotización vencida.
- Los errores de stock/precio/envío vuelven a `COLLECTING` o
  `AWAITING_CONFIRMATION` con explicación segura.

## Pruebas

- construcción y modificación de borrador;
- datos requeridos por entrega/retiro;
- sincronización de configuración de Business;
- confirmación exacta, vencida e invalidada;
- revalidación de stock/precio/envío;
- idempotencia y timeout incierto;
- dos confirmaciones concurrentes;
- aislamiento por tenant/conversación;
- mapeo de canal;
- errores sanitizados.

