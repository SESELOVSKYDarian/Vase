import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LabsPlan } from "@vase/contracts";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  tenantFindUnique: vi.fn(),
  workspaceUpsert: vi.fn(),
  workspaceUpdate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    tenantAiWorkspace: { update: mocks.workspaceUpdate },
  },
}));

import { updateLabsAdminTenant } from "@/server/services/labs-admin";

const tx = {
  tenant: { findUnique: mocks.tenantFindUnique },
  tenantAiWorkspace: { upsert: mocks.workspaceUpsert },
  auditLog: { create: mocks.auditCreate },
};

const expectedChannels: Record<LabsPlan, { WHATSAPP: number; INSTAGRAM: number; FACEBOOK: number }> = {
  STARTER: { WHATSAPP: 1, INSTAGRAM: 0, FACEBOOK: 0 },
  PRO: { WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 0 },
  GROWTH: { WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 1 },
};

describe("updateLabsAdminTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    mocks.tenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      status: "ACTIVE",
      aiWorkspace: { plan: "START", entitlementPlan: "PRO" },
      tenantModules: [{ isActive: true, commercialStatus: "TRIAL" }],
      tenantSubmodules: [{
        isActive: true,
        commercialStatus: "TRIAL",
        submodule: { moduleId: "vase_labs", key: "pro" },
      }],
    });
    mocks.workspaceUpsert.mockResolvedValue({ id: "workspace-1" });
    mocks.workspaceUpdate.mockResolvedValue({ id: "workspace-1" });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
  });

  it.each(Object.entries(expectedChannels) as Array<[LabsPlan, typeof expectedChannels[LabsPlan]]>)(
    "clears %s override provenance while persisting canonical authoritative-plan limits",
    async (plan, expected) => {
    mocks.tenantFindUnique.mockResolvedValueOnce({
      id: "tenant-1",
      status: "ACTIVE",
      aiWorkspace: { plan: "START", entitlementPlan: plan },
      tenantModules: [{ isActive: true, commercialStatus: "TRIAL" }],
      tenantSubmodules: [{
        isActive: true,
        commercialStatus: "TRIAL",
        submodule: { moduleId: "vase_labs", key: plan.toLowerCase() },
      }],
    });
    await updateLabsAdminTenant({
      globalTenantId: "tenant-1",
      channelLimits: null,
      reason: "Restaurar plan base",
    }, "admin-1");

    expect(mocks.workspaceUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        channelLimits: expected,
        channelOverrideReason: null,
        channelOverrideBy: null,
        channelOverrideAt: null,
      }),
      update: expect.objectContaining({
        channelLimits: expected,
        channelOverrideReason: null,
        channelOverrideBy: null,
        channelOverrideAt: null,
      }),
    }));
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });

  it("syncs the Labs commercial Trial instead of the unrelated tenant lifecycle", async () => {
    await updateLabsAdminTenant({
      globalTenantId: "tenant-1",
      channelLimits: null,
      reason: "Restaurar plan base",
    }, "admin-1");

    const request = vi.mocked(fetch).mock.calls[0][1];
    expect(JSON.parse(String(request?.body))).toMatchObject({ plan: "PRO", status: "TRIAL" });
  });

  it("does not perform external sync when audit persistence aborts the transaction", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_WRITE_FAILED"));

    await expect(updateLabsAdminTenant({
      globalTenantId: "tenant-1",
      channelLimits: null,
      reason: "Restaurar plan base",
    }, "admin-1")).rejects.toThrow("AUDIT_WRITE_FAILED");

    expect(mocks.workspaceUpsert).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.workspaceUpdate).not.toHaveBeenCalled();
  });
});
