import { describe, expect, it } from "vitest";
import { getPortalRedirects } from "@/config/redirects";

describe("Portal compatibility redirects", () => {
  it("sends authenticated entrypoints to app.vase.ar", () => {
    expect(getPortalRedirects("https://app.vase.ar")).toEqual(
      expect.arrayContaining([
        {
          source: "/app",
          destination: "https://app.vase.ar/app",
          permanent: true,
        },
        {
          source: "/signin",
          destination: "https://app.vase.ar/signin",
          permanent: true,
        },
        {
          source: "/register",
          destination: "https://app.vase.ar/register",
          permanent: true,
        },
      ]),
    );
  });
});
