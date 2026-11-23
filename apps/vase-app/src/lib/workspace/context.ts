import { forbidden } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { resolveAdminHomeUrl } from "@/lib/security/admin-host-routing";
import { isWorkspaceHost, isWorkspaceRole, WORKSPACE_INTERNAL_PREFIX } from "@/lib/security/workspace-host-routing";

/** Quién mira y desde dónde: en workspace.vase.ar los links van sin /app/workspace. */
export async function getWorkspaceContext() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isEmailVerified || !isWorkspaceRole(session.user.platformRole)) forbidden();
  const list = await headers();
  const host = (list.get("x-forwarded-host") ?? list.get("host") ?? "").split(",")[0]?.trim() ?? "";
  const role = session.user.platformRole as "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER";
  return {
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? "Equipo Vase",
    role,
    base: isWorkspaceHost(host) ? "" : WORKSPACE_INTERNAL_PREFIX,
    adminUrl: role === "SUPER_ADMIN" ? resolveAdminHomeUrl() : null,
  };
}
