import { describe, expect, it } from "vitest";
import {
  buildTenantModuleAccessSummary,
  userAccessModuleIds,
} from "@/lib/admin/user-access";

describe("admin user access helpers", () => {
  it("uses stable module ids for Business and Labs access", () => {
    expect(userAccessModuleIds.business).toBe("vase_business");
    expect(userAccessModuleIds.labs).toBe("vase_labs");
  });

  it("summarizes active tenant modules for admin display", () => {
    expect(
      buildTenantModuleAccessSummary([
        { moduleId: "vase_business", isActive: true },
        { moduleId: "vase_labs", isActive: true },
      ]),
    ).toBe("Vase Business, Vase Labs");

    expect(
      buildTenantModuleAccessSummary([
        { moduleId: "vase_business", isActive: false },
        { moduleId: "vase_labs", isActive: true },
      ]),
    ).toBe("Vase Labs");

    expect(buildTenantModuleAccessSummary([])).toBe("Sin modulos");
  });
});
