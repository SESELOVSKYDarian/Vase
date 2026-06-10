import { describe, expect, it } from "vitest";
import { connectChannelSchema } from "@/lib/validators/labs";

describe("labs validators", () => {
  it("accepts long meta access tokens for channel connections", () => {
    const result = connectChannelSchema.safeParse({
      channelType: "WHATSAPP",
      provider: "META_OFFICIAL",
      accessToken: "x".repeat(512),
      phoneNumberId: "123456789012345",
      appSecret: "secret",
      verifyToken: "verify-token",
    });

    expect(result.success).toBe(true);
  });
});
