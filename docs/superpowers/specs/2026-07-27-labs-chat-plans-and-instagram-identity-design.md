# Ajustes de planes y conversación en Vase Labs

## Objetivo

Corregir cuatro comportamientos operativos de Labs sin alterar Business:

- presupuestos incluidos por plan;
- posición del scroll del Inbox;
- repetición de imágenes de productos;
- identidad visible de clientes de Instagram.

## Presupuesto por plan

Los presupuestos incluidos de IA serán:

| Plan | Presupuesto incluido |
| --- | ---: |
| Starter | USD 5 |
| Growth | USD 10 |
| Pro | USD 20 |

`ai-budget.ts` será la única fuente de los valores predeterminados. Una migración actualizará solamente los registros que todavía conserven los antiguos valores por defecto: Growth USD 15 y Pro USD 40. Los presupuestos personalizados distintos de esos valores no se modificarán.

## Scroll del Inbox

Al seleccionar una conversación distinta, el hilo se posicionará una vez en el último mensaje. Después:

- el refresco periódico no reemplazará los mensajes ya cargados;
- si el operador está leyendo mensajes anteriores, su posición se conserva;
- un mensaje nuevo solo acompaña el scroll si el operador ya estaba cerca del final;
- un mensaje enviado por el operador sí desplaza al final;
- cuando haya mensajes debajo se mantiene el control para volver al último mensaje.

## Imágenes de productos

Las imágenes enviadas por la IA se guardarán en los metadatos del mensaje saliente. Antes de enviar una respuesta nueva, Labs cargará las imágenes ya utilizadas en esa conversación y filtrará las repetidas.

La deduplicación será por conversación:

- una imagen puede enviarse una vez a cada cliente;
- no vuelve a enviarse cada vez que la IA menciona el mismo producto;
- una respuesta puede seguir mencionando el producto sin adjuntar nuevamente la imagen;
- URLs inválidas continúan siendo descartadas por el emisor oficial existente.

## Identidad de Instagram

El webhook de Instagram seguirá aceptando eventos que contienen solamente el identificador del remitente. Antes de persistir el mensaje, Labs intentará resolver el perfil mediante Meta Graph API usando el token oficial ya guardado para el canal.

El resolvedor:

- consulta `name` y `username`;
- usa el host de Graph compatible con el tipo de token;
- prefiere el nombre y utiliza `@username` como alternativa;
- persiste el resultado en `Conversation.customerName`;
- reutiliza el nombre guardado en mensajes posteriores;
- no bloquea el webhook ni la respuesta de IA si Meta no permite obtener el perfil.

No se expone ningún token al navegador.

## Pruebas y validación

- prueba de valores y migración de presupuestos;
- regresión de refresco de cola sin pérdida de mensajes;
- política de scroll inicial y lectura histórica;
- deduplicación de imágenes por conversación;
- resolución y fallback de perfil de Instagram;
- pruebas focalizadas, TypeScript, build de Vase Labs y `git diff --check`.
