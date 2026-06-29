import { prisma } from "@/lib/db/prisma";
import { getFallbackRolesFromPlatformRole } from "@/lib/auth/roles";

export async function getCanonicalAccessContract(input: { userId: string; tenantId: string }) {
  const [user, membership, roles, tenantModules, tenantSubmodules, moduleCatalog] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, platformRole: true, isDisabled: true },
    }),
    prisma.membership.findUnique({
      where: { userId_tenantId: { userId: input.userId, tenantId: input.tenantId } },
      select: { role: true, status: true },
    }),
    prisma.userRole.findMany({
      where: { userId: input.userId },
      select: { role: { select: { key: true } } },
    }),
    prisma.tenantModule.findMany({
      where: { tenantId: input.tenantId },
      select: { moduleId: true, isActive: true },
    }),
    prisma.tenantSubmodule.findMany({
      where: { tenantId: input.tenantId },
      select: { submoduleId: true, isActive: true },
    }),
    prisma.module.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        route: true,
        product: true,
        submodules: {
          where: { isActive: true },
          select: { id: true, name: true, key: true, route: true },
        },
      },
    }),
  ]);

  if (!user || !membership) return null;

  const roleKeys = roles.map((item) => item.role.key);
  const effectiveRoles =
    roleKeys.length > 0 ? roleKeys : getFallbackRolesFromPlatformRole(user.platformRole);
  const moduleState = new Map(tenantModules.map((item) => [item.moduleId, item.isActive]));
  const submoduleState = new Map(tenantSubmodules.map((item) => [item.submoduleId, item.isActive]));

  return {
    user: {
      id: user.id,
      email: user.email,
      disabled: user.isDisabled,
      platformRole: user.platformRole,
      roles: effectiveRoles,
    },
    tenant: {
      id: input.tenantId,
      membershipRole: membership.role,
      membershipStatus: membership.status,
    },
    modules: moduleCatalog.map((module) => ({
      moduleId: module.id,
      moduleName: module.name,
      route: module.route,
      product: module.product,
      enabled: Boolean(moduleState.get(module.id)),
      submodules: module.submodules.map((submodule) => ({
        submoduleId: submodule.id,
        submoduleKey: submodule.key,
        submoduleName: submodule.name,
        route: submodule.route,
        enabled: Boolean(submoduleState.get(submodule.id)),
        features: [],
      })),
    })),
  };
}

