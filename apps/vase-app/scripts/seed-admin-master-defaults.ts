import { prisma } from "@/lib/db/prisma";

async function main() {
  await prisma.financialSettings.upsert({
    where: { tenantId: null },
    update: {},
    create: {
      tenantId: null,
      hostingMonthlyPrice: 25000,
      hostingYearlyPrice: 280000,
      maintenanceMonthlyPrice: 25000,
      tokensDefaultToFund: true,
      maxSupportTickets: 5,
    },
  });

  await prisma.businessPlanSetting.upsert({
    where: { id: "default-business-plan-setting" },
    update: {},
    create: {
      id: "default-business-plan-setting",
      basePlanPrice: 1070000,
      customPlanPrice: 1800000,
      includedHostingYearValue: 280000,
      customInitialPercent: 50,
      customFinalPercent: 50,
      customHostingYearPrice: 280000,
    },
  });

  await prisma.labsPlanSetting.upsert({
    where: { id: "default-labs-plan-setting" },
    update: {},
    create: {
      id: "default-labs-plan-setting",
      starterPrice: 120000,
      growthPrice: 170000,
      proPrice: 220000,
    },
  });

  const tokenDefaults = [
    { key: "BASICO", price: 10000, tokenAmount: 500000, estimatedMessages: "~1000" },
    { key: "MEDIO", price: 20000, tokenAmount: 1200000, estimatedMessages: "~2000-2500" },
    { key: "PRO", price: 40000, tokenAmount: 3000000, estimatedMessages: "~5000-6000" },
  ];

  for (const token of tokenDefaults) {
    await prisma.tokenPlanSetting.upsert({
      where: { tenantId_key: { tenantId: null, key: token.key } },
      update: {
        price: token.price,
        tokenAmount: token.tokenAmount,
        estimatedMessages: token.estimatedMessages,
        isActive: true,
      },
      create: {
        tenantId: null,
        key: token.key,
        price: token.price,
        tokenAmount: token.tokenAmount,
        estimatedMessages: token.estimatedMessages,
        isActive: true,
      },
    });
  }

  await prisma.partnerConfig.upsert({
    where: { id: "default-partner-config" },
    update: {},
    create: {
      id: "default-partner-config",
      alexisPercent: 30,
      darianPercent: 30,
      dantePercent: 30,
      companyPercent: 10,
    },
  });

  await prisma.supportQueuePolicy.upsert({
    where: { id: "default-support-queue-policy" },
    update: {},
    create: {
      id: "default-support-queue-policy",
      tenantId: null,
      maxActiveTicketsPerUser: 5,
      autoBusyEnabled: true,
      tieBreaker: "LOWER_DAILY_TOTAL",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
