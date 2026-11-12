import { describe, expect, it } from "vitest";
import {
  NAVIGATION_GROUPS,
  activeNavigation,
  navigationForRole,
} from "../apps/vase-rest/app/(product)/navigation";

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

  it("keeps every item inside a known menu group, in group order", () => {
    const items = navigationForRole("OWNER");
    const order = items.map((item) => NAVIGATION_GROUPS.indexOf(item.group));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("resolves the active section and sub-page from the path", () => {
    const owner = navigationForRole("OWNER");
    expect(activeNavigation(owner, "/owner").section?.key).toBe("home");
    expect(activeNavigation(owner, "/owner/settings/fiscal").section?.key).toBe("settings");
    expect(activeNavigation(owner, "/owner/settings/fiscal").child?.key).toBe("settings-fiscal");
    expect(activeNavigation(owner, "/owner/catalog").section?.key).toBe("catalog");

    const cashier = navigationForRole("CASHIER");
    expect(activeNavigation(cashier, "/cash").child?.key).toBe("cash-shift");
    expect(activeNavigation(cashier, "/cash/accounts").child?.key).toBe("cash-accounts");
    expect(activeNavigation(cashier, "/waiter/orders/abc").section?.key).toBe("orders");
    expect(activeNavigation(cashier, "/owner/settings").section).toBeNull();
  });
});
