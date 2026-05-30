import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminClientsPaymentsWorkspace } from "@/components/admin/admin-clients-payments-workspace";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
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

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AdminClientsPage() {
  try {
    await requireAdminPermission(adminPermissions.BILLING);
  } catch {
    forbidden();
  }

  type InvoiceRow = { paymentId: string; fileUrl: string; uploadedAt: Date };
  const [tenants, clients, payments, invoices] = await Promise.all([
    prisma.tenant.findMany({
      select: { id: true, name: true, accountName: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.clientAccount.findMany({
      include: { tenant: { select: { accountName: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.clientPayment.findMany({
      include: {
        clientAccount: { select: { name: true } },
        partialItems: { orderBy: { paidAt: "desc" }, take: 5 },
      },
      orderBy: { createdAt: "desc" },
      take: 400,
    }),
    (prisma as unknown as { invoiceV2: { findMany: (args: { orderBy: { uploadedAt: "desc" }; take: number }) => Promise<InvoiceRow[]> } }).invoiceV2.findMany({
      orderBy: { uploadedAt: "desc" },
      take: 1000,
    }),
  ]);

  const clientsNormalized = clients.map((client: (typeof clients)[number]) => ({
    id: client.id,
    name: client.name,
    companyName: client.companyName,
    email: client.email,
    phone: client.phone,
    status: client.status,
    contractType: client.contractType,
    tenant: { accountName: client.tenant.accountName },
  }));

  const paymentsNormalized = payments.map((payment: (typeof payments)[number]) => ({
    id: payment.id,
    concept: payment.concept,
    category: payment.category,
    totalAmount: toNumber(payment.totalAmount),
    paidAmount: toNumber(payment.paidAmount),
    status: payment.status,
    dueAt: payment.dueAt?.toISOString() ?? null,
    partialItems: payment.partialItems.map((item: (typeof payment.partialItems)[number]) => ({
      id: item.id,
      amount: toNumber(item.amount),
      paidAt: item.paidAt.toISOString(),
      method: item.method,
      note: item.note,
    })),
    clientAccount: { name: payment.clientAccount.name },
  }));

  const invoicesByPaymentId = invoices.reduce<Record<string, { fileUrl: string; uploadedAt: string }[]>>((acc: Record<string, { fileUrl: string; uploadedAt: string }[]>, invoice: InvoiceRow) => {
    if (!acc[invoice.paymentId]) acc[invoice.paymentId] = [];
    acc[invoice.paymentId].push({
      fileUrl: invoice.fileUrl,
      uploadedAt: invoice.uploadedAt.toISOString(),
    });
    return acc;
  }, {});

  const marginByClient = clients
    .map((client: (typeof clients)[number]) => {
      const clientPayments = payments.filter((payment: (typeof payments)[number]) => payment.clientAccountId === client.id);
      const ingresos = clientPayments.reduce((acc: number, payment: (typeof payments)[number]) => acc + toNumber(payment.paidAmount), 0);
      const egresos = 0;
      return {
        id: client.id,
        name: client.name,
        ingresos,
        margen: ingresos - egresos,
      };
    })
    .sort((a: { margen: number }, b: { margen: number }) => b.margen - a.margen)
    .slice(0, 5);

  return (
    <AppShell
      title="Usuarios / Clientes"
      subtitle="Gestión centralizada de clientes, pagos, estado contractual e historial de cobros."
      tenantLabel="Admin Master"
    >
      <AdminClientsPaymentsWorkspace
        tenants={tenants}
        clients={clientsNormalized}
        payments={paymentsNormalized}
        invoicesByPaymentId={invoicesByPaymentId}
        marginByClient={marginByClient}
        totals={{
          clientsTotal: clients.length,
          activeClients: clients.filter((client: (typeof clients)[number]) => client.status === "ACTIVE").length,
          debtCount: payments.filter((payment: (typeof payments)[number]) => toNumber(payment.totalAmount) > toNumber(payment.paidAmount)).length,
          paidTotal: formatMoney(payments.reduce((acc: number, payment: (typeof payments)[number]) => acc + toNumber(payment.paidAmount), 0)),
        }}
      />
    </AppShell>
  );
}
