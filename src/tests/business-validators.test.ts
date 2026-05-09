import { describe, expect, it } from "vitest";
import { deleteStorefrontPagesSchema } from "@/lib/validators/business";

describe("business validators", () => {
  it("accepts multiple storefront page ids for bulk deletion", () => {
    const result = deleteStorefrontPagesSchema.safeParse({
      pageIds: ["clx8h1a2b0000abcde1234567", "clx8h1a2b0000abcde7654321"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects bulk deletion requests without selected pages", () => {
    const result = deleteStorefrontPagesSchema.safeParse({
      pageIds: [],
    });

    expect(result.success).toBe(false);
  });
});
