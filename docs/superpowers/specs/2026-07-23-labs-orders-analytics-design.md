# Pedidos, vinculación y estadísticas en Vase Labs

## Objetivo

Agregar una sección lateral de pedidos y métricas comerciales por canal,
vinculando conversaciones con pedidos reales de Vase Business sin asociaciones
aproximadas.

## Sincronización

Vase Business publica eventos internos de pedido para Labs:

- creado;
- actualizado;
- cambio de estado;
- cancelado.

Labs mantiene una proyección mínima `LabsOrderProjection`:

- tenant e ID/número de Business;
- estado, moneda, subtotal, envío y total;
- cliente normalizado;
- fulfillment/sucursal;
- canal de origen;
- fecha;
- conversación vinculada, si existe;
- timestamps de origen y sincronización.

Los eventos son idempotentes, ordenados por versión y procesados bajo lock del
tenant. Una reconciliación periódica consulta cambios recientes para recuperar
eventos perdidos. Business continúa siendo autoritativo.

## Vinculación exacta

Un pedido puede vincularse por:

1. `conversationId` explícito proveniente del pedido conversacional.
2. Número de pedido exacto mencionado.
3. Teléfono normalizado exacto.
4. Email normalizado exacto.

No se vincula por nombre, similitud, coincidencia parcial ni inferencia de IA.
Las colisiones se dejan sin vincular y se muestran para revisión manual.

Los identificadores extraídos de la conversación se guardan en
`ConversationInsight.identitySignals`, pero sólo valores validados participan
en la vinculación.

## Navegación y página Pedidos

La navegación desktop y móvil incorpora **Pedidos**.

La lista muestra:

- número;
- cliente;
- estado;
- total;
- fecha;
- canal WhatsApp, Instagram o Messenger;
- entrega o retiro/sucursal;
- conversación vinculada;
- enlace seguro al pedido original en Business.

Incluye filtros por canal, estado y fecha, más búsqueda exacta por número,
teléfono o email. La URL y consultas no aceptan tenant proporcionado por el
cliente; usan la sesión resuelta.

## Actividad y detalle comercial

El detalle de conversación incorpora:

- insight comercial;
- pedidos vinculados;
- estado del borrador actual;
- historial resumido de pedidos;
- próxima mejor acción.

Actividad permite filtrar Hot Leads y solicitudes humanas, además de las demás
clasificaciones definidas por inteligencia comercial.

## Estadísticas

El panel calcula por período:

- cantidad e importe por canal;
- ticket promedio;
- pedidos por estado;
- conversaciones que terminaron en pedido;
- Hot Leads convertidos;
- tiempo desde primer mensaje hasta creación;
- tasa de confirmación de borradores.

Los importes se agrupan por moneda; no se suman monedas distintas como si fueran
equivalentes. Las métricas se derivan de pedidos proyectados y conversaciones
del mismo tenant.

## Privacidad y permisos

- Datos de contacto se enmascaran en listados cuando no son necesarios.
- Sólo roles autorizados ven pedidos y detalle.
- El enlace a Business usa navegación autenticada, no credenciales en URL.
- Exportaciones y paginación se dejan fuera de la primera entrega.

## Pruebas

- idempotencia y orden de eventos;
- reconciliación;
- aislamiento por tenant;
- reglas exactas de vinculación y colisiones;
- filtros, navegación y detalle;
- métricas por canal/estado/moneda;
- conversión y tiempos;
- permisos y sanitización.

