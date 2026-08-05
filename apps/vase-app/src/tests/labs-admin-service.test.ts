import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
  workspaceUpsert: vi.fn(),
  workspaceUpdate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: { findUnique: mocks.tenantFindUnique },
    tenantAiWorkspace: {
      upsert: mocks.workspaceUpsert,
      update: mocks.workspaceUpdate,
    },
    auditLog: { create: mocks.auditCreate },
  },
}));

import { updateLabsAdminTenant } from "@/server/services/labs-admin";

describe("updateLabsAdminTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    mocks.tenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      status: "ACTIVE",
      aiWorkspace: { plan: "BASIC" },
      tenantSubmodules: [{
        isActive: true,
        submodule: { moduleId: "vase_labs", key: "starter" },
      }],
    });
    mocks.workspaceUpsert.mockResolvedValue({ id: "workspace-1" });
    mocks.workspaceUpdate.mockResolvedValue({ id: "workspace-1" });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
  });

  it("clears override provenance while persisting canonical plan-derived limits", async () => {
    await updateLabsAdminTenant({
      globalTenantId: "tenant-1",
      channelLimits: null,
      reason: "Restaurar plan base",
    }, "admin-1");

    expect(mocks.workspaceUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        channelLimits: { WHATSAPP: 1, INSTAGRAM: 0, FACEBOOK: 0 },
        channelOverrideReason: null,
        channelOverrideBy: null,
        channelOverrideAt: null,
      }),
      update: expect.objectContaining({
        channelLimits: { WHATSAPP: 1, INSTAGRAM: 0, FACEBOOK: 0 },
        channelOverrideReason: null,
        channelOverrideBy: null,
        channelOverrideAt: null,
      }),
    }));
  });
});
