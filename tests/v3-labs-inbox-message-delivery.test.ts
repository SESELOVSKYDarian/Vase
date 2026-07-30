import { describe, expect, it } from "vitest";
import { resolveInboxMessageDelivery } from "../apps/vase-labs/app/app/owner/labs/inbox/inbox-message-delivery";

describe("Labs Inbox outbound delivery state", () => {
  it("labels an accepted provider message as sent, not delivered", () => {
    expect(resolveInboxMessageDelivery({
      status: "SENT",
      providerMessageId: "mid_123",
      error: null,
    })).toEqual({
      label: "Enviado",
      tone: "sent",
      detail: "Meta aceptó el mensaje. La entrega al cliente todavía no fue confirmada.",
    });
  });

  it("shows a failed AI reply instead of claiming delivery", () => {
    expect(resolveInboxMessageDelivery({
      status: "FAILED",
      providerMessageId: null,
      error: "META_SEND_FAILED",
    })).toEqual({
      label: "No enviado",
      tone: "failed",
      detail: "Meta rechazó el envío. Revisá la conexión del canal y volvé a intentarlo.",
    });
  });

  it("does not treat legacy outbound rows without delivery evidence as delivered", () => {
    expect(resolveInboxMessageDelivery(null)).toEqual({
      label: "Sin confirmar",
      tone: "pending",
      detail: "Labs no recibió una confirmación de envío para este mensaje.",
    });
  });
});
