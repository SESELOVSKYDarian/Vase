import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminPermission: vi.fn(),
  getRequestContext: vi.fn(),
  getBusinessFeatureScope: vi.fn(),
  auditLog: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ platformRoles: {}, requireVerifiedPlatformRole: vi.fn(), requireVerifiedUser: vi.fn() }));
vi.mock("@/lib/auth/admin-permissions", () => ({
  adminPermissions: { MODULES: "MODULES" },
  requireAdminPermission: mocks.requireAdminPermission,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: { moduleFeature: { create: vi.fn() } } }));
vi.mock("@/lib/security/request", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/server/services/module-features", () => ({
  getBusinessFeatureScope: mocks.getBusinessFeatureScope,
  parseModuleFeatureDefault: () => null,
}));
vi.mock("@/server/services/audit-log", () => ({ createAuditLog: mocks.auditLog }));
vi.mock("@/server/services/admin-notifications-auto", () => ({ createAutoAdminNotification: vi.fn() }));
vi.mock("@/server/services/modules", () => ({ ensureModuleCatalogSynced: vi.fn(), normalizePricingType: vi.fn() }));

import { createModuleFeatureAction } from "@/app/(platform)/app/admin/actions";

describe("module feature action errors", () => {
  beforeEach(() => {
    mocks.getRequestContext.mockResolvedValue({ ipAddress: null, userAgent: null });
    mocks.requireAdminPermission.mockReset();
    mocks.getBusinessFeatureScope.mockReset();
  });

  it("does not expose raw permission or database errors", async () => {
    mocks.requireAdminPermission.mockRejectedValueOnce(new Error("FORBIDDEN"));
    const forbidden = await createModuleFeatureAction({}, new FormData());
    expect(forbidden).toEqual({ error: "No tienes permisos para gestionar características." });
    expect(forbidden.error).not.toContain("FORBIDDEN");

    mocks.requireAdminPermission.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.getBusinessFeatureScope.mockRejectedValueOnce(new Error("Prisma database password leaked"));
    const formData = new FormData();
    formData.set("moduleId", "business");
    formData.set("key", "catalog");
    formData.set("name", "Catálogo");
    formData.set("valueType", "BOOLEAN");
    formData.set("trialDefault", "true");
    formData.set("activeDefault", "false");
    formData.set("sortOrder", "0");
    formData.set("isActive", "on");
    const database = await createModuleFeatureAction({}, formData);
    expect(database).toEqual({ error: "No pudimos crear la característica." });
    expect(database.error).not.toContain("Prisma database password leaked");
  });
});
