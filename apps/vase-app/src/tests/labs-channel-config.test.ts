import { describe, expect, it } from "vitest";
import { buildMetaOfficialChannelConfig, getMetaOfficialChannelStatus } from "@/lib/labs/channel-config";

describe("Labs channel config helpers", () => {
  it("preserves existing Meta secrets when edit fields are left blank", () => {
    const config = buildMetaOfficialChannelConfig({
      existingConfig: {
        provider: "META_OFFICIAL",
        accessToken: "old-token",
        phoneNumberId: "old-phone",
        appSecret: "old-secret",
        verifyToken: "old-verify",
      },
      accessToken: undefined,
      phoneNumberId: "",
      appSecret: undefined,
      verifyToken: "new-verify",
    });

    expect(config).toEqual({
      provider: "META_OFFICIAL",
      accessToken: "old-token",
      phoneNumberId: "old-phone",
      appSecret: "old-secret",
      verifyToken: "new-verify",
    });
  });

  it("replaces Meta credentials when new values are provided", () => {
    const config = buildMetaOfficialChannelConfig({
      existingConfig: {
        provider: "META_OFFICIAL",
        accessToken: "old-token",
        phoneNumberId: "old-phone",
        appSecret: "old-secret",
        verifyToken: "old-verify",
      },
      accessToken: "new-token",
      phoneNumberId: "new-phone",
      appSecret: "new-secret",
      verifyToken: "new-verify",
    });

    expect(config.accessToken).toBe("new-token");
    expect(config.phoneNumberId).toBe("new-phone");
    expect(config.appSecret).toBe("new-secret");
    expect(config.verifyToken).toBe("new-verify");
  });

  it("marks Meta official channels connected only when required credentials exist", () => {
    expect(
      getMetaOfficialChannelStatus({
        provider: "META_OFFICIAL",
        accessToken: "token",
        phoneNumberId: "phone",
        appSecret: "secret",
        verifyToken: "verify",
      }),
    ).toBe("CONNECTED");

    expect(
      getMetaOfficialChannelStatus({
        provider: "META_OFFICIAL",
        accessToken: "token",
        phoneNumberId: "",
        appSecret: "secret",
        verifyToken: "verify",
      }),
    ).toBe("PENDING");
  });
});
