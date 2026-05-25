import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? "superadmin@vase.local";
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? "SuperAdmin#2026!";
  const clientEmail = process.env.CLIENT_TEST_EMAIL ?? "cliente@vase.local";
  const clientPassword = process.env.CLIENT_TEST_PASSWORD ?? "Cliente#2026!";

  const [superAdminHash, clientHash] = await Promise.all([
    hashPassword(superAdminPassword),
    hashPassword(clientPassword),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.tenant.deleteMany({});
    await tx.user.deleteMany({});

    const superAdmin = await tx.user.create({
      data: {
        name: "Vase Super Admin",
        email: superAdminEmail,
        emailVerified: new Date(),
        passwordHash: superAdminHash,
        platformRole: "SUPER_ADMIN",
        locale: "es",
      },
    });

    const tenant = await tx.tenant.create({
      data: {
        name: "Cliente de Prueba",
        slug: "cliente-prueba",
        accountName: "Cliente Prueba",
        industry: "Servicios",
        onboardingProduct: "BOTH",
        status: "ACTIVE",
        locale: "es",
      },
    });

    const clientUser = await tx.user.create({
      data: {
        name: "Cliente Prueba",
        email: clientEmail,
        emailVerified: new Date(),
        passwordHash: clientHash,
        platformRole: "USER",
        locale: "es",
      },
    });

    await tx.membership.create({
      data: {
        userId: clientUser.id,
        tenantId: tenant.id,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    await tx.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        plan: "START",
        billingStatus: "ACTIVE",
        businessProjectLimit: 1,
        labsAssistantLimit: 1,
      },
    });

    console.info(`[reset-accounts] super_admin_id=${superAdmin.id} tenant_id=${tenant.id} client_user_id=${clientUser.id}`);
  });

  console.info(`[reset-accounts] SUPER_ADMIN_EMAIL=${superAdminEmail}`);
  console.info(`[reset-accounts] SUPER_ADMIN_PASSWORD=${superAdminPassword}`);
  console.info(`[reset-accounts] CLIENT_TEST_EMAIL=${clientEmail}`);
  console.info(`[reset-accounts] CLIENT_TEST_PASSWORD=${clientPassword}`);
}

main()
  .catch((error) => {
    console.error("[reset-accounts] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

