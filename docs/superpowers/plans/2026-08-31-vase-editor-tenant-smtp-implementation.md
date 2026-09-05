# Vase Editor Tenant SMTP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a secure tenant-scoped SMTP configuration screen, diagnostics, and mailer fallback chain without breaking existing Gmail tenants.

**Architecture:** Extend the existing `commerce` JSONB settings through a protected email-settings router with sanitized read models. Refactor the single Nodemailer service so all existing auth and order flows use generic tenant SMTP first, legacy Gmail second, then global SMTP.

**Tech Stack:** React 18, Vite, Tailwind, Express 4, PostgreSQL JSONB, Nodemailer 6, Node test runner.

---

## File structure

- `apps/vase-editor/server/src/services/mailer.js`: resolution, validation, transport, verification, sending and safe error classification.
- `apps/vase-editor/server/src/routes/settings.js`: protected email settings, diagnostics and sanitized responses.
- `apps/vase-editor/server/src/services/mailer.test.js`: mailer regressions.
- `apps/vase-editor/web/src/components/admin/evolution/EmailEditor.jsx`: native responsive Correo surface.
- `apps/vase-editor/web/src/components/admin/evolution/CheckoutEditor.jsx`: commercial-only checkout controls.
- `apps/vase-editor/web/src/components/admin/evolution/EvolutionSidebar.jsx`: Correo navigation.
- `apps/vase-editor/web/src/pages/admin/evolution/EvolutionAdmin.jsx`: Correo module rendering.
- `apps/vase-editor/web/tests/email-editor.test.mjs`: UI structural regression coverage.

### Task 1: Establish the central mailer contract

**Files:** Create `apps/vase-editor/server/src/services/mailer.test.js`; modify `apps/vase-editor/server/src/services/mailer.js`.

- [ ] Write a failing test that asserts a complete `{ smtp_host, smtp_user, smtp_password }` overrides `{ gmail_sender_email, gmail_app_password }`, then run `node --test apps/vase-editor/server/src/services/mailer.test.js` and confirm it fails for the missing pure resolver.
- [ ] Implement and export `resolveMailConfig(commerce, environment)`, with generic tenant values first; Gmail host defaults only for legacy credentials; environment values last.
- [ ] Write failing tests for `EAUTH`, timeout and incomplete configuration; run them red; then add `validateSmtpConfig`, `classifySmtpError`, `createSmtpTransport`, `verifySmtpConnection` and an enhanced `sendSmtpEmail` returning `{ sent, provider, errorType?, code? }`.
- [ ] Re-run `node --test apps/vase-editor/server/src/services/mailer.test.js`, expect zero failures, then commit `test: define tenant smtp resolution`.

### Task 2: Add safe protected email settings endpoints

**Files:** Modify `apps/vase-editor/server/src/routes/settings.js`, `apps/vase-editor/server/src/routes/tenant.js` and `apps/vase-editor/server/src/services/mailer.js`; create `apps/vase-editor/server/src/routes/settings.test.js`.

- [ ] Write failing tests that GET email settings returns `has_smtp_password` but excludes `smtp_password` and `gmail_app_password`; execute the targeted test and confirm red.
- [ ] Implement `GET /email`, `PUT /email`, `POST /email/verify`, `POST /email/test` on the existing protected admin settings router. Preserve a stored secret when the submitted password is empty; validate all required SMTP fields server-side.
- [ ] Sanitize generic tenant settings read responses as well; writes must merge server-side so omitting a secret cannot erase it.
- [ ] Build test email content using the tenant name and safe server metadata, execute tests green, then commit `feat: add secure tenant email settings endpoints`.

### Task 3: Build the native Evolution Correo editor

**Files:** Create `apps/vase-editor/web/src/components/admin/evolution/EmailEditor.jsx`; modify `CheckoutEditor.jsx`, `EvolutionSidebar.jsx`, `EvolutionAdmin.jsx`; create `apps/vase-editor/web/tests/email-editor.test.mjs`.

- [ ] Write a failing structural test requiring the `email` Evolution module and excluding `Gmail emisor (SMTP)` and `Clave de aplicacion Google` from Checkout. Run `node --test apps/vase-editor/web/tests/email-editor.test.mjs` and confirm red.
- [ ] Implement EmailEditor's identity, SMTP and diagnostics cards. Use explicit labels, `email`/`number`/`password` input types, accessible live feedback, disabled async buttons and a visibility-safe configured-password state.
- [ ] Add Correo to Operación using a Phosphor envelope icon and render it through `EvolutionAdmin`; remove only identity and SMTP controls from Checkout, retaining payments, IVA, transfer and order messaging.
- [ ] Run the test green and commit `feat: add tenant email editor`.

### Task 4: Verify the complete change

**Files:** Modify only files identified by verification failures.

- [ ] Run `node --test apps/vase-editor/server/src/services/mailer.test.js apps/vase-editor/server/src/routes/settings.test.js apps/vase-editor/server/src/services/tenantSettingsPayload.test.js` and require zero failures.
- [ ] Run `node --test apps/vase-editor/web/tests/email-editor.test.mjs apps/vase-editor/web/tests/evolution-editor-layout.test.mjs`, `npm run lint --prefix apps/vase-editor/web`, and `npm run build --prefix apps/vase-editor/web`.
- [ ] Run `node --check apps/vase-editor/server/src/services/mailer.js`, `node --check apps/vase-editor/server/src/routes/settings.js`, and `node --check apps/vase-editor/server/src/app.js`.
- [ ] Run `node C:\Users\Usuario\.agents\skills\impeccable\scripts\detect.mjs --json` over the three changed Evolution UI files, repair blocking findings in one batch, re-run once, and commit `test: verify tenant smtp editor`.
