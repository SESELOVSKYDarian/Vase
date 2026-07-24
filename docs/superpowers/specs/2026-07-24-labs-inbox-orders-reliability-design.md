# Confiabilidad de pedidos e Inbox en Vase Labs

## Objetivo

Corregir cuatro recorridos que hoy se interrumpen entre mensajes:

- conservar el contexto de un pedido y crearlo únicamente tras una aceptación natural e inequívoca;
- mantener la posición del operador cuando lee mensajes anteriores;
- permitir pausar y reactivar la IA desde Inbox;
- entregar respuestas humanas al canal oficial y mostrar un diagnóstico útil si Meta las rechaza.

## Pedidos conversacionales

Vase Business continúa siendo la fuente de verdad para productos, precios, stock,
retiro, envío y creación final. Labs conserva el borrador asociado a la
conversación y pasa a la IA un historial reciente ordenado, el borrador activo y
el catálogo con identificadores internos.

La salida estructurada de la IA puede proponer preparar un pedido cuando ya
dispone de:

- productos e identificadores válidos;
- cantidades;
- nombre y teléfono;
- modalidad y datos necesarios para entrega o retiro.

El servidor valida esa propuesta, cotiza en Business, persiste el borrador y
redacta el resumen autoritativo. La IA no inventa precio, stock, número de pedido
ni confirmación.

Cuando existe un borrador `AWAITING_CONFIRMATION`, el servidor evalúa el mensaje
del cliente antes de generar otra respuesta. Se aceptan expresiones naturales
explícitas como `confirmo el pedido`, `acepto el pedido`, `hacelo` o equivalentes
que inequívocamente se refieran al resumen mostrado. Un saludo, una pregunta, una
negación o una expresión aislada ambigua no crea el pedido.

Antes de crear, Labs vuelve a cotizar. Si precio, stock o fulfillment cambiaron,
no crea el pedido: devuelve el resumen actualizado y exige una nueva aceptación.
La creación sigue usando una clave idempotente.

## Continuidad de conversación

El generador recibe una ventana acotada de mensajes recientes con autor y orden,
además del último mensaje. El historial se delimita como contenido no confiable y
no puede modificar las instrucciones del sistema. Un saludo posterior no borra
el borrador activo ni reinicia la conversación.

## Pausa y reactivación

Pausar crea o reutiliza un handoff activo y marca la conversación como
`ESCALATED`. Reactivar:

- valida sesión, tenant y conversación;
- resuelve todos los handoffs activos de esa conversación;
- marca la conversación `OPEN` y `escalatedToHuman=false`;
- permite que el próximo mensaje entrante vuelva a ejecutar la IA.

Inbox presenta una única acción contextual: `Pausar IA` o `Reactivar IA`.

## Respuestas humanas

La respuesta se envía primero por el canal oficial y se persiste como `SENT`
solamente si Meta devuelve éxito. El destinatario se resuelve desde el
identificador del cliente almacenado por el webhook, con una alternativa segura
al identificador externo del hilo cuando el contacto no está disponible.

Los errores se clasifican sin exponer tokens:

- canal no conectado;
- secreto de cifrado ausente o incompatible;
- destinatario inexistente;
- rechazo de Meta, incluyendo su mensaje seguro y código HTTP.

Inbox muestra el diagnóstico accionable. Una respuesta humana mantiene la IA
pausada hasta que el operador la reactive expresamente.

## Scroll de Inbox

El hilo hace scroll automático únicamente:

- al abrir otra conversación;
- después de enviar un mensaje;
- al recibir mensajes nuevos si el operador ya estaba cerca del final.

Si el operador está leyendo mensajes anteriores, el refresco de cuatro segundos
preserva su posición. Aparece un botón flotante con flecha hacia abajo; al
presionarlo vuelve suavemente al último mensaje.

## Seguridad y aislamiento

Todas las rutas de Inbox resuelven la sesión con `resolveLabsRequestContext` y
comparan el `tenantSlug`. Ninguna mutación confía únicamente en parámetros de URL.
La confirmación natural solo se considera cuando existe un borrador activo y ya
cotizado para esa conversación.

## Verificación

- pruebas unitarias de intención de confirmación, negación y ambigüedad;
- pruebas de orquestación para preparar, confirmar y recotizar;
- pruebas de historial acotado;
- pruebas tenant-scoped de pausa/reactivación y entrega humana;
- pruebas del controlador de scroll;
- typecheck y build de Vase Labs.
