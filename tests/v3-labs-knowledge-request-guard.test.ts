import { describe, expect, it } from "vitest";
import { createKnowledgeRequestGuard } from "../apps/vase-labs/app/app/owner/labs/chatbots/knowledge-request-guard";

describe("knowledge modal request guard", () => {
  it("rejects a synchronous duplicate in the same request scope", () => {
    const guard = createKnowledgeRequestGuard();
    const first = guard.start("submit");

    expect(first).not.toBeNull();
    expect(guard.isActive("submit")).toBe(true);
    expect(guard.start("submit")).toBeNull();
  });

  it("makes pending work stale and aborts it when the modal resets", () => {
    const guard = createKnowledgeRequestGuard();
    const pending = guard.start("credentials");
    if (!pending) throw new Error("expected request ticket");

    guard.invalidate();

    expect(pending.signal.aborted).toBe(true);
    expect(guard.isCurrent(pending)).toBe(false);
    expect(guard.start("credentials")).not.toBeNull();
  });

  it("only releases the exact active request ticket", () => {
    const guard = createKnowledgeRequestGuard();
    const stale = guard.start("credentials");
    if (!stale) throw new Error("expected request ticket");
    guard.invalidate();
    const current = guard.start("credentials");
    if (!current) throw new Error("expected current ticket");

    guard.finish(stale);

    expect(guard.start("credentials")).toBeNull();
    guard.finish(current);
    expect(guard.start("credentials")).not.toBeNull();
  });
});
