import { describe, expect, it } from "vitest";
import {
  labsOrderChannelSchema,
  labsOrderCreateRequestSchema,
  labsOrderQuoteRequestSchema,
} from "@vase/contracts";

describe("Labs conversational order contracts", () => {
  it("accepts messaging channels used by Labs orders", () => {
    expect(labsOrderChannelSchema.parse("WHATSAPP")).toBe("WHATSAPP");
    expect(labsOrderChannelSchema.parse("INSTAGRAM")).toBe("INSTAGRAM");
    expect(labsOrderChannelSchema.parse("MESSENGER")).toBe("MESSENGER");
  });

  it("requires quote confirmation metadata before order creation", () => {
    expect(() => labsOrderCreateRequestSchema.parse({
      globalTenantId: "tenant_123",
      idempotencyKey: "conversation_1:rev_2",
      channel: "INSTAGRAM",
      items: [{ productId: "prod_1", quantity: 2 }],
      customer: { name: "Ana", phone: "+5491111111111" },
      quoteHash: "quote_hash_1",
      quoteVersion: 3,
    })).not.toThrow();
  });

  it("rejects caller-controlled Business URLs", () => {
    expect(() => labsOrderQuoteRequestSchema.parse({
      globalTenantId: "tenant_123",
      businessUrl: "https://attacker.test",
      channel: "WHATSAPP",
      items: [{ productId: "prod_1", quantity: 1 }],
      customer: {},
    })).toThrow();
  });
});
