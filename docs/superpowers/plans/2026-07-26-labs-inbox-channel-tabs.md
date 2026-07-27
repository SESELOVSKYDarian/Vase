# Labs Inbox Channel Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar el Inbox de Vase Labs en chats de WhatsApp, Instagram y Facebook sin alterar el flujo compartido de respuesta humana e IA.

**Architecture:** La página de servidor seguirá cargando las conversaciones abiertas. El componente cliente mantendrá un canal seleccionado, filtrará la cola localmente y conservará el polling existente. Un helper puro normalizará valores históricos como `MESSENGER` al canal visual `FACEBOOK`.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest y CSS existente de Vase Labs.

---

### Task 1: Contrato de canales del Inbox

**Files:**
- Create: `apps/vase-labs/app/app/owner/labs/inbox/inbox-channels.ts`
- Create: `tests/v3-labs-inbox-channels.test.ts`

- [ ] Escribir pruebas para normalización, conteos y filtrado.
- [ ] Ejecutarlas y confirmar que fallan porque el helper todavía no existe.
- [ ] Implementar el helper mínimo.
- [ ] Confirmar que las pruebas pasan.

### Task 2: Navegación por canal

**Files:**
- Modify: `apps/vase-labs/app/app/owner/labs/inbox/inbox-workstation.tsx`
- Modify: `apps/vase-labs/app/globals.css`
- Modify: `tests/v3-labs-owner-standalone-ui.test.ts`

- [ ] Escribir la expectativa visual fallida para las tres pestañas.
- [ ] Añadir selector, contadores y estado vacío por canal.
- [ ] Mantener selección y conversación activa coherentes después del polling.
- [ ] Aplicar el lenguaje visual actual de Vase Labs y comportamiento responsive.

### Task 3: Verificación integral

**Files:**
- Verify: `apps/vase-labs/app/lib/instagram-webhook.ts`
- Verify: `apps/vase-labs/app/lib/channel-webhook-service.ts`

- [ ] Ejecutar pruebas focalizadas de Inbox y webhook Instagram.
- [ ] Ejecutar TypeScript sin emisión.
- [ ] Ejecutar build de `@vase/labs`.
- [ ] Revisar el diff final y confirmar que no se alteraron cambios ajenos.
