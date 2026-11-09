import { prisma } from "@/lib/db/prisma";

export async function rebuildPaymentAllocations(paymentId: string) {
  const payment = await prisma.clientPayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      tenantId: true,
      category: true,
      paidAmount: true,
    },
  });
  if (!payment) return;

  const [partnerConfig, financialSettings] = await Promise.all([
    prisma.partnerConfig.findFirst({
      where: {
        OR: [{ tenantId: payment.tenantId }, { tenantId: null }],
      },
      orderBy: [{ tenantId: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.financialSettings.findFirst({
      where: {
        OR: [{ tenantId: payment.tenantId }, { tenantId: null }],
      },
      orderBy: [{ tenantId: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  const paidAmount = Number(payment.paidAmount);
  if (paidAmount <= 0) {
    await prisma.paymentAllocation.deleteMany({ where: { paymentId: payment.id } });
    return;
  }

  const alexisPercent = Number(partnerConfig?.alexisPercent ?? 30);
  const darianPercent = Number(partnerConfig?.darianPercent ?? 30);
  const dantePercent = Number(partnerConfig?.dantePercent ?? 30);
  const companyPercent = Number(partnerConfig?.companyPercent ?? 10);
  const tokensToFund = financialSettings?.tokensDefaultToFund ?? true;

  let companyFundAmount = 0;
  let distributableAmount = 0;

  if (payment.category === "HOSTING" || payment.category === "MAINTENANCE") {
    companyFundAmount = paidAmount;
    distributableAmount = 0;
  } else if (payment.category === "TOKENS" && tokensToFund) {
    companyFundAmount = paidAmount;
    distributableAmount = 0;
  } else {
    companyFundAmount = (paidAmount * companyPercent) / 100;
    distributableAmount = Math.max(0, paidAmount - companyFundAmount);
  }

  const allocations: Array<{
    paymentId: string;
    direction: "PARTNER_DISTRIBUTION" | "COMPANY_FUND";
    percentage: number;
    amount: number;
  }> = [];

  if (companyFundAmount > 0) {
    allocations.push({
      paymentId: payment.id,
      direction: "COMPANY_FUND",
      percentage: paidAmount > 0 ? (companyFundAmount / paidAmount) * 100 : 0,
      amount: companyFundAmount,
    });
  }

  if (distributableAmount > 0) {
    allocations.push(
      {
        paymentId: payment.id,
        direction: "PARTNER_DISTRIBUTION",
        percentage: alexisPercent,
        amount: (distributableAmount * alexisPercent) / 100,
      },
      {
        paymentId: payment.id,
        direction: "PARTNER_DISTRIBUTION",
        percentage: darianPercent,
        amount: (distributableAmount * darianPercent) / 100,
      },
      {
        paymentId: payment.id,
        direction: "PARTNER_DISTRIBUTION",
        percentage: dantePercent,
        amount: (distributableAmount * dantePercent) / 100,
      },
    );
  }

  await prisma.paymentAllocation.deleteMany({ where: { paymentId: payment.id } });
  if (allocations.length > 0) {
    await prisma.paymentAllocation.createMany({ data: allocations });
  }
}
