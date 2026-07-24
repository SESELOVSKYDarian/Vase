import { describe, expect, it } from "vitest";
import { formatInboxDeliveryError } from "../apps/vase-labs/app/app/owner/labs/inbox/inbox-delivery-errors";

describe("Labs Inbox delivery errors", () => {
  it("explains when channel credentials must be reconnected", () => {
    expect(formatInboxDeliveryError({
      code: "CHANNEL_CREDENTIAL_DECRYPTION_FAILED",
    })).toContain("Volvé a conectar el canal");
  });

  it("shows a safe Meta rejection detail", () => {
    expect(formatInboxDeliveryError({
      code: "META_SEND_FAILED",
      providerStatus: 400,
      providerMessage: "Recipient is not allowed",
    })).toBe("Meta rechazó el envío (HTTP 400): Recipient is not allowed");
  });

  it("keeps a useful fallback without exposing internals", () => {
    expect(formatInboxDeliveryError({ code: "UNKNOWN" }))
      .toBe("No pudimos enviar el mensaje. Revisá la conexión del canal.");
  });
});
