# Labs Client Meta Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada cliente conecte una aplicación Meta distinta por canal desde Vase Labs.

**Architecture:** Guardar el App ID en la configuración del canal y los secretos cifrados en `ChannelSecret`. La conexión manual construye el cliente Graph con esas credenciales, valida el token, descubre el activo y activa la suscripción antes de marcar el canal conectado.

**Tech Stack:** Next.js 16 Route Handlers, React, TypeScript, Prisma, Vitest, Meta Graph API.

---

### Task 1: Contrato de credenciales por canal

**Files:**
- Modify: `apps/vase-labs/app/lib/manual-meta-connection.ts`
- Modify: `apps/vase-labs/app/api/labs/channels/[channelId]/connect/route.ts`
- Test: `tests/v3-labs-channel-connect-route.test.ts`
- Test: `tests/v3-labs-manual-meta-connection.test.ts`

- [ ] Escribir pruebas que exijan `metaAppId`, lo guarden en `Channel.config` y construyan Graph con el App ID y App Secret del cliente.
- [ ] Ejecutar las pruebas y comprobar que fallen por falta del nuevo contrato.
- [ ] Implementar el contrato mínimo y preservar la compatibilidad con canales existentes.
- [ ] Ejecutar las pruebas hasta dejarlas en verde.

### Task 2: Interfaz de configuración

**Files:**
- Modify: `apps/vase-labs/app/app/owner/labs/channels/channel-edit-modal.tsx`
- Modify: `apps/vase-labs/app/api/labs/channels/[channelId]/route.ts`
- Test: `tests/v3-labs-channel-edit-modal.test.ts`

- [ ] Escribir pruebas para mostrar, editar y enviar `Meta App ID`.
- [ ] Comprobar el fallo inicial.
- [ ] Incorporar el campo y el estado en el modal sin devolver secretos.
- [ ] Verificar las pruebas del modal.

### Task 3: Salud real del canal

**Files:**
- Modify: `apps/vase-labs/app/api/labs/channels/[channelId]/route.ts`
- Modify: `apps/vase-labs/app/lib/channel-queries.ts`
- Modify: `apps/vase-labs/app/lib/channel-manual-setup.ts`
- Test: `tests/v3-labs-channel-edit-modal.test.ts`
- Test: `tests/v3-labs-channel-manual-setup.test.ts`

- [ ] Escribir pruebas donde `validationPending` o `lastError` impidan mostrar el activo como validado.
- [ ] Ejecutar y observar el fallo.
- [ ] Centralizar el cálculo de salud con configuración y último error.
- [ ] Ejecutar las pruebas de estado.

### Task 4: Verificación integral

**Files:**
- Verify: `apps/vase-labs`

- [ ] Ejecutar las pruebas Meta y de canales.
- [ ] Ejecutar `npx tsc -p apps/vase-labs/tsconfig.json --noEmit`.
- [ ] Ejecutar `npm run build --workspace @vase/labs`.
- [ ] Ejecutar `git diff --check`.
