import { createHash } from "node:crypto";
import type { ManagementSsoClaims } from "@vase/contracts";
import { prisma } from "@/lib/prisma";

export async function provisionPlatformIdentity(claims: ManagementSsoClaims) {
  return prisma.$transaction(async (tx) => {
    const nonceHash = createHash("sha256").update(claims.nonce).digest("hex");
    await tx.managementSsoNonce.create({ data: { nonceHash, expiresAt: new Date(claims.expiresAt * 1000), usedAt: new Date() } });

    const company = await tx.company.upsert({
      where: { globalTenantId: claims.globalTenantId },
      update: { name: claims.tenantName, isActive: true, provisioningStatus: "READY" },
      create: { globalTenantId: claims.globalTenantId, name: claims.tenantName, email: claims.email, isActive: true, provisioningStatus: "READY" },
    });
    const existingUser = await tx.user.findFirst({ where: { OR: [{ globalUserId: claims.globalUserId }, { email: claims.email.toLowerCase() }] } });
    const user = existingUser
      ? await tx.user.update({ where: { id: existingUser.id }, data: { globalUserId: claims.globalUserId, name: claims.name, emailVerified: existingUser.emailVerified ?? new Date(), isActive: true } })
      : await tx.user.create({ data: { globalUserId: claims.globalUserId, email: claims.email.toLowerCase(), name: claims.name, emailVerified: new Date(), isActive: true } });
    const roleName = claims.role === "MEMBER" ? "Vendedor" : "Administrador";
    const role = await tx.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName, description: roleName === "Administrador" ? "Acceso total al sistema" : "Acceso a ventas y clientes", isSystem: true } });
    await tx.companyUser.upsert({
      where: { companyId_userId: { companyId: company.id, userId: user.id } },
      update: { roleId: role.id, isActive: true },
      create: { companyId: company.id, userId: user.id, roleId: role.id, isActive: true },
    });
    return { ...user, companyId: company.id, companyName: company.name, roleId: role.id, roleName: role.name };
  });
}
