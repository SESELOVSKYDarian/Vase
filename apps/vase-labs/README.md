# Vase Labs

IA SaaS independiente con asistentes, canales, knowledge, conversaciones y handoffs.

## Entitlements y tokens

Labs define contratos compartidos en `@vase/contracts` para:

- `LabsPlan`: `STARTER`, `GROWTH`, `PRO`.
- `LabsChannel`: `WHATSAPP`, `INSTAGRAM`, `FACEBOOK`.
- `TokenPack`: `BASIC`, `MEDIUM`, `PRO`.
- `LabsEntitlement`: plan, estado, canales habilitados, limite mensual y balance de packs.
- `TokenUsage`: consumo por tenant, canal, conversacion/asistente y tokens de entrada/salida.

La base propia de Labs persiste `LabsEntitlement` y `TokenUsage` en `apps/vase-labs/prisma/schema.prisma`.

Los packs comerciales quedan alineados con la issue `#3` y la documentacion de precios:

- `BASIC`: 500.000 tokens, estimado 1.000 mensajes.
- `MEDIUM`: 1.200.000 tokens, estimado 2.400 mensajes.
- `PRO`: 3.000.000 tokens, estimado 6.000 mensajes.

La API interna protegida `POST /api/internal/admin/labs/entitlements` recibe proyecciones desde App/Admin con `SERVICE_TO_SERVICE_TOKEN` y actualiza `LabsEntitlement` en la DB local de Labs. `GET /api/internal/admin/labs/entitlements?globalTenantId=...` permite leer el entitlement local sin hacer joins cross-database.

## WhatsApp V3

La base migrada desde `main` queda preparada como adapters puros en `apps/vase-labs/app/lib`:

- firma y verificacion Meta `x-hub-signature-256`;
- verify token por tenant;
- parser de webhook WhatsApp Meta a `InboundChannelMessage`;
- sender aislado para Meta WhatsApp;
- helper aislado para descarga de media.

El webhook productivo de WhatsApp vive en `app/api/v1/channels/whatsapp/[tenantSlug]/webhook/route.ts` y usa el servicio generico `channel-webhook-service.ts` para validar firma, resolver tenant local, validar entitlement, persistir `Conversation`/`Message` y dejar bloqueada la IA/outbound cuando el canal no esta habilitado.

## Instagram y Facebook

`instagram-webhook.ts` y `facebook-webhook.ts` normalizan payloads Meta a `InboundChannelMessage`. Las rutas reales de webhook son:

- `GET|POST /api/v1/channels/instagram/[tenantSlug]/webhook`
- `GET|POST /api/v1/channels/facebook/[tenantSlug]/webhook`

El pipeline valida firma, exige canal `CONNECTED`, deduplica por mensaje proveedor cuando el repositorio soporta `WebhookEvent`, persiste conversaciones/mensajes y marca `aiBlockedReason` cuando el entitlement no permite IA.

La base de OAuth Meta vive en:

- `GET /api/v1/meta/oauth/start`
- `GET /api/v1/meta/oauth/callback`

Los secretos de canal se cifran con `TOKEN_ENCRYPTION_SECRET` usando `channel-secrets.ts`; no deben devolverse a UI ni logs.

## Inbox, handoff, IA y analytics

Labs expone rutas base para operar datos reales:

- `GET /api/v1/channels/[tenantSlug]`
- `POST /api/v1/channels/[tenantSlug]/connect`
- `POST /api/v1/channels/[tenantSlug]/disconnect`
- `GET /api/v1/inbox/[tenantSlug]/conversations`
- `GET /api/v1/inbox/[tenantSlug]/conversations/[conversationId]`
- `POST /api/v1/inbox/[tenantSlug]/conversations/[conversationId]/reply`
- `POST /api/v1/inbox/[tenantSlug]/conversations/[conversationId]/handoff`
- `GET /api/v1/analytics/[tenantSlug]/summary`
- `GET /api/v1/billing/[tenantSlug]/usage`

La primera version de IA usa `ai-orchestrator.ts` como orquestador inyectable: verifica si puede correr, arma contexto desde knowledge, persiste respuesta, registra tokens y delega el envio al sender del canal.

## Modelos OpenAI

Labs resuelve los modelos de ChatGPT/OpenAI desde `openai-reply-generator.ts`. Cada cliente carga su propia key cifrada desde `Conocimiento > Chatbots`; `OPENAI_API_KEY` no es una variable requerida del servicio.

- `fast`: bajo costo y baja latencia.
- `balanced`: valor por defecto para atencion comercial.
- `premium`: mayor calidad para conversaciones complejas.

Variables soportadas:

- `OPENAI_MODEL_PROFILE`: `fast`, `everyday`, `tools` o `premium`.
- `OPENAI_DEFAULT_MODEL`: override global opcional para todos los perfiles sin modelo especifico.
- `OPENAI_MODEL_FAST`, `OPENAI_MODEL_EVERYDAY`, `OPENAI_MODEL_TOOLS`, `OPENAI_MODEL_PREMIUM`: modelos concretos por perfil.

Los valores por defecto son `gpt-5-mini` para baja latencia, `gpt-4o` para uso cotidiano, `gpt-4.1` para herramientas y `gpt-5.6-sol` para razonamiento avanzado. Al guardar una key, Labs comprueba que tenga acceso al modelo seleccionado antes de cifrarla. La prueba de la pantalla `Conocimiento` usa la misma key, modelo y fuentes `READY` que el flujo de canales.

Referencias oficiales: [modelos de OpenAI](https://developers.openai.com/api/docs/models), [guia de seleccion de modelos](https://developers.openai.com/api/docs/guides/latest-model) y [Responses API](https://developers.openai.com/api/reference/responses).

## Recuperacion de la migracion AssistantSecret

El arranque ejecuta `scripts/repair-assistant-secret-migration.js` antes de `prisma migrate deploy`. Este script actua solo cuando Prisma registra como fallida la migracion `20260721091500_assistant_openai_key`: si encuentra la tabla parcial vacia, la elimina, marca la migracion como revertida mediante `prisma migrate resolve --rolled-back` y permite que Prisma la aplique nuevamente heredando la collation de la base.

Si la tabla parcial contiene filas, el arranque se detiene con `ASSISTANT_SECRET_RECOVERY_REFUSED_NON_EMPTY_TABLE` para no borrar credenciales. En ese caso hay que respaldar y revisar esos registros antes de reintentar el despliegue.

El modelo usado queda registrado en `TokenUsage.source` con el formato `openai:<modelo>:<perfil>` para auditar consumo sin agregar migraciones.

## Readiness

`/api/health/ready` reporta DB real mediante ping Prisma. Si la DB falla, devuelve payload `status: "degraded"` con `checks.database: "error"` para que Admin/EasyPanel puedan detectar el problema sin perder la forma estandar del health.
