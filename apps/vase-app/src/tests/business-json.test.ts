import { describe, expect, it } from "vitest";
import { toInputJsonObject } from "@/server/services/business/shared";

describe("business JSON normalization", () => {
  it("keeps JSON values and removes unsupported object properties", () => {
    expect(
      toInputJsonObject({
        id: "sync-1",
        price: 1200,
        active: true,
        tags: ["featured", null],
        nested: {
          value: "ok",
          ignored: undefined,
        },
        ignored: undefined,
      }),
    ).toEqual({
      id: "sync-1",
      price: 1200,
      active: true,
      tags: ["featured", null],
      nested: {
        value: "ok",
      },
    });
  });
});
