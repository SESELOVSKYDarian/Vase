import { NextResponse } from "next/server";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";

function toCsvCell(value: string) {
  const escaped = value.replaceAll("\"", "\"\"");
  return `"${escaped}"`;
}

function toNumber(value: unknown) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object" && value && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") ?? "financial").trim();

  try {
    await requireAdminPermission(type === "operational" ? adminPermissions.AUDIT : adminPermissions.BILLING);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (type === "operational") {
    const [tickets, tasks, internalUsers] = await Promise.all([
      prisma.supportTicket.findMany({
        include: {
          tenant: { select: { accountName: true } },
          assignedToUser: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
      prisma.devTask.findMany({
        include: {
          tenant: { select: { accountName: true } },
          assignedToUser: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
      prisma.internalUserProfile.findMany({
        include: {
          user: { select: { name: true, email: true, platformRole: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
    ]);

    const header = [
      "kind",
      "id",
      "createdAt",
      "tenant",
      "status",
      "priority",
      "assignedName",
      "assignedEmail",
      "availability",
      "role",
    ];

    const ticketRows = tickets.map((ticket) => [
      "ticket",
      ticket.id,
      ticket.createdAt.toISOString(),
      ticket.tenant.accountName,
      ticket.status,
      ticket.priority,
      ticket.assignedToUser?.name ?? "",
      ticket.assignedToUser?.email ?? "",
      "",
      "",
    ]);
    const taskRows = tasks.map((task) => [
      "task",
      task.id,
      task.createdAt.toISOString(),
      task.tenant?.accountName ?? "",
      task.status,
      task.priority,
      task.assignedToUser?.name ?? "",
      task.assignedToUser?.email ?? "",
      "",
      "",
    ]);
    const internalRows = internalUsers.map((profile) => [
      "internal_user",
      profile.id,
      profile.createdAt.toISOString(),
      "",
      profile.accountState,
      "",
      profile.user.name ?? "",
      profile.user.email,
      profile.availability,
      profile.user.platformRole,
    ]);

    const csv = [header, ...ticketRows, ...taskRows, ...internalRows]
      .map((row) => row.map((cell) => toCsvCell(String(cell))).join(","))
      .join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"operational-report-${new Date().toISOString().slice(0, 10)}.csv\"`,
      },
    });
  }

  const [payments, expenses, clients] = await Promise.all([
    prisma.clientPayment.findMany({
      include: {
        tenant: { select: { accountName: true } },
        clientAccount: { select: { name: true } },
        allocations: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.expense.findMany({
      include: {
        tenant: { select: { accountName: true } },
        clientAccount: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.clientAccount.findMany({
      include: {
        tenant: { select: { accountName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
  ]);

  const header = [
    "kind",
    "id",
    "tenant",
    "client",
    "status",
    "category",
    "concept_or_name",
    "totalAmount",
    "paidAmount",
    "debtAmount",
    "companyFundAmount",
    "partnerDistributionAmount",
    "createdAt",
  ];

  const paymentRows = payments.map((payment) => {
    const companyFund = payment.allocations
      .filter((allocation) => allocation.direction === "COMPANY_FUND")
      .reduce((sum, allocation) => sum + toNumber(allocation.amount), 0);
    const partners = payment.allocations
      .filter((allocation) => allocation.direction === "PARTNER_DISTRIBUTION")
      .reduce((sum, allocation) => sum + toNumber(allocation.amount), 0);
    const totalAmount = toNumber(payment.totalAmount);
    const paidAmount = toNumber(payment.paidAmount);
    return [
      "payment",
      payment.id,
      payment.tenant.accountName,
      payment.clientAccount.name,
      payment.status,
      payment.category,
      payment.concept,
      totalAmount,
      paidAmount,
      Math.max(0, totalAmount - paidAmount),
      companyFund,
      partners,
      payment.createdAt.toISOString(),
    ];
  });

  const expenseRows = expenses.map((expense) => [
    "expense",
    expense.id,
    expense.tenant.accountName,
    expense.clientAccount?.name ?? "",
    expense.status,
    expense.category,
    expense.name,
    toNumber(expense.amount),
    "",
    "",
    "",
    "",
    expense.createdAt.toISOString(),
  ]);

  const clientRows = clients.map((client) => [
    "client",
    client.id,
    client.tenant.accountName,
    client.name,
    client.status,
    client.contractType,
    client.companyName ?? "",
    "",
    "",
    "",
    "",
    "",
    client.createdAt.toISOString(),
  ]);

  const csv = [header, ...paymentRows, ...expenseRows, ...clientRows]
    .map((row) => row.map((cell) => toCsvCell(String(cell))).join(","))
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"financial-report-${new Date().toISOString().slice(0, 10)}.csv\"`,
    },
  });
}
