import { describe, expect, it } from "vitest";
import { describeWorkProgress, matchesWorkDate } from "@/lib/business/work-board";
import { formatPlanPrice } from "@/components/panel/products";
import { assignableModuleIds, effectiveModuleIds, sanitizeModuleSelection } from "@/lib/team/team-access";

const contracted = ["vase_business", "vase_labs"];

describe("team product access", () => {
  it("keeps Business out of the Miembro role", () => {
    expect(assignableModuleIds("MEMBER", contracted)).toEqual(["vase_labs"]);
    expect(assignableModuleIds("MANAGER", contracted)).toEqual(contracted);
  });

  it("drops modules that are not contracted, repeated or not allowed", () => {
    expect(sanitizeModuleSelection("MANAGER", ["vase_labs", "vase_labs", "vase_rest", 3], contracted)).toEqual(["vase_labs"]);
    expect(sanitizeModuleSelection("MEMBER", ["vase_business"], contracted)).toEqual([]);
    expect(sanitizeModuleSelection("MANAGER", "vase_labs", contracted)).toEqual([]);
  });

  it("treats no explicit rows as everything contracted", () => {
    expect(effectiveModuleIds([], contracted)).toEqual(contracted);
    expect(effectiveModuleIds([{ moduleId: "vase_labs", isActive: true }, { moduleId: "vase_business", isActive: false }], contracted)).toEqual(["vase_labs"]);
  });
});

describe("work board", () => {
  const now = new Date(2026, 10, 9);

  it("filters by date", () => {
    expect(matchesWorkDate(new Date(2026, 10, 1), "mes", now)).toBe(true);
    expect(matchesWorkDate(new Date(2026, 9, 31), "mes", now)).toBe(false);
    expect(matchesWorkDate(new Date(2026, 8, 1), "tres", now)).toBe(true);
    expect(matchesWorkDate(new Date(2026, 1, 1), "tres", now)).toBe(false);
    expect(matchesWorkDate(new Date(2026, 1, 1), "anio", now)).toBe(true);
    expect(matchesWorkDate(new Date(2025, 11, 31), "anio", now)).toBe(false);
  });

  it("marks the client's turn when a quote is waiting", () => {
    const progress = describeWorkProgress({ status: "QUOTED", quoteStatus: "PENDING_CLIENT", quoteAmount: "$480.000" });
    expect(progress.isClientTurn).toBe(true);
    expect(progress.next).toContain("$480.000");
    expect(progress.segments).toEqual(["done", "done", "now", "todo", "todo"]);
  });

  it("completes every step on delivery", () => {
    const progress = describeWorkProgress({ status: "DELIVERED" });
    expect(progress.segments.every((segment) => segment === "done")).toBe(true);
    expect(progress.state).toBe("Terminado");
  });
});

describe("plan prices from admin", () => {
  it("combines one-time and monthly prices", () => {
    expect(
      formatPlanPrice([
        { price: 780000, currency: "ARS", type: "ONE_TIME" },
        { price: 25000, currency: "ARS", type: "MONTHLY" },
      ]).replace(/\s/g, " "),
    ).toBe("$ 780.000 + $ 25.000 por mes");
  });

  it("uses the newest row of each type", () => {
    expect(
      formatPlanPrice([
        { price: 200, currency: "ARS", type: "MONTHLY" },
        { price: 100, currency: "ARS", type: "MONTHLY" },
      ]).replace(/\s/g, " "),
    ).toBe("$ 200 por mes");
  });

  it("asks to consult when admin has no price", () => {
    expect(formatPlanPrice([])).toBe("A consultar");
  });
});
