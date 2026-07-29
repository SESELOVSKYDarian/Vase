import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Rest operational forms", () => {
  it("selects real Edge tables instead of asking staff for internal IDs", async () => {
    const [orders, reservations] = await Promise.all([
      readFile(new URL(
        "../apps/vase-rest/app/(product)/waiter/orders/page.tsx",
        import.meta.url,
      ), "utf8"),
      readFile(new URL(
        "../apps/vase-rest/app/(product)/waiter/reservations/page.tsx",
        import.meta.url,
      ), "utf8"),
    ]);
    expect(orders).toContain('state("TABLE")');
    expect(orders).toContain('<select name="tableId"');
    expect(reservations).toContain('state("TABLE")');
    expect(reservations).toContain('name="tableIds"');
    expect(reservations).not.toContain("IDs de mesas");
  });
});
