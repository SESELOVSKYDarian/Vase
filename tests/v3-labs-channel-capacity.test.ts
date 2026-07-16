import { describe, expect, it } from "vitest";
import { getChannelCapacity } from "../apps/vase-labs/app/lib/channel-capacity";

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
});
