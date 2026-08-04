import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  requireAdminPermission: vi.fn(),
  getRequestContext: vi.fn(),
  getBusinessFeatureScope: vi.fn(),
  auditLog: vi.fn(),
  createFeature: vi.fn(),
  updateFeature: vi.fn(),
  deleteFeature: vi.fn(),
  findFeature: vi.fn(),
  persistAuditLog: vi.fn(),
  emitAuditLogEvent: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ platformRoles: {}, requireVerifiedPlatformRole: vi.fn(), requireVerifiedUser: vi.fn() }));
vi.mock("@/lib/auth/admin-permissions", () => ({
  adminPermissions: { MODULES: "MODULES" },
  requireAdminPermission: mocks.requireAdminPermission,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    moduleFeature: {},
  },
}));
vi.mock("@/lib/security/request", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/server/services/module-features", async () => {
  const actual = await vi.importActual<typeof import("@/server/services/module-features")>("@/server/services/module-features");
  return { ...actual, getBusinessFeatureScope: mocks.getBusinessFeatureScope };
});
vi.mock("@/server/services/audit-log", () => ({
  createAuditLog: mocks.auditLog,
  persistAuditLog: mocks.persistAuditLog,
  emitAuditLogEvent: mocks.emitAuditLogEvent,
}));
vi.mock("@/server/services/admin-notifications-auto", () => ({ createAutoAdminNotification: vi.fn() }));
vi.mock("@/server/services/modules", () => ({ ensureModuleCatalogSynced: vi.fn(), normalizePricingType: vi.fn() }));

import { createModuleFeatureAction, deleteModuleFeatureAction, updateModuleFeatureAction } from "@/app/(platform)/app/admin/actions";

describe("module feature action errors", () => {
  beforeEach(() => {
    mocks.getRequestContext.mockResolvedValue({ ipAddress: null, userAgent: null });
    mocks.requireAdminPermission.mockReset();
    mocks.getBusinessFeatureScope.mockReset();
    mocks.createFeature.mockReset();
    mocks.updateFeature.mockReset();
    mocks.deleteFeature.mockReset();
    mocks.findFeature.mockReset();
    mocks.persistAuditLog.mockReset();
    mocks.emitAuditLogEvent.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.transaction.mockReset();
    mocks.transaction.mockImplementation(async (callback) => callback({
      module: { findUnique: vi.fn() },
      moduleSubmodule: { findUnique: vi.fn() },
      moduleFeature: {
        create: mocks.createFeature,
        update: mocks.updateFeature,
        delete: mocks.deleteFeature,
        findUnique: mocks.findFeature,
      },
      auditLog: { create: vi.fn() },
    }));
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

  it("preserves empty TEXT and zero INTEGER defaults through create action modes", async () => {
    mocks.requireAdminPermission.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.getBusinessFeatureScope.mockResolvedValue({ moduleId: "business", submoduleId: null });
    mocks.createFeature.mockResolvedValue({ id: "feature-1", moduleId: "business", submoduleId: null, key: "copy" });

    const textForm = new FormData();
    textForm.set("moduleId", "business"); textForm.set("key", "copy"); textForm.set("name", "Copy"); textForm.set("valueType", "TEXT");
    textForm.set("trialDefaultMode", "value"); textForm.set("trialDefault", ""); textForm.set("activeDefaultMode", "null"); textForm.set("sortOrder", "0"); textForm.set("isActive", "on");
    await expect(createModuleFeatureAction({}, textForm)).resolves.toEqual({ success: "Característica creada." });
    expect(mocks.createFeature.mock.calls[0][0].data.trialDefault).toBe("");
    expect(mocks.createFeature.mock.calls[0][0].data.activeDefault).toBe(Prisma.JsonNull);
    expect(mocks.persistAuditLog).toHaveBeenCalledTimes(1);
    expect(mocks.emitAuditLogEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "platform.module_feature_created" }));

    const integerForm = new FormData();
    integerForm.set("moduleId", "business"); integerForm.set("key", "count"); integerForm.set("name", "Cantidad"); integerForm.set("valueType", "INTEGER");
    integerForm.set("trialDefaultMode", "value"); integerForm.set("trialDefault", "0"); integerForm.set("activeDefaultMode", "null"); integerForm.set("sortOrder", "0"); integerForm.set("isActive", "on");
    await expect(createModuleFeatureAction({}, integerForm)).resolves.toEqual({ success: "Característica creada." });
    expect(mocks.createFeature.mock.calls[1][0].data.trialDefault).toBe(0);
  });

  it("uses one transaction for update and delete before auditing and revalidating", async () => {
    mocks.requireAdminPermission.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.getBusinessFeatureScope.mockResolvedValue({ moduleId: "business", submoduleId: null });
    const existing = { id: "ckabcdefghijklmnopqrstuv", moduleId: "business", submoduleId: null, key: "catalog" };
    mocks.findFeature.mockResolvedValue(existing);
    mocks.updateFeature.mockResolvedValue(existing);
    mocks.deleteFeature.mockResolvedValue(existing);

    const updateForm = new FormData();
    updateForm.set("featureId", existing.id); updateForm.set("name", "Catálogo"); updateForm.set("valueType", "BOOLEAN");
    updateForm.set("trialDefault", "true"); updateForm.set("activeDefault", ""); updateForm.set("sortOrder", "0"); updateForm.set("isActive", "on");
    await expect(updateModuleFeatureAction({}, updateForm)).resolves.toEqual({ success: "Característica actualizada." });
    expect(mocks.updateFeature).toHaveBeenCalledTimes(1);
    expect(mocks.persistAuditLog).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ action: "platform.module_feature_updated" }));

    const deleteForm = new FormData();
    deleteForm.set("featureId", existing.id);
    await expect(deleteModuleFeatureAction({}, deleteForm)).resolves.toEqual({ success: "Característica eliminada." });
    expect(mocks.deleteFeature).toHaveBeenCalledWith({ where: { id: existing.id } });
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/modules");
    expect(mocks.emitAuditLogEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "platform.module_feature_deleted" }));
  });
});
