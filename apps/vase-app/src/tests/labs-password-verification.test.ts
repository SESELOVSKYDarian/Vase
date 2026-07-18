import { describe, expect, it, vi } from "vitest";
import { createLabsPasswordVerifyHandler } from "@/app/api/internal/labs/verify-password/route";

describe("internal Labs password verification", () => {
  it("returns only a boolean result for a valid service request", async () => {
    const handler = createLabsPasswordVerifyHandler({ authorize: vi.fn(), limit: vi.fn(), findHash: vi.fn().mockResolvedValue("hash"), verify: vi.fn().mockResolvedValue(true) });
    const response = await handler(new Request("http://app/api/internal/labs/verify-password", { method:"POST", body:JSON.stringify({ userId:"u", password:"secret" }) }));
    expect(await response.json()).toEqual({ verified: true });
  });

  it("uses the same generic response for a wrong password or unknown user", async () => {
    for (const hash of [null, "hash"]) {
      const handler = createLabsPasswordVerifyHandler({ authorize: vi.fn(), limit: vi.fn(), findHash: vi.fn().mockResolvedValue(hash), verify: vi.fn().mockResolvedValue(false) });
      const response = await handler(new Request("http://app/api/internal/labs/verify-password", { method:"POST", body:JSON.stringify({ userId:"u", password:"wrong" }) }));
      expect(response.status).toBe(401); expect(await response.json()).toEqual({ verified:false });
    }
  });
});
