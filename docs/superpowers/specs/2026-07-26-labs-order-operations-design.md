# Operación de pedidos en Vase Labs

## Objetivo

Convertir los pedidos creados por la IA en una superficie operativa real dentro de Vase Labs: importes tomados del catálogo, detalle auditable, estados gestionables y aviso automático al cliente cuando el pedido esté listo.

## Alcance

- Los pedidos creados por la IA se guardan localmente en Labs sin depender de Business.
- Cada renglón conserva una copia del nombre, SKU, precio unitario, cantidad y total del catálogo al momento de crear el pedido.
- El total visible se calcula desde esa copia y no cambia si luego se modifica el catálogo.
- Los estados operativos son `PROCESSING`, `PREPARING`, `READY` y `CANCELLED`.
- La pantalla de Pedidos presenta métricas, listado y una ventana de detalle alineada al lenguaje visual de Vase App.
- Al marcar un pedido como listo se envía una notificación por el canal y la conversación originales.
- Si el envío falla, el pedido permanece listo, se muestra el error y se habilita un reintento.
- Los pedidos sincronizados desde Business conservan sus importes de origen. Si no tienen conversación vinculada, permiten cambiar el estado pero no notificar automáticamente.

## Persistencia

`BusinessOrderProjection` seguirá siendo la proyección común de pedidos. Se agregan campos operativos separados del estado de origen para que una sincronización de Business no sobrescriba el trabajo del equipo:

- `operationalStatus`
- `operationalUpdatedAt`
- `readyAt`
- `customerNotificationStatus`
- `customerNotifiedAt`
- `customerNotificationError`

Un modelo `OrderStatusEvent` guarda cada transición, su origen y el resultado de la notificación. Los ítems permanecen como JSON, pero para pedidos locales deben contener la fotografía completa del catálogo.

## Creación desde la IA

Antes de persistir el pedido se resuelven los productos contra `CatalogProduct` dentro del tenant. El servidor calcula:

- precio unitario
- total por línea
- subtotal
- envío
- total

Si un producto o precio no puede resolverse, el flujo no debe inventar un monto en cero: devuelve una respuesta coherente y deja el pedido pendiente de revisión.

El número interno puede conservar el prefijo técnico `LABS-`, pero nunca se expone al cliente. El mensaje inicial será:

> Tu pedido N.º 696730 está en proceso y pendiente de confirmación. Te avisaremos por este mismo medio cuando esté listo.

## Operación y notificaciones

La API de operación valida el tenant y las transiciones. Al pasar a `READY`:

1. actualiza el estado y registra el evento;
2. carga la conversación y su destinatario;
3. envía el mensaje con el emisor oficial del canal;
4. registra el mensaje saliente y su entrega;
5. guarda `SENT` o `FAILED` en el pedido.

El mensaje automático será:

> ¡Tu pedido N.º 696730 ya está listo! Podés retirarlo en El Teflón Central. Te esperamos.

La operación es idempotente: un pedido ya notificado no vuelve a enviar el mismo aviso por un doble clic.

## Interfaz

La página conserva la estructura editorial y sobria de Vase App:

- encabezado y métricas compactas;
- tarjetas por canal;
- listado claro con número, cliente, estado, total y actualización;
- modal amplio con cabecera del pedido, datos del cliente, entrega, líneas, resumen económico, estado y actividad;
- acción principal contextual `Marcar listo y avisar`;
- estados de carga, éxito, error y reintento visibles;
- diseño responsive y accesible, con foco y cierre de modal mediante teclado.

## Validación

- pruebas unitarias de snapshot y cálculo;
- pruebas de transiciones, idempotencia y fallo de notificación;
- pruebas del contrato de la ruta;
- pruebas de representación del workspace;
- TypeScript, pruebas focalizadas, build de Vase Labs y revisión de diferencias.
