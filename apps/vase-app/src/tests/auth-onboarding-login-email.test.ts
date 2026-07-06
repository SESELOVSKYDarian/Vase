import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNoticeEmail = vi.fn();

vi.mock("@/server/services/auth-email", () => ({
  sendAuthEmail: vi.fn(),
  sendNoticeEmail,
}));

describe("sendLoginSecurityEmail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("does not throw when the SMTP provider rejects the login notification", async () => {
    sendNoticeEmail.mockRejectedValue(
      Object.assign(new Error("Invalid login"), {
        code: "EAUTH",
        responseCode: 535,
      }),
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendLoginSecurityEmail } = await import(
      "@/server/services/auth-onboarding"
    );

    await expect(
      sendLoginSecurityEmail({
        email: "demo@vase.ar",
        name: "Demo",
        requestContext: {
          ipAddress: "127.0.0.1",
          userAgent: "Vitest",
          host: "localhost:3002",
          protocol: "http",
        },
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      "[auth] login security email failed",
      expect.objectContaining({
        email: "demo@vase.ar",
        code: "EAUTH",
        responseCode: 535,
      }),
    );
  });
});
