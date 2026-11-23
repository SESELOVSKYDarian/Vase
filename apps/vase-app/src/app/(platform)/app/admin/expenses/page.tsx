import { forbidden } from "next/navigation";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { createExpenseAction, updateExpenseAction, deleteExpenseAction } from "@/app/(platform)/app/admin/actions";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
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

const STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "Por pagar", tone: "y" },
  PAID: { label: "Pagado", tone: "g" },
  OVERDUE: { label: "Vencido", tone: "r" },
};
const FREQUENCY: Record<string, string> = { ONE_TIME: "Una vez", MONTHLY: "Por mes", YEARLY: "Por año", CUSTOM: "Otro" };

function FrequencySelect({ value, form }: { value?: string; form?: string }) {
  return (
    <select className="vpa-inp" name="frequency" defaultValue={value ?? "ONE_TIME"} form={form} aria-label="Cada cuánto">
      {Object.entries(FREQUENCY).map(([id, label]) => (
        <option key={id} value={id}>
          {label}
        </option>
      ))}
    </select>
  );
}

function StatusSelect({ value, form }: { value?: string; form?: string }) {
  return (
    <select className="vpa-inp" name="status" defaultValue={value ?? "PENDING"} form={form} aria-label="Estado">
      {Object.entries(STATUS).map(([id, item]) => (
        <option key={id} value={id}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

/** Finanzas › Gastos: lo que paga Vase, con vencimiento y estado. */
export default async function AdminExpensesPage() {
  try {
    await requireAdminPermission(adminPermissions.BILLING);
  } catch {
    forbidden();
  }

  const [tenants, clients, expenses] = await Promise.all([
    prisma.tenant.findMany({ select: { id: true, accountName: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.clientAccount.findMany({
      select: { id: true, name: true, tenant: { select: { accountName: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.expense.findMany({
      include: { tenant: { select: { accountName: true } }, clientAccount: { select: { name: true } } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 500,
    }),
  ]);

  const pending = expenses.filter((expense) => expense.status !== "PAID");
  const date = (value: Date | null) => (value ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(value) : "—");

  return (
    <AppShell title="Gastos" subtitle="Lo que paga Vase y cuándo vence" tenantLabel="Admin">
      <section className="vpa-kpis" aria-label="Resumen">
        <div className="vpa-kpi"><span className="vpa-kt"><small>Por pagar</small><b>{formatMoney(pending.reduce((acc, expense) => acc + toNumber(expense.amount), 0))}</b><em>{pending.length} {pending.length === 1 ? "gasto" : "gastos"}</em></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>Vencidos</small><b>{expenses.filter((expense) => expense.status === "OVERDUE").length}</b></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>Total cargado</small><b>{formatMoney(expenses.reduce((acc, expense) => acc + toNumber(expense.amount), 0))}</b></span></div>
      </section>

      <details className="vpa-card" style={{ padding: 0 }}>
        <summary style={{ padding: "16px 20px", cursor: "pointer", listStyle: "none" }}>
          <span className="vpa-btn acc sm" style={{ pointerEvents: "none" }}>
            <Plus size={14} aria-hidden="true" />
            Nuevo gasto
          </span>
        </summary>
        <form action={createExpenseAction} className="vpa-form" style={{ padding: "0 20px 20px" }}>
          <label className="vpa-fld">
            <span>Qué es</span>
            <input className="vpa-inp" name="name" required placeholder="Ej.: servidor de Easypanel" />
          </label>
          <label className="vpa-fld">
            <span>Categoría</span>
            <input className="vpa-inp" name="category" required placeholder="Ej.: Infraestructura" />
          </label>
          <label className="vpa-fld">
            <span>Monto</span>
            <input className="vpa-inp" name="amount" required type="number" min="1" step="0.01" />
          </label>
          <label className="vpa-fld">
            <span>Vence</span>
            <input className="vpa-inp" name="dueAt" type="date" />
          </label>
          <label className="vpa-fld">
            <span>Cada cuánto</span>
            <FrequencySelect />
          </label>
          <label className="vpa-fld">
            <span>Estado</span>
            <StatusSelect />
          </label>
          <label className="vpa-fld">
            <span>Cuenta</span>
            <select className="vpa-inp" name="tenantId" required defaultValue="">
              <option value="">Elegí una</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.accountName}
                </option>
              ))}
            </select>
          </label>
          <label className="vpa-fld">
            <span>Cliente (opcional)</span>
            <select className="vpa-inp" name="clientAccountId" defaultValue="">
              <option value="">Ninguno</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} · {client.tenant.accountName}
                </option>
              ))}
            </select>
          </label>
          <label className="vpa-fld">
            <span>Quién lo paga</span>
            <input className="vpa-inp" name="responsible" />
          </label>
          <label className="vpa-fld">
            <span>Desde</span>
            <input className="vpa-inp" name="startsAt" type="date" />
          </label>
          <label className="vpa-fld vpa-span2">
            <span>Notas</span>
            <textarea className="vpa-inp" name="notes" rows={2} style={{ height: "auto", padding: "10px 12px" }} />
          </label>
          <div className="vpa-span2">
            <button className="vpa-btn acc">Guardar gasto</button>
          </div>
        </form>
      </details>

      <section className="vpa-card" style={{ padding: "12px 20px" }}>
        {expenses.length === 0 ? (
          <div className="vpa-empty" style={{ margin: "8px 0" }}>Todavía no cargaste gastos.</div>
        ) : (
          <div className="vpa-tw">
            <table className="vpa-tbl">
              <thead>
                <tr>
                  <th>Gasto</th>
                  <th>Vence</th>
                  <th>Monto</th>
                  <th>Cada cuánto</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => {
                  const formId = `expense-${expense.id}`;
                  return (
                    <tr key={expense.id}>
                      <td className="wrap">
                        <form id={formId} action={updateExpenseAction}>
                          <input type="hidden" name="expenseId" value={expense.id} />
                          <input type="hidden" name="name" value={expense.name} />
                          <input type="hidden" name="category" value={expense.category} />
                        </form>
                        <b>{expense.name}</b>
                        <span className="sub">
                          {expense.category} · {expense.clientAccount?.name ?? expense.tenant.accountName}
                        </span>
                      </td>
                      <td className={expense.status === "OVERDUE" ? "low" : "vpa-mut"}>{date(expense.dueAt)}</td>
                      <td>
                        <input form={formId} className="vpa-inp" name="amount" type="number" step="0.01" defaultValue={toNumber(expense.amount)} aria-label="Monto" style={{ width: 130 }} />
                      </td>
                      <td style={{ minWidth: 130 }}>
                        <FrequencySelect value={expense.frequency} form={formId} />
                      </td>
                      <td style={{ minWidth: 130 }}>
                        <StatusSelect value={expense.status} form={formId} />
                      </td>
                      <td className="r">
                        <span style={{ display: "inline-flex", gap: 6 }}>
                          <button form={formId} className="vpa-btn line sm">
                            Guardar
                          </button>
                          <button form={formId} formAction={deleteExpenseAction} className="vpa-btn line sm danger">
                            Borrar
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
