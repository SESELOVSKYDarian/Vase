# WhatsApp Audio Depósito IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Recibir audios de WhatsApp Cloud API, transcribirlos en español, procesarlos con la lógica central del depósito, activar el LED correspondiente y responder por WhatsApp con texto.

**Architecture:** El adaptador de WhatsApp resolverá el media ID mediante Graph API usando las credenciales del canal, descargará el binario y lo pasará al transcriptor existente. El texto transcripto entrará por `WarehouseWebhookService.processTextMessage`, reutilizando búsqueda, comandos LED, logs e idempotencia sin duplicar lógica.

**Tech Stack:** Next.js App Router, TypeScript, WhatsApp Cloud API Graph, Groq Whisper, Prisma, Vitest.

---

### Task 1: Contrato de descarga y transcripción de audio

**Files:**
- Modify: `apps/vase-management/lib/warehouse/warehouse-audio.service.ts`
- Create: `apps/vase-management/lib/warehouse/channels/whatsapp.audio.test.ts`

- [ ] Escribir pruebas para aceptar `mediaId`, consultar metadata y descargar el binario con `Authorization: Bearer`, rechazando respuestas no exitosas.
- [ ] Ejecutar la prueba enfocada y confirmar que falla porque falta el adaptador de descarga.
- [ ] Implementar `downloadWhatsAppAudio(mediaId, accessToken, apiVersion)` y convertir la respuesta en `File` conservando el MIME type.
- [ ] Reutilizar `transcribeWarehouseAudio(file)` para enviar el archivo a Groq Whisper en español.
- [ ] Ejecutar la prueba enfocada y confirmar que pasa.

### Task 2: Procesar audios entrantes en WhatsApp

**Files:**
- Modify: `apps/vase-management/lib/warehouse/channels/whatsapp.adapter.ts`
- Modify: `apps/vase-management/lib/warehouse/channels/webhook.service.ts`
- Modify: `apps/vase-management/lib/warehouse/channels/whatsapp.meta.test.ts`

- [ ] Agregar al tipo del evento WhatsApp el formato `audio: { id, mime_type }`.
- [ ] Escribir prueba para que un mensaje de audio sea identificado como `AUDIO` y no sea descartado.
- [ ] En `handleWebhookPost`, persistir el evento antes de procesarlo, descargar y transcribir el audio, y llamar a `processTextMessage` con el transcript.
- [ ] Registrar `messageType: 'AUDIO'` y `transcript` en `WarehouseConversationLog`.
- [ ] Enviar `response.text` al remitente mediante `sendTextReply`; si no se obtiene transcript, enviar un error legible y marcar el evento como fallido.
- [ ] Mantener idempotencia por `message.id` y validar la firma HMAC como en los mensajes de texto.
- [ ] Ejecutar las pruebas de WhatsApp y confirmar que pasan.

### Task 3: Configuración y despliegue

**Files:**
- Modify: `apps/vase-management/.env.example` si existe
- Modify: documentación de configuración de Depósito IA si existe

- [ ] Documentar que `GROQ_API_KEY` es obligatoria para audios de WhatsApp.
- [ ] Documentar que el canal debe tener `providerAccountId` igual al Phone Number ID y `accessToken` válido para consultar media y enviar respuestas.
- [ ] Verificar que el webhook de Meta tenga suscripto el campo `messages`.
- [ ] Ejecutar `git diff --check` y las pruebas enfocadas.
- [ ] Commit: `feat(warehouse): process whatsapp audio queries`.
