import { requireAppRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export const adminPermissions = {
  USERS: "USERS",
  BILLING: "BILLING",
  FAQS: "FAQS",
  WIKI: "WIKI",
  AUDIT: "AUDIT",
  NOTIFICATIONS: "NOTIFICATIONS",
  MODULES: "MODULES",
} as const;

export type AdminPermission = (typeof adminPermissions)[keyof typeof adminPermissions];

export async function requireAdminPermission(permission: AdminPermission) {
  const session = await requireAppRole(["ADMIN", "SOPORTE"]);
  const role = session.user.platformRole;

  if (role === "SUPER_ADMIN") {
    return session;
  }

  if (role !== "SUPPORT") {
    throw new Error("FORBIDDEN");
  }

  const policy = await prisma.adminAccessPolicy.findUnique({
    where: { userId: session.user.id },
  });

  if (!policy) {
    throw new Error("FORBIDDEN");
  }

  const allowed =
    (permission === "USERS" && policy.canManageUsers) ||
    (permission === "BILLING" && policy.canManageBilling) ||
    (permission === "FAQS" && policy.canManageFaqs) ||
    (permission === "WIKI" && policy.canManageWiki) ||
    (permission === "AUDIT" && policy.canViewAudit) ||
    (permission === "NOTIFICATIONS" && policy.canManageNotifications);

  if (!allowed) {
    throw new Error("FORBIDDEN");
  }

  return session;
}
