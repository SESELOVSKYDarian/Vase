import type { Prisma } from "@prisma/client";
import type { ManagementSessionContext } from "@vase/contracts";
import { prisma } from "../prisma";

type ProjectionDatabase = {
  $transaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>;
};

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "P2002";
}

export function createCentralManagementIdentityProjector(
  db: ProjectionDatabase,
) {
  return async function projectCentralManagementIdentity(
    context: ManagementSessionContext,
  ) {
    return db.$transaction(async (tx) => {
      const email = context.email.toLowerCase();
      const [globalUser, emailUser] = await Promise.all([
        tx.user.findUnique({
          where: { globalUserId: context.globalUserId },
        }),
        tx.user.findUnique({ where: { email } }),
      ]);

      if (
        emailUser?.globalUserId !== null
        && emailUser?.globalUserId !== undefined
        && emailUser.globalUserId !== context.globalUserId
      ) {
        throw new Error("MANAGEMENT_IDENTITY_CONFLICT");
      }
      if (globalUser && emailUser && globalUser.id !== emailUser.id) {
        throw new Error("MANAGEMENT_IDENTITY_CONFLICT");
      }

      const isSuperAdmin = context.platformRole === "SUPER_ADMIN";
      const profile = {
        globalUserId: context.globalUserId,
        email,
        name: context.name,
        isActive: true,
        isSuperAdmin,
        password: null,
      };

      let identityUser = globalUser;
      if (!identityUser) {
        try {
          identityUser = await tx.user.upsert({
            where: { email },
            update: { email },
            create: {
              ...profile,
              emailVerified: new Date(),
            },
          });
        } catch (error) {
          if (isUniqueConstraintError(error)) {
            throw new Error("MANAGEMENT_IDENTITY_CONFLICT");
          }
          throw error;
        }

        if (identityUser.globalUserId === null) {
          const claim = await tx.user.updateMany({
            where: {
              id: identityUser.id,
              OR: [
                { globalUserId: null },
                { globalUserId: context.globalUserId },
              ],
            },
            data: { globalUserId: context.globalUserId },
          });
          if (claim.count !== 1) {
            throw new Error("MANAGEMENT_IDENTITY_CONFLICT");
          }
        } else if (identityUser.globalUserId !== context.globalUserId) {
          throw new Error("MANAGEMENT_IDENTITY_CONFLICT");
        }
      }

      let user;
      try {
        user = await tx.user.update({
          where: { id: identityUser.id },
          data: {
            ...profile,
            emailVerified: identityUser.emailVerified ?? new Date(),
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new Error("MANAGEMENT_IDENTITY_CONFLICT");
        }
        throw error;
      }

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
  };
}

export const projectCentralManagementIdentity =
  createCentralManagementIdentityProjector(prisma);
