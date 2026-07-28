import { describe, expect, it, vi } from "vitest";
import {
  capabilitiesForRole,
  hasCapability,
} from "../apps/vase-rest/app/lib/staff/capabilities";
import { createStaffService } from "../apps/vase-rest/app/lib/staff/staff-service";

describe("Rest staff permissions", () => {
  it("defines least-privilege capabilities for every operational role", () => {
    expect(capabilitiesForRole("OWNER")).toContain("settings:write");
    expect(capabilitiesForRole("MANAGER")).toContain("staff:write");
    expect(capabilitiesForRole("CASHIER")).toContain("cash:operate");
    expect(capabilitiesForRole("WAITER")).toContain("orders:write");
    expect(capabilitiesForRole("KITCHEN")).toContain("kds:operate");
    expect(capabilitiesForRole("STOCK")).toContain("inventory:write");
    expect(capabilitiesForRole("DELIVERY")).toContain("delivery:operate");
    expect(hasCapability("WAITER", "cash:close")).toBe(false);
    expect(hasCapability("KITCHEN", "staff:write")).toBe(false);
  });

  it("preserves different roles for the same employee at different branches", async () => {
    const create = vi.fn(async (input) => ({
      id: "staff_1",
      employeeCode: input.employeeCode,
      displayName: input.displayName,
      active: true,
      roles: input.roles,
    }));
    const service = createStaffService({
      countActive: async () => 0,
      employeeCodeExists: async () => false,
      create,
      update: vi.fn(),
      revokeSessions: vi.fn(),
    });
    const staff = await service.create({
      globalTenantId: "tenant_1",
      employeeLimit: 15,
      status: "ACTIVE",
      actorId: "owner_1",
    }, {
      employeeCode: "MARI",
      displayName: "María",
      pin: "1842",
      roles: [
        { branchId: "branch_1", role: "MANAGER" },
        { branchId: "branch_2", role: "CASHIER" },
      ],
    });
    expect(staff.roles).toEqual([
      { branchId: "branch_1", role: "MANAGER" },
      { branchId: "branch_2", role: "CASHIER" },
    ]);
    expect(staff).not.toHaveProperty("pinHash");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      pinHash: expect.not.stringMatching(/^1842$/),
    }));
  });

  it("enforces tenant capacity, unique codes, disable and session revocation", async () => {
    const revokeSessions = vi.fn(async () => undefined);
    const update = vi.fn(async () => ({
      id: "staff_1",
      employeeCode: "MARI",
      displayName: "María",
      active: false,
      roles: [],
    }));
    const full = createStaffService({
      countActive: async () => 15,
      employeeCodeExists: async () => false,
      create: vi.fn(),
      update,
      revokeSessions,
    });
    await expect(full.create({
      globalTenantId: "tenant_1",
      employeeLimit: 15,
      status: "ACTIVE",
      actorId: "owner_1",
    }, {
      employeeCode: "NEW",
      displayName: "Nueva",
      pin: "1111",
      roles: [{ branchId: "branch_1", role: "WAITER" }],
    })).rejects.toThrow("REST_EMPLOYEE_LIMIT_REACHED");

    await full.update({
      globalTenantId: "tenant_1",
      employeeLimit: 15,
      status: "ACTIVE",
      actorId: "owner_1",
    }, "staff_1", { active: false });
    expect(revokeSessions).toHaveBeenCalledWith("tenant_1", "staff_1");
  });
});
