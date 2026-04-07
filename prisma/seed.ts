import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { demoFixtures } from "./fixtures/demo";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await hashPassword(demoFixtures.admin.password);
  const supportPasswordHash = await hashPassword(demoFixtures.support.password);
  const ownerPasswordHash = await hashPassword(demoFixtures.owner.password);

  const admin = await prisma.user.upsert({
    where: { email: demoFixtures.admin.email },
    update: {
      name: demoFixtures.admin.name,
      platformRole: "SUPER_ADMIN",
      passwordHash: adminPasswordHash,
      emailVerified: new Date(),
    },
    create: {
      name: demoFixtures.admin.name,
      email: demoFixtures.admin.email,
      platformRole: "SUPER_ADMIN",
      passwordHash: adminPasswordHash,
      emailVerified: new Date(),
    },
  });

  const support = await prisma.user.upsert({
    where: { email: demoFixtures.support.email },
    update: {
      name: demoFixtures.support.name,
      platformRole: "SUPPORT",
      passwordHash: supportPasswordHash,
      emailVerified: new Date(),
    },
    create: {
      name: demoFixtures.support.name,
      email: demoFixtures.support.email,
      platformRole: "SUPPORT",
      passwordHash: supportPasswordHash,
      emailVerified: new Date(),
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: demoFixtures.owner.email },
    update: {
      name: demoFixtures.owner.name,
      platformRole: "USER",
      passwordHash: ownerPasswordHash,
      emailVerified: new Date(),
    },
    create: {
      name: demoFixtures.owner.name,
      email: demoFixtures.owner.email,
      platformRole: "USER",
      passwordHash: ownerPasswordHash,
      emailVerified: new Date(),
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: demoFixtures.tenant.slug },
    update: {
      name: demoFixtures.tenant.name,
      accountName: demoFixtures.tenant.accountName,
      industry: demoFixtures.tenant.industry,
      onboardingProduct: demoFixtures.tenant.onboardingProduct,
      status: "ACTIVE",
    },
    create: {
      name: demoFixtures.tenant.name,
      slug: demoFixtures.tenant.slug,
      accountName: demoFixtures.tenant.accountName,
      industry: demoFixtures.tenant.industry,
      onboardingProduct: demoFixtures.tenant.onboardingProduct,
      status: "ACTIVE",
      locale: "es",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: owner.id,
        tenantId: tenant.id,
      },
    },
    update: {
      role: "OWNER",
      status: "ACTIVE",
    },
    create: {
      userId: owner.id,
      tenantId: tenant.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    update: {
      plan: "PREMIUM",
      billingStatus: "ACTIVE",
      premiumEnabled: true,
      customDomainEnabled: true,
      temporaryPagesEnabled: true,
    },
    create: {
      tenantId: tenant.id,
      plan: "PREMIUM",
      billingStatus: "ACTIVE",
      premiumEnabled: true,
      customDomainEnabled: true,
      temporaryPagesEnabled: true,
    },
  });

  await prisma.tenantAiWorkspace.upsert({
    where: { tenantId: tenant.id },
    update: {
      plan: "PREMIUM",
      assistantDisplayName: "Acme Assistant",
      tone: "PREMIUM",
      setupCompletedAt: new Date(),
    },
    create: {
      tenantId: tenant.id,
      plan: "PREMIUM",
      assistantDisplayName: "Acme Assistant",
      tone: "PREMIUM",
      setupCompletedAt: new Date(),
    },
  });

  console.info(
    JSON.stringify({
      event: "seed.completed",
      adminEmail: admin.email,
      supportEmail: support.email,
      ownerEmail: owner.email,
      tenantSlug: tenant.slug,
    }),
  );
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ event: "seed.failed", error: String(error) }));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
