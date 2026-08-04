import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireVerifiedPlatformRole: vi.fn(),
  listLabsAdminTenants: vi.fn(),
  updateLabsAdminTenant: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireVerifiedPlatformRole: mocks.requireVerifiedPlatformRole,
}));

vi.mock("@/server/services/labs-admin", () => ({
  listLabsAdminTenants: mocks.listLabsAdminTenants,
  updateLabsAdminTenant: mocks.updateLabsAdminTenant,
  labsAdminErrorStatus: (error: unknown) => {
    const message = error instanceof Error ? error.message : "LABS_ADMIN_FAILED";
    return message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
  },
}));

import { GET, POST } from "@/app/api/admin/labs/tenants/route";

describe("browser Labs admin API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireVerifiedPlatformRole.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.listLabsAdminTenants.mockResolvedValue([]);
    mocks.updateLabsAdminTenant.mockResolvedValue({ effective: { channelLimits: {} }, syncStatus: "SYNCED" });
  });

  it("requires a verified Super Admin", async () => {
    mocks.requireVerifiedPlatformRole.mockRejectedValue(new Error("FORBIDDEN"));
    const response = await GET(new Request("https://admin.vase.ar/api/admin/labs/tenants"));
    expect(response.status).toBe(403);
    expect(mocks.listLabsAdminTenants).not.toHaveBeenCalled();
  });

  it("uses the authenticated actor for audited overrides", async () => {
    const input = { globalTenantId: "tenant-1", channelLimits: null, reason: "Restaurar plan base" };
    const response = await POST(new Request("https://admin.vase.ar/api/admin/labs/tenants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }));
    expect(response.status).toBe(200);
    expect(mocks.updateLabsAdminTenant).toHaveBeenCalledWith(input, "admin-1");
  });
});
