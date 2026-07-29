import { describe, expect, it } from "vitest";
import { navigationForRole } from "../apps/vase-rest/app/(product)/navigation";

describe("Rest role navigation", () => {
  it("only exposes capabilities assigned to each local role", () => {
    expect(navigationForRole("WAITER").map((item) => item.key))
      .toEqual(["home", "salon", "orders", "reservations", "support"]);
    expect(navigationForRole("KITCHEN").map((item) => item.key))
      .toEqual(["home", "kds", "support"]);
    expect(navigationForRole("STOCK").map((item) => item.key))
      .toEqual(["home", "inventory", "support"]);
    expect(navigationForRole("OWNER").map((item) => item.key))
      .toContain("settings");
    expect(navigationForRole("CASHIER").map((item) => item.key))
      .not.toContain("settings");
  });
});
