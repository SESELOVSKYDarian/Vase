import { describe, expect, it, vi } from "vitest";
import {
  buildChannelSetupRequest,
  buildChannelVerifyRequest,
  createChannelUiFlow,
} from "../apps/vase-labs/app/app/owner/labs/channels/channel-ui-flow";

describe("Labs channel UI flow", () => {
  it("uses exact manual setup and verify request payloads", () => {
    expect(buildChannelSetupRequest("INSTAGRAM")).toEqual({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelType: "INSTAGRAM" }),
    });
    expect(buildChannelVerifyRequest("channel_1")).toEqual({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelId: "channel_1" }),
    });
  });

  it("announces connected before completing after the controlled delay", () => {
    vi.useFakeTimers();
    const events: string[] = [];
    const flow = createChannelUiFlow();
    flow.scheduleConnected(() => events.push("notice"), () => events.push("refresh-close"), 900);
    expect(events).toEqual(["notice"]);
    vi.advanceTimersByTime(899);
    expect(events).toEqual(["notice"]);
    vi.advanceTimersByTime(1);
    expect(events).toEqual(["notice", "refresh-close"]);
    vi.useRealTimers();
  });

  it("cancels a pending connected completion on invalidation", () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    const flow = createChannelUiFlow();
    flow.scheduleConnected(() => undefined, complete, 900);
    flow.invalidate();
    vi.advanceTimersByTime(900);
    expect(complete).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("makes the latest copy win and verify invalidates copy", () => {
    const flow = createChannelUiFlow();
    const firstCopy = flow.startLatestCopy();
    const secondCopy = flow.startLatestCopy();
    expect(firstCopy && flow.isCurrent(firstCopy)).toBe(false);
    expect(secondCopy && flow.isCurrent(secondCopy)).toBe(true);
    const verify = flow.startVerify();
    expect(secondCopy && flow.isCurrent(secondCopy)).toBe(false);
    expect(verify && flow.isCurrent(verify)).toBe(true);
    const copyAfterVerify = flow.startLatestCopy();
    expect(verify && flow.isCurrent(verify)).toBe(true);
    expect(copyAfterVerify && flow.isCurrent(copyAfterVerify)).toBe(true);
  });

  it("rejects stale copy completion after terminal success starts", () => {
    vi.useFakeTimers();
    const flow = createChannelUiFlow();
    const copy = flow.startLatestCopy();
    flow.scheduleConnected(() => undefined, () => undefined, 900);
    expect(copy && flow.isCurrent(copy)).toBe(false);
    vi.useRealTimers();
  });
});
