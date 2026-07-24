# Transcripción económica de audios con OpenAI

## Objetivo

Permitir que Vase Labs escuche audios entrantes de WhatsApp y continúe la
conversación con la IA, usando la API key de OpenAI configurada por cada
negocio y evitando enviar audio al modelo conversacional.

## Alcance

- Transcribir audios de WhatsApp con `gpt-4o-mini-transcribe`.
- Reutilizar la cola durable `AudioTranscriptionJob`.
- Reutilizar la API key cifrada `OPENAI_API_KEY` del asistente.
- Guardar la transcripción como contenido del mensaje entrante.
- Ejecutar después el mismo flujo de respuesta, catálogo, pedidos,
  derivación humana y análisis comercial que se usa para texto.
- Dejar de requerir el servicio `vase-transcription` para este flujo.

Quedan fuera de este cambio la respuesta con voz, la transcripción en tiempo
real y los adaptadores de descarga de audio de Instagram y Messenger.

## Arquitectura y flujo

1. El webhook valida y guarda el mensaje de audio.
2. Crea, de forma idempotente, un `AudioTranscriptionJob`.
3. El worker reclama el trabajo con lease y descarga el archivo desde Meta.
4. Resuelve y descifra la API key del asistente usando
   `TOKEN_ENCRYPTION_SECRET`.
5. Envía un formulario multipart a `/v1/audio/transcriptions` con:
   - `model=gpt-4o-mini-transcribe`
   - el archivo de audio
   - la API key del negocio
6. Guarda el texto transcripto en `Message.content`.
7. Ejecuta la IA conversacional con ese texto, sin adjuntar nuevamente el
   audio.
8. Encola el análisis comercial y completa el trabajo.

## Costos y límites

- La transcripción usa la cuenta OpenAI del negocio.
- El modelo predeterminado será `gpt-4o-mini-transcribe`.
- El modelo podrá configurarse con `AI_TRANSCRIPTION_MODEL`.
- Tamaño máximo: 15 MB.
- Tiempo máximo de solicitud: 120 segundos.
- Máximo de intentos: 3.
- La transcripción no se registra como tokens de respuesta del chatbot para
  evitar contabilizar dos veces el mensaje; el gasto queda visible en la
  cuenta OpenAI del negocio.

## Errores y seguridad

- La API key nunca se copia al trabajo ni a los logs.
- Si falta la key, el trabajo falla con un código estable y no bloquea el
  webhook.
- Las respuestas de error de OpenAI se convierten en códigos internos; no se
  guardan cuerpos que puedan contener información sensible.
- Un trabajo fallido conserva `lastError`, `attempts` y el mensaje entrante.
- El webhook continúa siendo idempotente mediante `assistantId` y
  `providerMediaId`.

## Compatibilidad y despliegue

- No se agrega ninguna migración.
- `vase-labs` debe desplegarse para encolar los audios.
- `vase-labs-worker` debe desplegarse para transcribir y responder.
- Ambos servicios deben compartir el mismo `DATABASE_URL` y
  `TOKEN_ENCRYPTION_SECRET`.
- `vase-transcription` deja de ser necesario para audios nuevos y puede
  retirarse después de verificar producción.

## Verificación

- Prueba del cliente multipart de OpenAI.
- Prueba de selección de la API key por asistente.
- Prueba del worker: descarga, transcribe, guarda texto y continúa la IA.
- Prueba de error cuando falta la API key.
- Regresión de mensajes de texto y webhook.
- Typecheck y build de Vase Labs.
