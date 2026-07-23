# Transcripción local de audios para Vase Labs

## Objetivo

Procesar audios de WhatsApp, Instagram y Messenger sin consumir tokens de una
API de transcripción, usando un servicio propio `faster-whisper`.

## Servicio

Se agrega un contenedor interno `vase-transcription`:

- Python y `faster-whisper`;
- modelo `small`;
- cuantización CPU `int8` por defecto;
- soporte GPU configurable sin cambiar el contrato;
- endpoint interno de transcripción;
- endpoints de salud y métricas.

El servicio no se publica a Internet. Exige un token de servicio diferente de
los secretos de Meta y acepta solicitudes únicamente desde la red interna de
EasyPanel.

## Flujo

1. El parser del webhook reconoce un mensaje de audio y conserva su media ID.
2. Labs obtiene una URL temporal o descarga el archivo mediante la API de Meta
   y las credenciales del canal/tenant.
3. Valida MIME, tamaño y duración.
4. Escribe el archivo en un directorio temporal restringido.
5. Envía el audio al servicio local.
6. Recibe texto, idioma, duración y confianza disponible.
7. Persiste el texto como contenido del mensaje entrante.
8. Guarda metadata no sensible: `source: audio`, media ID, idioma y duración.
9. El archivo se elimina en `finally`.
10. Continúan respuesta, insights y pedidos como con texto escrito.

## Límites

Valores iniciales configurables:

- 20 MB;
- 10 minutos;
- tipos de audio explícitamente permitidos;
- timeout de procesamiento;
- concurrencia máxima según CPU/GPU.

El servicio limita memoria, cantidad de trabajos y tamaño antes de decodificar.
No sigue URLs arbitrarias proporcionadas por clientes; el archivo se obtiene
sólo desde endpoints oficiales de Meta.

## Cola y experiencia

La transcripción usa un trabajo durable con lease para no perder audios durante
reinicios. El webhook se confirma una vez persistido el evento. Mientras se
procesa, la conversación muestra “Transcribiendo audio”.

Al completar se crea el mensaje textual y se dispara el flujo normal. Si falla
definitivamente:

- se registra un código sanitizado;
- la UI muestra el estado fallido;
- el chatbot solicita reenviar el audio o escribir el mensaje;
- no se guarda el archivo.

## Tokens y costos

La conversión de voz a texto no usa OpenAI ni consume tokens del plan. Usa CPU,
RAM o GPU del servidor. Una vez obtenido el texto, la respuesta del chatbot y
el análisis comercial sí consumen los tokens normales del modelo configurado.

## Privacidad y observabilidad

- Sin retención permanente del audio.
- Nombres temporales aleatorios.
- Limpieza al iniciar para temporales abandonados y limpieza en `finally`.
- Logs sin contenido del audio ni transcripción completa.
- Métricas de duración, idioma, latencia, cola y error.
- Health checks de modelo cargado y capacidad.

## Despliegue

EasyPanel incorpora:

- servicio `vase-transcription`;
- volumen sólo para caché del modelo, no para audios;
- variables de modelo, límites y token interno;
- health check;
- recursos CPU/RAM y opcionalmente GPU.

Labs recibe la URL interna y el secreto mediante variables de entorno.

## Pruebas

- autenticación interna;
- formatos y límites;
- descarga autorizada desde Meta;
- eliminación en éxito/error/timeout;
- lease, reintento y deduplicación;
- persistencia de texto/metadata;
- aislamiento de credenciales por tenant;
- comportamiento de UI y fallback;
- prueba de integración con un fixture de audio corto.
