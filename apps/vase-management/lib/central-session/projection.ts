import type { ManagementSessionContext } from "@vase/contracts";
import { prisma } from "../prisma";

export async function projectCentralManagementIdentity(
  context: ManagementSessionContext,
) {
  return prisma.$transaction(async (tx) => {
    const email = context.email.toLowerCase();
    const company = await tx.company.upsert({
      where: { globalTenantId: context.globalTenantId },
      update: {
        name: context.tenantName,
        isActive: true,
        provisioningStatus: "READY",
      },
      create: {
        globalTenantId: context.globalTenantId,
        name: context.tenantName,
        email: context.email,
        isActive: true,
        provisioningStatus: "READY",
      },
    });

    const existingUser = await tx.user.findFirst({
      where: {
        OR: [
          { globalUserId: context.globalUserId },
          { email },
        ],
      },
    });
    const isSuperAdmin = context.platformRole === "SUPER_ADMIN";
    const user = existingUser
      ? await tx.user.update({
        where: { id: existingUser.id },
        data: {
          globalUserId: context.globalUserId,
          email,
          name: context.name,
          emailVerified: existingUser.emailVerified ?? new Date(),
          isActive: true,
          isSuperAdmin,
          password: null,
        },
      })
      : await tx.user.create({
        data: {
          globalUserId: context.globalUserId,
          email,
          name: context.name,
          emailVerified: new Date(),
          isActive: true,
          isSuperAdmin,
          password: null,
        },
      });

    const roleName = context.managementRole === "ADMINISTRATOR"
      ? "Administrador"
      : "Vendedor";
    const roleDescription = roleName === "Administrador"
      ? "Acceso total al sistema"
      : "Acceso a ventas y clientes";
    const role = await tx.role.upsert({
      where: { name: roleName },
      update: { description: roleDescription, isSystem: true },
      create: {
        name: roleName,
        description: roleDescription,
        isSystem: true,
      },
    });

    await tx.companyUser.upsert({
      where: {
        companyId_userId: {
          companyId: company.id,
          userId: user.id,
        },
      },
      update: { roleId: role.id, isActive: true },
      create: {
        companyId: company.id,
        userId: user.id,
        roleId: role.id,
        isActive: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      isSuperAdmin: user.isSuperAdmin,
      companyId: company.id,
      companyName: company.name,
      branchId: null,
      roleId: role.id,
      roleName: role.name,
    };
  });
}
