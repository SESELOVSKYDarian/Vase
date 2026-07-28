import { describe, expect, it } from "vitest";
import {
  analyticsCsv,
  buildRestAnalytics,
  localDayRange,
} from "../apps/vase-rest/app/lib/analytics/analytics-service";

describe("Rest analytics", () => {
  it("uses branch timezone boundaries and reconciled financial records", () => {
    const range = localDayRange("2026-07-28", "America/Argentina/Buenos_Aires");
    expect(range.from.toISOString()).toBe("2026-07-28T03:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-07-29T02:59:59.999Z");
    const result = buildRestAnalytics({
      now: new Date("2026-07-29T03:00:00.000Z"),
      branches: [
        { id: "branch_1", name: "Centro" },
        { id: "branch_2", name: "Norte" },
      ],
      orders: [
        { id: "order_1", branchId: "branch_1", status: "PAID", total: "1000.00" },
        { id: "order_2", branchId: "branch_2", status: "REFUNDED", total: "500.00" },
      ],
      payments: [
        { branchId: "branch_1", status: "APPLIED", amount: "1000.00" },
        { branchId: "branch_2", status: "REFUNDED", amount: "500.00" },
      ],
      refunds: [
        { branchId: "branch_2", status: "APPLIED", amount: "500.00" },
      ],
      fiscalDocuments: [
        { branchId: "branch_1", status: "AUTHORIZED", total: "1000.00" },
      ],
      accountMovements: [
        { branchId: "branch_1", amount: "250.00" },
        { branchId: "branch_2", amount: "-50.00" },
      ],
      edges: [
        { branchId: "branch_1", lastSeenAt: new Date("2026-07-29T02:59:30.000Z") },
        { branchId: "branch_2", lastSeenAt: new Date("2026-07-29T02:40:00.000Z") },
      ],
    });
    expect(result.totals).toMatchObject({
      collected: "1000.00",
      refunded: "500.00",
      netCollected: "500.00",
      fiscalAuthorized: "1000.00",
      customerAccountBalance: "200.00",
    });
    expect(result.branches.find((branch) => branch.id === "branch_2"))
      .toMatchObject({ edgeState: "STALE", netCollected: "-500.00" });
    const csv = analyticsCsv({
      ...result,
      branches: [{ ...result.branches[0]!, name: "=CMD()" }],
    });
    expect(csv).toContain("\"'=CMD()\"");
  });
});
