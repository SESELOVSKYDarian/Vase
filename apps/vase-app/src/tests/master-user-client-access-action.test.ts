import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminPermission: vi.fn(),
  getRequestContext: vi.fn(),
  ensureModuleCatalogSynced: vi.fn(),
  adaptLegacy: vi.fn(),
  applyAccess: vi.fn(),
  lockOwner: vi.fn(),
  persistAuditLog: vi.fn(),
  emitAuditLogEvent: vi.fn(),
  revalidatePath: vi.fn(),
  transaction: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ platformRoles: {}, requireVerifiedPlatformRole: vi.fn(), requireVerifiedUser: vi.fn() }));
vi.mock("@/lib/auth/admin-permissions", () => ({
  adminPermissions: { USERS: "USERS" },
  requireAdminPermission: mocks.requireAdminPermission,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    module: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/security/request", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/server/services/audit-log", () => ({
  createAuditLog: vi.fn(),
  persistAuditLog: mocks.persistAuditLog,
  emitAuditLogEvent: mocks.emitAuditLogEvent,
}));
vi.mock("@/server/services/admin-notifications-auto", () => ({ createAutoAdminNotification: vi.fn() }));
vi.mock("@/server/services/modules", () => ({
  ensureModuleCatalogSynced: mocks.ensureModuleCatalogSynced,
  normalizePricingType: vi.fn(),
}));
vi.mock("@/server/services/client-product-access", () => ({
  adaptLegacyClientProductAccessWithTx: mocks.adaptLegacy,
  applyClientProductAccess: mocks.applyAccess,
  lockClientOwnerWithTx: mocks.lockOwner,
}));

import { upsertMasterUserWithStateAction } from "@/app/(platform)/app/admin/actions";

const userId = "ckabcdefghijklmnopqrstuv";
const convertedAccess = {
  business: { submodules: [
    { id: "business-template", key: "plantilla", status: "ACTIVE", features: [{ featureId: "pages", enabled: true, value: 4 }] },
    { id: "business-custom", key: "personalizado", status: "TRIAL", features: [] },
  ] },
  labs: { submoduleId: "labs-growth", plan: "GROWTH", status: "TRIAL" },
  rest: null,
  management: { status: "ACTIVE" },
} as const;

function currentLegacyForm() {
  const form = new FormData();
  form.set("userId", userId);
  form.set("name", "Legacy Owner");
  form.set("email", "legacy@example.com");
  form.set("password", "");
  form.set("autoGeneratePassword", "false");
  form.set("temporaryPassword", "false");
  form.set("uiRole", "cliente");
  form.set("moduleIds", "vase_business,vase_labs,vase_management");
  form.set("clientAccessConfig", JSON.stringify({
    tenantPlan: "PRO",
    proSubmoduleIds: ["business-template", "labs-starter"],
    tenantName: "Ignored tenant",
    tenantSlug: "ignored-slug",
    accountName: "Ignored account",
    industry: "Ignored industry",
    tenantStatus: "SUSPENDED",
    tenantRole: "MEMBER",
    membershipStatus: "SUSPENDED",
    moduleLimits: { vase_labs: { chatbots: 25 } },
  }));
  return form;
}

describe("upsertMasterUserWithStateAction legacy client compatibility", () => {
  const state = { clientAccessConfig: "initial" as unknown };
  const tx = {
    role: { upsert: vi.fn().mockResolvedValue({ id: "role-client" }) },
    user: {
      findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) => where.id
        ? { id: userId, clientAccessConfig: { version: 2, productAccess: convertedAccess } }
        : { id: userId }),
      update: mocks.updateUser,
    },
    userRole: { deleteMany: vi.fn(), create: vi.fn() },
    userModuleAccess: { deleteMany: vi.fn(), createMany: vi.fn() },
    internalUserProfile: { upsert: vi.fn(), deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };

  beforeEach(() => {
    state.clientAccessConfig = "initial";
    vi.clearAllMocks();
    mocks.requireAdminPermission.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.getRequestContext.mockResolvedValue({ ipAddress: null, userAgent: null });
    mocks.adaptLegacy.mockResolvedValue(convertedAccess);
    mocks.applyAccess.mockResolvedValue({ tenantId: "tenant-1", activeModuleIds: ["vase_business", "vase_labs", "vase_management"] });
    mocks.updateUser.mockImplementation(async ({ data }: { data: { clientAccessConfig: unknown } }) => {
      state.clientAccessConfig = data.clientAccessConfig;
      return { id: userId, name: "Legacy Owner", email: "legacy@example.com" };
    });
    mocks.transaction.mockImplementation(async (callback) => {
      const snapshot = structuredClone(state);
      try {
        return await callback(tx);
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      }
    });
  });

  it("accepts the current form payload, converts it in the transaction, and stores only v2 product access", async () => {
    await expect(upsertMasterUserWithStateAction({}, currentLegacyForm())).resolves.toEqual({ success: "Usuario actualizado." });

    expect(mocks.adaptLegacy).toHaveBeenCalledWith(expect.objectContaining({
      tx,
      ownerUserId: userId,
      moduleIds: ["vase_business", "vase_labs", "vase_management"],
      rawConfig: expect.objectContaining({ tenantName: "Ignored tenant", tenantRole: "MEMBER" }),
      storedAccess: convertedAccess,
    }));
    expect(state.clientAccessConfig).toEqual({ version: 2, productAccess: convertedAccess });
    expect(mocks.applyAccess).toHaveBeenCalledWith(expect.objectContaining({
      tx,
      access: convertedAccess,
      businessFeatureMode: "PRESERVE",
    }));
    expect(mocks.persistAuditLog).toHaveBeenCalledTimes(1);
    expect(mocks.lockOwner).toHaveBeenCalledWith(tx, userId);
    expect(mocks.lockOwner.mock.invocationCallOrder[0]).toBeLessThan(tx.role.upsert.mock.invocationCallOrder[0]);
  });

  it("rolls back the user config and does not audit when product provisioning fails", async () => {
    mocks.applyAccess.mockRejectedValueOnce(new Error("SIMULATED_REST_FAILURE"));
    await expect(upsertMasterUserWithStateAction({}, currentLegacyForm())).resolves.toEqual({ error: "No pudimos guardar el usuario." });

    expect(state.clientAccessConfig).toBe("initial");
    expect(mocks.persistAuditLog).not.toHaveBeenCalled();
    expect(mocks.emitAuditLogEvent).not.toHaveBeenCalled();
  });

  it("asks the admin to choose a Rest plan when the legacy bridge is ambiguous", async () => {
    mocks.adaptLegacy.mockRejectedValueOnce(new Error("CLIENT_LEGACY_REST_PLAN_REQUIRED"));
    const form = currentLegacyForm();
    form.set("moduleIds", "vase_rest");

    await expect(upsertMasterUserWithStateAction({}, form)).resolves.toEqual({
      error: "Para activar Vase Rest, elegí un plan Rest publicado.",
    });
    expect(mocks.applyAccess).not.toHaveBeenCalled();
    expect(mocks.persistAuditLog).not.toHaveBeenCalled();
  });

  it("uses scoped REPLACE behavior for an explicit v2 submission", async () => {
    const form = currentLegacyForm();
    form.set("clientAccessConfig", JSON.stringify({ version: 2, productAccess: convertedAccess }));

    await expect(upsertMasterUserWithStateAction({}, form)).resolves.toEqual({ success: "Usuario actualizado." });
    expect(mocks.adaptLegacy).not.toHaveBeenCalled();
    expect(mocks.applyAccess).toHaveBeenCalledWith(expect.objectContaining({
      access: convertedAccess,
      businessFeatureMode: "REPLACE",
    }));
    expect(mocks.persistAuditLog).toHaveBeenCalledWith(tx, expect.objectContaining({
      metadata: expect.objectContaining({
        clientProductAccessChange: expect.objectContaining({
          before: expect.objectContaining({ labs: { plan: "GROWTH", status: "TRIAL" } }),
          after: expect.objectContaining({ labs: { plan: "GROWTH", status: "TRIAL" } }),
          featureChanges: [],
        }),
      }),
    }));
  });

  it.each(["tenantSlug", "tenantStatus", "unknownRoot"])(
    "rejects a v2 envelope containing the extra root field %s",
    async (field) => {
      const form = currentLegacyForm();
      form.set("clientAccessConfig", JSON.stringify({
        version: 2,
        productAccess: convertedAccess,
        [field]: "must-not-be-accepted",
      }));

      await expect(upsertMasterUserWithStateAction({}, form)).resolves.toEqual({
        error: "La configuracion de productos del cliente no es valida.",
      });
      expect(mocks.transaction).not.toHaveBeenCalled();
      expect(mocks.applyAccess).not.toHaveBeenCalled();
    },
  );
});
