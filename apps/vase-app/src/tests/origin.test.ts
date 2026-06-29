import { afterEach, describe, expect, it } from "vitest";
import { getCanonicalOrigin } from "@/lib/security/origin";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  }
});

describe("canonical origin", () => {
  it("uses NEXT_PUBLIC_APP_URL instead of trusted-origin ordering", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.vase.ar/";
    expect(getCanonicalOrigin()).toBe("https://app.vase.ar");
  });
});
