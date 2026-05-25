import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { createExpenseAction, updateExpenseAction, deleteExpenseAction } from "@/app/(platform)/app/admin/actions";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
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

function getExpenseTone(status: "PAID" | "PENDING" | "OVERDUE") {
  if (status === "PAID") return "text-[var(--success)]";
  if (status === "OVERDUE") return "text-[var(--danger)]";
  return "text-[var(--warning)]";
}

export default async function AdminExpensesPage() {
  try {
    await requireAdminPermission(adminPermissions.BILLING);
  } catch {
    forbidden();
  }

  const [tenants, clients, expenses] = await Promise.all([
    prisma.tenant.findMany({
      select: { id: true, accountName: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.clientAccount.findMany({
      select: { id: true, name: true, tenant: { select: { accountName: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.expense.findMany({
      include: {
        tenant: { select: { accountName: true } },
        clientAccount: { select: { name: true } },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 500,
    }),
  ]);

  return (
    <AppShell title="Gastos y vencimientos" subtitle="Registro de egresos, control de estados y seguimiento de vencimientos." tenantLabel="Admin Master">
      <PanelCard title="Nuevo gasto" description="Carga gasto operativo con frecuencia y vencimiento.">
        <form action={createExpenseAction} className="grid gap-3 md:grid-cols-3">
          <select name="tenantId" required className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="">Seleccionar tenant</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.accountName}
              </option>
            ))}
          </select>
          <select name="clientAccountId" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="">Sin cliente asociado</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} · {client.tenant.accountName}
              </option>
            ))}
          </select>
          <input name="name" required placeholder="Nombre del gasto" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          <input name="category" required placeholder="Categoria" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          <input name="amount" required type="number" min="1" step="0.01" placeholder="Monto" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          <input name="responsible" placeholder="Responsable" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          <input name="startsAt" type="date" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          <input name="dueAt" type="date" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          <select name="frequency" defaultValue="ONE_TIME" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="ONE_TIME">Unico</option>
            <option value="MONTHLY">Mensual</option>
            <option value="YEARLY">Anual</option>
            <option value="CUSTOM">Personalizado</option>
          </select>
          <select name="status" defaultValue="PENDING" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="PENDING">Pendiente</option>
            <option value="PAID">Pagado</option>
            <option value="OVERDUE">Vencido</option>
          </select>
          <textarea name="notes" rows={2} placeholder="Observaciones" className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm md:col-span-3" />
          <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-3">Guardar gasto</button>
        </form>
      </PanelCard>

      <PanelCard title="Resumen de gastos" description="Control global de pagos operativos.">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-sm">Total gastos: {expenses.length}</div>
          <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-sm">Pendientes: {expenses.filter((expense) => expense.status === "PENDING").length}</div>
          <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-sm">Vencidos: {expenses.filter((expense) => expense.status === "OVERDUE").length}</div>
          <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-sm">Monto total: {formatMoney(expenses.reduce((acc, expense) => acc + toNumber(expense.amount), 0))}</div>
        </div>
        <div className="grid gap-3">
          {expenses.map((expense) => (
            <form key={expense.id} action={updateExpenseAction} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] p-4 md:grid-cols-6">
              <input type="hidden" name="expenseId" value={expense.id} />
              <input name="name" defaultValue={expense.name} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
              <input name="category" defaultValue={expense.category} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
              <input name="amount" type="number" step="0.01" defaultValue={toNumber(expense.amount)} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
              <select name="frequency" defaultValue={expense.frequency} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
                <option value="ONE_TIME">Unico</option>
                <option value="MONTHLY">Mensual</option>
                <option value="YEARLY">Anual</option>
                <option value="CUSTOM">Personalizado</option>
              </select>
              <select name="status" defaultValue={expense.status} className={`min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm ${getExpenseTone(expense.status)}`}>
                <option value="PENDING">Pendiente</option>
                <option value="PAID">Pagado</option>
                <option value="OVERDUE">Vencido</option>
              </select>
              <div className="flex gap-2">
                <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-xs font-semibold text-[var(--accent-contrast)]">Guardar</button>
                <button formAction={deleteExpenseAction} className="min-h-10 rounded-xl border border-[var(--danger)] px-3 text-xs font-semibold text-[var(--danger)]">Eliminar</button>
              </div>
              <p className="text-sm text-[var(--muted)] md:col-span-6">
                {expense.tenant.accountName} · {expense.clientAccount?.name ?? "Sin cliente"} · {formatMoney(toNumber(expense.amount))}
              </p>
            </form>
          ))}
        </div>
      </PanelCard>
    </AppShell>
  );
}
