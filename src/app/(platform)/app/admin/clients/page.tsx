import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import {
  createClientAccountAction,
  createClientPaymentAction,
  updateClientAccountAction,
  deleteClientAccountAction,
  updateClientPaymentAction,
  deleteClientPaymentAction,
} from "@/app/(platform)/app/admin/actions";

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

export default async function AdminClientsPage() {
  try {
    await requireAdminPermission(adminPermissions.BILLING);
  } catch {
    forbidden();
  }

  const [tenants, clients, payments] = await Promise.all([
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
        allocations: true,
      },
      orderBy: { createdAt: "desc" },
      take: 400,
    }),
  ]);

  return (
    <AppShell title="Clientes y pagos" subtitle="Alta de clientes, control de contratos y registro de cobros." tenantLabel="Admin Master">
      <section className="grid gap-6 xl:grid-cols-2">
        <PanelCard title="Nuevo cliente" description="Crea una cuenta de cliente vinculada a un tenant.">
          <form action={createClientAccountAction} className="grid gap-3 md:grid-cols-2">
            <select name="tenantId" required className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
              <option value="">Seleccionar tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.accountName} · {tenant.name}
                </option>
              ))}
            </select>
            <input name="name" required placeholder="Nombre del cliente" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="companyName" placeholder="Empresa / marca" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="email" type="email" placeholder="Email" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="phone" placeholder="Telefono" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <select name="contractType" defaultValue="BOTH" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
              <option value="BUSINESS">Vase Business</option>
              <option value="LABS">Vase Labs</option>
              <option value="BOTH">Ambos</option>
            </select>
            <select name="status" defaultValue="ACTIVE" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
              <option value="ACTIVE">Activo</option>
              <option value="PAUSED">Pausado</option>
              <option value="FINISHED">Finalizado</option>
              <option value="PENDING_PAYMENT">Pendiente de pago</option>
            </select>
            <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">Crear cliente</button>
          </form>
        </PanelCard>

        <PanelCard title="Registrar pago" description="Carga cobros únicos, mensuales o parciales por cliente.">
          <form action={createClientPaymentAction} className="grid gap-3 md:grid-cols-2">
            <select name="tenantId" required className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
              <option value="">Seleccionar tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.accountName}
                </option>
              ))}
            </select>
            <select name="clientAccountId" required className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
              <option value="">Seleccionar cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} · {client.tenant.accountName}
                </option>
              ))}
            </select>
            <input name="concept" required placeholder="Concepto" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <select name="category" defaultValue="DEVELOPMENT" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
              <option value="DEVELOPMENT">Desarrollo</option>
              <option value="HOSTING">Hosting</option>
              <option value="MAINTENANCE">Mantenimiento</option>
              <option value="LABS_MONTHLY">Labs mensual</option>
              <option value="TOKENS">Tokens</option>
              <option value="OTHER">Otro</option>
            </select>
            <input name="totalAmount" type="number" min="1" step="0.01" required placeholder="Monto total" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="paidAmount" type="number" min="0" step="0.01" required placeholder="Monto cobrado" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="dueAt" type="date" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="paidAt" type="date" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="method" placeholder="Metodo de pago" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <select name="status" defaultValue="ACTIVE" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
              <option value="ACTIVE">Pagado/Activo</option>
              <option value="PAST_DUE">Pendiente</option>
              <option value="CANCELED">Cancelado</option>
              <option value="TRIAL">Trial</option>
            </select>
            <textarea name="notes" rows={2} placeholder="Observaciones" className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm md:col-span-2" />
            <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">Guardar pago</button>
          </form>
        </PanelCard>
      </section>

      <PanelCard title="Clientes registrados" description="Resumen de cartera y estado contractual.">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-sm">Total clientes: {clients.length}</div>
          <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-sm">Activos: {clients.filter((client) => client.status === "ACTIVE").length}</div>
          <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-sm">Con deuda: {payments.filter((p) => toNumber(p.totalAmount) > toNumber(p.paidAmount)).length}</div>
          <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-sm">Cobrado: {formatMoney(payments.reduce((acc, p) => acc + toNumber(p.paidAmount), 0))}</div>
        </div>
        <div className="mt-4 grid gap-3">
          {clients.map((client) => (
            <form key={client.id} action={updateClientAccountAction} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] p-3 md:grid-cols-6">
              <input type="hidden" name="clientAccountId" value={client.id} />
              <input name="name" defaultValue={client.name} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
              <input name="companyName" defaultValue={client.companyName ?? ""} placeholder="Empresa" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
              <input name="email" defaultValue={client.email ?? ""} placeholder="Email" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
              <select name="contractType" defaultValue={client.contractType} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
                <option value="BUSINESS">Business</option>
                <option value="LABS">Labs</option>
                <option value="BOTH">Ambos</option>
              </select>
              <select name="status" defaultValue={client.status} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
                <option value="ACTIVE">Activo</option>
                <option value="PAUSED">Pausado</option>
                <option value="FINISHED">Finalizado</option>
                <option value="PENDING_PAYMENT">Pendiente</option>
              </select>
              <div className="flex gap-2">
                <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-xs font-semibold text-[var(--accent-contrast)]">Guardar</button>
                <button formAction={deleteClientAccountAction} className="min-h-10 rounded-xl border border-[var(--danger)] px-3 text-xs font-semibold text-[var(--danger)]">Eliminar</button>
              </div>
              <input name="phone" defaultValue={client.phone ?? ""} placeholder="Telefono" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm md:col-span-2" />
              <p className="text-xs text-[var(--muted)] md:col-span-4">Tenant: {client.tenant.accountName}</p>
            </form>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Pagos registrados" description="Editar o eliminar registros de cobro.">
        <div className="grid gap-3">
          {payments.map((payment) => (
            <form key={payment.id} action={updateClientPaymentAction} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] p-3 md:grid-cols-7">
              <input type="hidden" name="paymentId" value={payment.id} />
              <input name="concept" defaultValue={payment.concept} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
              <select name="category" defaultValue={payment.category} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
                <option value="DEVELOPMENT">Desarrollo</option>
                <option value="HOSTING">Hosting</option>
                <option value="MAINTENANCE">Mantenimiento</option>
                <option value="LABS_MONTHLY">Labs</option>
                <option value="TOKENS">Tokens</option>
                <option value="OTHER">Otro</option>
              </select>
              <input name="totalAmount" type="number" step="0.01" defaultValue={toNumber(payment.totalAmount)} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
              <input name="paidAmount" type="number" step="0.01" defaultValue={toNumber(payment.paidAmount)} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
              <select name="status" defaultValue={payment.status} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
                <option value="ACTIVE">Activo</option>
                <option value="PAST_DUE">Pendiente</option>
                <option value="CANCELED">Cancelado</option>
                <option value="TRIAL">Trial</option>
              </select>
              <p className="self-center text-xs text-[var(--muted)]">{payment.clientAccount.name}</p>
              <div className="flex gap-2">
                <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-xs font-semibold text-[var(--accent-contrast)]">Guardar</button>
                <button formAction={deleteClientPaymentAction} className="min-h-10 rounded-xl border border-[var(--danger)] px-3 text-xs font-semibold text-[var(--danger)]">Eliminar</button>
              </div>
              <p className="text-xs text-[var(--muted)] md:col-span-7">
                Fondo empresa: {formatMoney(payment.allocations.filter((allocation) => allocation.direction === "COMPANY_FUND").reduce((sum, allocation) => sum + toNumber(allocation.amount), 0))}
                {" · "}
                Socios: {formatMoney(payment.allocations.filter((allocation) => allocation.direction === "PARTNER_DISTRIBUTION").reduce((sum, allocation) => sum + toNumber(allocation.amount), 0))}
              </p>
            </form>
          ))}
        </div>
      </PanelCard>
    </AppShell>
  );
}
