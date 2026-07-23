# Imágenes de productos del catálogo en Vase Labs

## Objetivo

Cuando un cliente solicite la imagen de un producto, el chatbot debe poder
seleccionar una URL que provenga del catálogo sincronizado y enviarla como
imagen visible. La función debe operar en la vista de prueba de Labs y en los
canales oficiales WhatsApp, Instagram y Facebook.

## Causa actual

El snapshot interno de Vase Business sólo consulta `data.image_url` y
`data.imageUrl`, mientras que el editor y las integraciones también guardan la
imagen principal en `data.image`. Además, `CatalogProduct.imageUrl` no se
incluye en el contexto de IA y el emisor de canales sólo admite texto. Por
eso los precios y el stock llegan, pero la IA no conoce ni puede entregar las
imágenes.

## Flujo de datos

1. Business obtiene una imagen principal pública desde los campos compatibles
   del producto. La precedencia será `image_url`, `imageUrl`, `image` y, si
   existe, la primera URL válida de una colección de imágenes.
2. El snapshot conserva el contrato existente `imageUrl: string | null`.
   Vase App continúa validándolo y actuando únicamente como broker.
3. Labs sincroniza `imageUrl` en `CatalogProduct` sin reemplazar campos
   editoriales.
4. El contexto del catálogo entrega al generador el texto comercial y una
   lista separada de imágenes permitidas, asociadas a producto, SKU y URL.
5. El generador devuelve texto y hasta tres URLs seleccionadas.
6. Antes de enviar, Labs descarta cualquier URL que no esté en la lista
   permitida del catálogo del tenant. El modelo nunca puede introducir una
   imagen externa o inventada.
7. La respuesta textual se persiste como el mensaje del asistente. Las
   imágenes aprobadas se entregan como adjuntos del mismo turno.

## Selección de imágenes por IA

La respuesta de OpenAI será estructurada con:

- `text`: respuesta para el cliente.
- `imageUrls`: cero a tres URLs.

Las instrucciones indicarán que sólo debe seleccionar imágenes cuando el
cliente las pida o cuando sean necesarias para identificar los productos. La
validación posterior hará intersección exacta con las URLs permitidas. Si la
salida estructurada no es válida, la operación fallará de forma controlada; no
se intentará interpretar etiquetas libres en el texto.

## Entrega por canal

- WhatsApp: mensaje de texto y mensajes `type: image` con `image.link`.
- Instagram y Facebook: mensaje de texto y adjuntos de tipo `image` con URL
  pública.
- Se enviará primero el texto y después las imágenes, en el orden elegido.
- Se conservará un único resultado lógico de entrega para el turno. Si el
  texto se entrega pero una imagen falla, el turno quedará registrado como
  fallido para permitir diagnóstico, sin reenviar automáticamente texto
  duplicado.

Las URLs deben ser HTTPS y accesibles públicamente por Meta. Las URLs vacías,
inválidas, no HTTPS, duplicadas o ajenas al catálogo se omiten.

## Vista de prueba

El endpoint de prueba combinará conocimiento y catálogo usando el tenant
resuelto de la sesión. Su respuesta incluirá `imageUrls` ya validadas. El panel
mostrará las imágenes debajo del texto con texto alternativo genérico y diseño
adaptable.

## Compatibilidad y alcance

- No se modifica la API pública existente de Vase Business.
- El contrato interno conserva `imageUrl`; sólo se amplía la extracción en
  origen y su uso en Labs.
- Los productos sin imagen seguirán funcionando sólo con texto.
- No se descargan ni duplican imágenes en Labs.
- Máximo tres imágenes por respuesta.

## Errores y seguridad

- Una imagen inválida en Business se convierte en `null` y no invalida el
  catálogo completo.
- Labs sólo ofrece productos activos, con stock y habilitados para el chatbot.
- La lista permitida se deriva exclusivamente del tenant actual.
- Nunca se envían URLs propuestas por el modelo que no coincidan exactamente
  con el catálogo.
- Los errores externos no expondrán secretos ni respuestas crudas de Meta.

## Pruebas

Las pruebas cubrirán:

- extracción de `data.image`, aliases y colección de imágenes en Business;
- propagación de `imageUrl` a través del snapshot y del broker;
- contexto de IA con productos e imágenes permitidas por tenant;
- salida estructurada y descarte de URLs inventadas, duplicadas o no HTTPS;
- límite de tres imágenes;
- payloads multimedia de WhatsApp, Instagram y Facebook;
- comportamiento cuando falla un adjunto;
- endpoint y panel de prueba con imágenes;
- regresiones de sincronización, texto y catálogo sin imágenes.

## Despliegue

El cambio requiere desplegar `vase-business` (editor/server) y `vase-labs`.
Vase App conserva y valida el mismo contrato interno `imageUrl`, por lo que no
requiere despliegue si su implementación no cambia.
