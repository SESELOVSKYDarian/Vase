import { prisma } from "@/lib/db/prisma";

function toNumber(value: unknown) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object" && value && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

export async function getAdminFinanceDashboard(tenantId?: string) {
  const [payments, expenses, partnerConfig, investments] = await Promise.all([
    prisma.clientPayment.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        partialItems: true,
        allocations: true,
      },
      take: 5000,
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.findMany({
      where: tenantId ? { tenantId } : undefined,
      take: 5000,
      orderBy: { createdAt: "desc" },
    }),
    prisma.partnerConfig.findFirst({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.partnerInvestment.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: { items: true },
    }),
  ]);

  const collected = payments.reduce((total, payment) => total + toNumber(payment.paidAmount), 0);
  const totalExpenses = expenses.reduce((total, expense) => total + toNumber(expense.amount), 0);

  const fundFromAllocations = payments.reduce(
    (sum, payment) =>
      sum +
      payment.allocations
        .filter((allocation) => allocation.direction === "COMPANY_FUND")
        .reduce((allocationSum, allocation) => allocationSum + toNumber(allocation.amount), 0),
    0,
  );
  const partnerDistributed = payments.reduce(
    (sum, payment) =>
      sum +
      payment.allocations
        .filter((allocation) => allocation.direction === "PARTNER_DISTRIBUTION")
        .reduce((allocationSum, allocation) => allocationSum + toNumber(allocation.amount), 0),
    0,
  );

  const hostingCollected = payments
    .filter((payment) => payment.category === "HOSTING")
    .reduce((total, payment) => total + toNumber(payment.paidAmount), 0);
  const maintenanceCollected = payments
    .filter((payment) => payment.category === "MAINTENANCE")
    .reduce((total, payment) => total + toNumber(payment.paidAmount), 0);
  const tokensCollected = payments
    .filter((payment) => payment.category === "TOKENS")
    .reduce((total, payment) => total + toNumber(payment.paidAmount), 0);

  const fundFromCompanyPercent = Math.max(0, fundFromAllocations - hostingCollected - maintenanceCollected - tokensCollected);
  const grossCompanyFund = fundFromAllocations;
  const realCompanyFund = grossCompanyFund - totalExpenses;

  const investmentTotal = investments.reduce((sum, investment) => {
    const fromItems = investment.items.reduce((itemSum, item) => itemSum + toNumber(item.amount), 0);
    return sum + (fromItems > 0 ? fromItems : toNumber(investment.globalAmount));
  }, 0);
  const investmentRecovered = Math.max(0, realCompanyFund);
  const investmentRecoveryPct = investmentTotal > 0 ? Math.min(100, (investmentRecovered / investmentTotal) * 100) : 0;

  return {
    kpis: {
      collected,
      totalExpenses,
      realBalance: collected - totalExpenses,
      grossCompanyFund,
      realCompanyFund,
      partnerDistributable: partnerDistributed,
      investmentTotal,
      investmentRecovered,
      investmentRecoveryPct,
    },
    compositions: {
      fundFromCompanyPercent,
      hostingCollected,
      maintenanceCollected,
      tokensCollected,
      otherFundIncome: 0,
    },
    payments,
    expenses,
    partnerConfig: partnerConfig ?? null,
    investments,
  };
}
