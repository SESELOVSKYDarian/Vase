import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({ requireAppRole: mocks.requireAppRole }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { adminAccessPolicy: { findUnique: mocks.findUnique } },
}));

import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";

const supportSession = { user: { id: "support-1", platformRole: "SUPPORT" } };
const policy = {
  canManageUsers: true,
  canManageBilling: false,
  canManageFaqs: false,
  canManageWiki: false,
  canViewAudit: false,
  canManageNotifications: false,
};

describe("MODULES admin permission", () => {
  beforeEach(() => {
    mocks.requireAppRole.mockResolvedValue(supportSession);
    mocks.findUnique.mockReset();
  });

  it("allows SUPPORT users through the intentional canManageUsers fallback", async () => {
    mocks.findUnique.mockResolvedValue(policy);
    await expect(requireAdminPermission(adminPermissions.MODULES)).resolves.toEqual(supportSession);
  });

  it("denies SUPPORT users without the fallback grant", async () => {
    mocks.findUnique.mockResolvedValue({ ...policy, canManageUsers: false });
    await expect(requireAdminPermission(adminPermissions.MODULES)).rejects.toThrow("FORBIDDEN");
  });
});
