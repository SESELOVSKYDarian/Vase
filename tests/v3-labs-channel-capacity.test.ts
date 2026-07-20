import { describe, expect, it } from "vitest";
import { getChannelCapacity, getManualChannelCapacity } from "../apps/vase-labs/app/lib/channel-capacity";
import { getManualChannelId } from "../apps/vase-labs/app/lib/channel-manual-id";
import { deriveManualChannelStates } from "../apps/vase-labs/app/lib/channel-queries";

describe("Labs channel capacity", () => {
  it("reports remaining capacity independently for each channel type", () => {
    expect(getChannelCapacity(
      { WHATSAPP: 2, INSTAGRAM: 1, FACEBOOK: 0 },
      [{ type: "WHATSAPP", status: "CONNECTED" }, { type: "INSTAGRAM", status: "ERROR" }],
    )).toEqual({
      WHATSAPP: { limit: 2, used: 1, remaining: 1 },
      INSTAGRAM: { limit: 1, used: 1, remaining: 0 },
      FACEBOOK: { limit: 0, used: 0, remaining: 0 },
    });
  });

  it("caps the manual add flow at one while leaving other channel types available", () => {
    expect(getManualChannelCapacity(
      { WHATSAPP: 2, INSTAGRAM: 2, FACEBOOK: 2 },
      [{ id: getManualChannelId("assistant_1", "WHATSAPP"), type: "WHATSAPP", status: "CONNECTED" }],
      "assistant_1",
    )).toEqual({
      WHATSAPP: { limit: 1, used: 1, remaining: 0 },
      INSTAGRAM: { limit: 1, used: 0, remaining: 1 },
      FACEBOOK: { limit: 1, used: 0, remaining: 1 },
    });
  });

  it("recognizes a server-derived legacy manual marker without disabling unrelated provider rows", () => {
    const result = getManualChannelCapacity(
      { WHATSAPP: 2, INSTAGRAM: 2, FACEBOOK: 2 },
      [{ type: "INSTAGRAM", status: "CONNECTED" }, { id: "oauth-facebook", type: "FACEBOOK", status: "CONNECTED" }],
      "assistant_1",
    );
    expect(result.INSTAGRAM).toEqual({ limit: 1, used: 1, remaining: 0 });
    expect(result.FACEBOOK).toEqual({ limit: 1, used: 0, remaining: 1 });
  });

  it.each(["PENDING", "CONNECTED", "ERROR"])("treats an extant %s manual row as occupying the slot", (status) => {
    const [manual] = deriveManualChannelStates([
      { id: "legacy", type: "WHATSAPP", status, config: { manualWebhook: true } },
      { id: "oauth", type: "INSTAGRAM", status: "CONNECTED", config: {} },
    ]);
    const result = getManualChannelCapacity({ WHATSAPP: 2, INSTAGRAM: 2, FACEBOOK: 2 }, [manual!], "assistant_1");
    expect(result.WHATSAPP).toEqual({ limit: 1, used: 1, remaining: 0 });
    expect(result.INSTAGRAM).toEqual({ limit: 1, used: 0, remaining: 1 });
  });

  it("releases the manual slot after disconnecting", () => {
    const [manual] = deriveManualChannelStates([
      { id: getManualChannelId("assistant_1", "WHATSAPP"), type: "WHATSAPP", status: "DISCONNECTED", config: null },
    ]);
    expect(getManualChannelCapacity(
      { WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 1 }, [manual!], "assistant_1",
    ).WHATSAPP).toEqual({ limit: 1, used: 0, remaining: 1 });
  });
});
