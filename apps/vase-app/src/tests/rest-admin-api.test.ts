import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireVerifiedPlatformRole: vi.fn(),
  listRestAdminData: vi.fn(),
  executeRestAdminCommand: vi.fn(),
  getRestAdminOperations: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireVerifiedPlatformRole: mocks.requireVerifiedPlatformRole,
}));

vi.mock("@/server/services/rest-admin", () => ({
  listRestAdminData: mocks.listRestAdminData,
  executeRestAdminCommand: mocks.executeRestAdminCommand,
  getRestAdminOperations: mocks.getRestAdminOperations,
  restAdminErrorStatus: (error: unknown) => {
    const message = error instanceof Error ? error.message : "REST_ADMIN_FAILED";
    return message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  },
}));

import { GET, POST } from "@/app/api/admin/rest/plans/route";
import { GET as GET_OPERATIONS } from "@/app/api/admin/rest/operations/route";

describe("browser Rest admin API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireVerifiedPlatformRole.mockResolvedValue({
      user: { id: "admin-1", platformRole: "SUPER_ADMIN", isEmailVerified: true },
    });
    mocks.listRestAdminData.mockResolvedValue({ versions: [], contractTenants: [] });
    mocks.executeRestAdminCommand.mockResolvedValue({ id: "version-1" });
    mocks.getRestAdminOperations.mockResolvedValue({ health: "ok", tenants: [], edges: [] });
  });

  it("rejects requests without a verified Super Admin session", async () => {
    mocks.requireVerifiedPlatformRole.mockRejectedValue(new Error("UNAUTHENTICATED"));
    const response = await GET(new Request("https://admin.vase.ar/api/admin/rest/plans"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHENTICATED" });
    expect(mocks.listRestAdminData).not.toHaveBeenCalled();
  });

  it("uses the authenticated actor instead of a client supplied creator", async () => {
    const command = { action: "CREATE_DRAFT", createdById: "attacker" };
    const response = await POST(new Request("https://admin.vase.ar/api/admin/rest/plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(command),
    }));
    expect(response.status).toBe(200);
    expect(mocks.executeRestAdminCommand).toHaveBeenCalledWith(command, "admin-1");
  });

  it("returns forbidden instead of an authentication redirect", async () => {
    mocks.requireVerifiedPlatformRole.mockRejectedValue(new Error("FORBIDDEN"));
    const response = await GET(new Request("https://admin.vase.ar/api/admin/rest/plans"));
    expect(response.status).toBe(403);
    expect(response.headers.get("location")).toBeNull();
  });

  it("reports an unavailable Rest service without redirecting", async () => {
    mocks.getRestAdminOperations.mockRejectedValue(new Error("REST_ADMIN_UPSTREAM_UNAVAILABLE"));
    const response = await GET_OPERATIONS(new Request("https://admin.vase.ar/api/admin/rest/operations"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "REST_ADMIN_UPSTREAM_UNAVAILABLE" });
    expect(response.headers.get("location")).toBeNull();
  });
});
