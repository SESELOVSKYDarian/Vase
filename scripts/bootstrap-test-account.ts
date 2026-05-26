import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.TEST_ACCOUNT_EMAIL ?? "prueba.piquim@vase.local";
  const password = process.env.TEST_ACCOUNT_PASSWORD;
  const tenantSlug = process.env.TEST_TENANT_SLUG ?? "piquim-prueba";
  const tenantName = process.env.TEST_TENANT_NAME ?? "PIQUIM Prueba";

  if (!password) {
    throw new Error("TEST_ACCOUNT_PASSWORD no esta configurada.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Prueba PIQUIM",
      platformRole: "USER",
      passwordHash,
      emailVerified: new Date(),
    },
    create: {
      name: "Prueba PIQUIM",
      email,
      platformRole: "USER",
      passwordHash,
      emailVerified: new Date(),
      locale: "es",
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {
      name: tenantName,
      accountName: tenantName,
      billingEmail: email,
      industry: "Pruebas",
      onboardingProduct: "BOTH",
      status: "ACTIVE",
    },
    create: {
      name: tenantName,
      slug: tenantSlug,
      accountName: tenantName,
      billingEmail: email,
      industry: "Pruebas",
      onboardingProduct: "BOTH",
      status: "ACTIVE",
      locale: "es",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    update: {
      role: "OWNER",
      status: "ACTIVE",
    },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    update: {
      plan: "START",
      billingStatus: "ACTIVE",
    },
    create: {
      tenantId: tenant.id,
      plan: "START",
      billingStatus: "ACTIVE",
    },
  });

  console.info(
    JSON.stringify({
      event: "bootstrap-test-account.completed",
      userId: user.id,
      email: user.email,
      platformRole: user.platformRole,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantRole: "OWNER",
      emailVerified: Boolean(user.emailVerified),
    }),
  );
}

main()
  .catch((error) => {
    console.error("[bootstrap-test-account] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
