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

  it("explains when Meta accepted HTTP but omitted the message confirmation", () => {
    expect(formatInboxDeliveryError({
      code: "META_SEND_UNCONFIRMED",
      providerStatus: 200,
    })).toContain("no devolvió un identificador");
  });

  it("shows the safe rejection detail persisted by the AI sender", () => {
    expect(formatInboxDeliveryError({
      code: "META_SEND_FAILED: HTTP 400: Recipient is not allowed",
    })).toContain("Recipient is not allowed");
  });

  it("shows an explicit code instead of hiding an unknown delivery failure", () => {
    expect(formatInboxDeliveryError({ code: "UNKNOWN" }))
      .toContain("Código: UNKNOWN");
  });

  it("explains when the sender returned no delivery confirmation", () => {
    expect(formatInboxDeliveryError({ code: "CHANNEL_DELIVERY_FAILED" }))
      .toContain("No hubo confirmación de entrega");
  });

  it("explains internal Labs configuration failures", () => {
    expect(formatInboxDeliveryError({ code: "APP_INTERNAL_URL_UNREACHABLE" }))
      .toContain("APP_INTERNAL_URL");
  });

  it("explains Meta Graph connectivity and credential failures", () => {
    expect(formatInboxDeliveryError({ code: "META_GRAPH_REQUEST_FAILED" }))
      .toContain("API de Meta");
    expect(formatInboxDeliveryError({ code: "META_PERMISSIONS_MISSING" }))
      .toContain("permisos");
    expect(formatInboxDeliveryError({ code: "META_TOKEN_INVALID" }))
      .toContain("token");
  });
});
