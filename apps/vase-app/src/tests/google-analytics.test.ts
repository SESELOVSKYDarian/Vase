import { describe, expect, it } from "vitest";
import {
  VASE_GOOGLE_ANALYTICS_ID,
  shouldLoadVaseGoogleAnalytics,
} from "@/lib/analytics/google-analytics";

describe("Vase Google Analytics", () => {
  it("loads the Vase analytics tag on the production vase.ar host", () => {
    expect(VASE_GOOGLE_ANALYTICS_ID).toBe("G-NPD7PKWZ5G");
    expect(
      shouldLoadVaseGoogleAnalytics({
        nodeEnv: "production",
        requestHost: "vase.ar",
      }),
    ).toBe(true);
    expect(
      shouldLoadVaseGoogleAnalytics({
        nodeEnv: "production",
        requestHost: "www.vase.ar",
      }),
    ).toBe(true);
  });

  it("does not load the Vase analytics tag on Labs or non-production hosts", () => {
    expect(
      shouldLoadVaseGoogleAnalytics({
        nodeEnv: "production",
        requestHost: "labs.vase.ar",
      }),
    ).toBe(false);
    expect(
      shouldLoadVaseGoogleAnalytics({
        nodeEnv: "development",
        requestHost: "vase.ar",
      }),
    ).toBe(false);
  });

  it("falls back to NEXT_PUBLIC_APP_URL when the request host is unavailable", () => {
    expect(
      shouldLoadVaseGoogleAnalytics({
        nodeEnv: "production",
        appUrl: "https://vase.ar",
      }),
    ).toBe(true);
    expect(
      shouldLoadVaseGoogleAnalytics({
        nodeEnv: "production",
        appUrl: "https://labs.vase.ar",
      }),
    ).toBe(false);
  });
});
