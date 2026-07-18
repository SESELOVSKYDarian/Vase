import { describe, expect, it, vi } from "vitest";
import { disconnectMetaChannel } from "../apps/vase-labs/app/lib/channel-disconnect";

describe("Meta channel disconnect", () => {
  it("clears credentials and provider association while preserving the channel record", async () => {
    const clear = vi.fn();
    await expect(disconnectMetaChannel({ assistantId: "a", channelId: "c", repository: {
      exists: vi.fn().mockResolvedValue(true), clear,
    } })).resolves.toEqual({ ok: true });
    expect(clear).toHaveBeenCalledWith("a", "c");
  });

  it("does not disclose a channel owned by another assistant", async () => {
    await expect(disconnectMetaChannel({ assistantId: "a", channelId: "foreign", repository: {
      exists: vi.fn().mockResolvedValue(false), clear: vi.fn(),
    } })).rejects.toThrow("CHANNEL_NOT_FOUND");
  });
});
