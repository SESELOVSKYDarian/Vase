import { describe, expect, it } from "vitest";
import { isWindowClosedError, normalizePhone, samePhone } from "@/server/services/support/whatsapp-bridge";

describe("puente de WhatsApp", () => {
  it("compara números aunque estén escritos distinto", () => {
    expect(normalizePhone("+54 9 223 555-1234")).toBe("5492235551234");
    expect(samePhone("5492235551234", "(0223) 15 555-1234")).toBe(false);
    expect(samePhone("5492235551234", "223 555 1234")).toBe(true);
    expect(samePhone("5492235551234", "+54 9 223 555 1234")).toBe(true);
    expect(samePhone("123", "123")).toBe(false);
  });

  it("reconoce cuando WhatsApp cerró la ventana de 24 h", () => {
    expect(isWindowClosedError("META_SEND_FAILED: HTTP 400: (#131047) Re-engagement message")).toBe(true);
    expect(isWindowClosedError("OFFICIAL_CHANNEL_NOT_CONNECTED")).toBe(false);
  });
});
