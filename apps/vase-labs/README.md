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

## WhatsApp V3

La base migrada desde `main` queda preparada como adapters puros en `apps/vase-labs/app/lib`:

- firma y verificacion Meta `x-hub-signature-256`;
- verify token por tenant;
- parser de webhook WhatsApp Meta a `InboundChannelMessage`;
- sender aislado para Meta WhatsApp;
- helper aislado para descarga de media.

Esta fase no conecta webhooks, no ejecuta IA y no habilita envio productivo por si sola. La siguiente fase debe crear endpoints, persistencia runtime y orquestacion sobre la DB propia de Labs.
