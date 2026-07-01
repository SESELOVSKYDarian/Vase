import { describe, expect, it } from "vitest";
import { resolveProductOrigins } from "@/config/origins";

describe("product origins", () => {
  it("uses the official production domains by default", () => {
    expect(resolveProductOrigins({})).toEqual({
      publicSite: "https://vase.ar",
      app: "https://app.vase.ar",
      labs: "https://labs.vase.ar",
    });
  });

  it("normalizes configured values", () => {
    expect(
      resolveProductOrigins({
        publicSite: "http://localhost:3001/",
        app: "http://localhost:3002/",
        labs: "http://localhost:3007/",
      }),
    ).toEqual({
      publicSite: "http://localhost:3001",
      app: "http://localhost:3002",
      labs: "http://localhost:3007",
    });
  });
});
