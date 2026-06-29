"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { CreditCard, Eye, Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  addPaymentPartialItemWithStateAction,
  attachPaymentInvoiceWithStateAction,
  createClientAccountWithStateAction,
  createClientPaymentWithStateAction,
  deleteClientAccountWithStateAction,
  deleteClientPaymentWithStateAction,
  type AdminGovernanceActionState,
  updateClientAccountWithStateAction,
  updateClientPaymentWithStateAction,
} from "@/app/(platform)/app/admin/actions";
import { ActionToast } from "@/components/ui/action-toast";
import { CrudModal } from "@/components/ui/crud-modal";

type TenantLite = { id: string; name: string; accountName: string };
type ClientItem = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "PAUSED" | "FINISHED" | "PENDING_PAYMENT";
  contractType: "BUSINESS" | "LABS" | "BOTH";
  tenant: { accountName: string };
};
type PaymentItem = {
  id: string;
  concept: string;
  category: "DEVELOPMENT" | "HOSTING" | "MAINTENANCE" | "LABS_MONTHLY" | "TOKENS" | "OTHER";
  totalAmount: number;
  paidAmount: number;
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  dueAt: string | null;
  partialItems: Array<{ id: string; amount: number; paidAt: string; method: string | null; note: string | null }>;
  clientAccount: { name: string };
};

const initialState: AdminGovernanceActionState = {};

type Props = {
  tenants: TenantLite[];
  clients: ClientItem[];
  payments: PaymentItem[];
  invoicesByPaymentId: Record<string, { fileUrl: string; uploadedAt: string }[]>;
  marginByClient: Array<{ id: string; name: string; ingresos: number; margen: number }>;
  totals: {
    clientsTotal: number;
    activeClients: number;
    debtCount: number;
    paidTotal: string;
  };
};

function pickToast(state: AdminGovernanceActionState) {
  if (state.success) return { tone: "success" as const, message: state.success };
  if (state.error) return { tone: "error" as const, message: state.error };
  return null;
}

export function AdminClientsPaymentsWorkspace({ tenants, clients, payments, invoicesByPaymentId, marginByClient, totals }: Props) {
  const [query, setQuery] = useState("");
  const [openCreateClient, setOpenCreateClient] = useState(false);
  const [openCreatePayment, setOpenCreatePayment] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentItem | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientItem | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<PaymentItem | null>(null);
  const [partialPaymentTarget, setPartialPaymentTarget] = useState<PaymentItem | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<PaymentItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<PaymentItem | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [createClientState, createClientAction] = useActionState(createClientAccountWithStateAction, initialState);
  const [createPaymentState, createPaymentAction] = useActionState(createClientPaymentWithStateAction, initialState);
  const [updateClientState, updateClientAction] = useActionState(updateClientAccountWithStateAction, initialState);
  const [updatePaymentState, updatePaymentAction] = useActionState(updateClientPaymentWithStateAction, initialState);
  const [deleteClientState, deleteClientAction] = useActionState(deleteClientAccountWithStateAction, initialState);
  const [deletePaymentState, deletePaymentAction] = useActionState(deleteClientPaymentWithStateAction, initialState);
  const [addPartialState, addPartialAction] = useActionState(addPaymentPartialItemWithStateAction, initialState);
  const [attachInvoiceState, attachInvoiceAction] = useActionState(attachPaymentInvoiceWithStateAction, initialState);

  useEffect(() => {
    const picked = [
      pickToast(createClientState),
      pickToast(createPaymentState),
      pickToast(updateClientState),
      pickToast(updatePaymentState),
      pickToast(deleteClientState),
      pickToast(deletePaymentState),
      pickToast(addPartialState),
      pickToast(attachInvoiceState),
    ].find(Boolean);
    if (picked) {
      setToast(picked);
      setOpenCreateClient(false);
      setOpenCreatePayment(false);
      setEditingClient(null);
      setEditingPayment(null);
      setDeletingClient(null);
      setDeletingPayment(null);
      setPartialPaymentTarget(null);
      setInvoiceTarget(null);
    }
  }, [createClientState, createPaymentState, updateClientState, updatePaymentState, deleteClientState, deletePaymentState, addPartialState, attachInvoiceState]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((client) => `${client.name} ${client.companyName ?? ""} ${client.email ?? ""} ${client.tenant.accountName}`.toLowerCase().includes(q));
  }, [clients, query]);

  const filteredPayments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((payment) => `${payment.concept} ${payment.clientAccount.name} ${payment.category}`.toLowerCase().includes(q));
  }, [payments, query]);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm">Total clientes: {totals.clientsTotal}</div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm">Activos: {totals.activeClients}</div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm">Con deuda: {totals.debtCount}</div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm">Cobrado: {totals.paidTotal}</div>
      </section>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Margen por cliente (top)</p>
        <div className="grid gap-2 md:grid-cols-2">
          {marginByClient.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm">
              <p className="font-medium text-[var(--foreground)]">{entry.name}</p>
              <p className="text-[var(--muted)]">Ingresos: {entry.ingresos.toLocaleString("es-AR")}</p>
              <p className="text-[var(--foreground)]">Margen: {entry.margen.toLocaleString("es-AR")}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente o pago..." className="min-h-11 w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setOpenCreateClient(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-sm font-semibold"><Users className="h-4 w-4" />+ Usuario</button>
          <button type="button" onClick={() => setOpenCreatePayment(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)]"><CreditCard className="h-4 w-4" />Registrar pago</button>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Clientes</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-[var(--muted)]"><th className="px-2 py-2">Cliente</th><th className="px-2 py-2">Tenant</th><th className="px-2 py-2">Contrato</th><th className="px-2 py-2">Estado</th><th className="px-2 py-2">Acciones</th></tr></thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-2 py-2">{client.name}</td><td className="px-2 py-2">{client.tenant.accountName}</td><td className="px-2 py-2">{client.contractType}</td><td className="px-2 py-2">{client.status}</td>
                  <td className="px-2 py-2"><div className="flex gap-2"><button type="button" className="rounded-lg border border-[var(--border-subtle)] px-2 py-1" onClick={() => setEditingClient(client)} aria-label="Editar cliente"><Pencil className="h-4 w-4" /></button><button type="button" className="rounded-lg border border-[var(--border-subtle)] px-2 py-1" onClick={() => setDeletingClient(client)} aria-label="Eliminar cliente"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-sm text-[var(--muted)]">
                    No hay clientes para mostrar con los filtros actuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Pagos</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-[var(--muted)]"><th className="px-2 py-2">Concepto</th><th className="px-2 py-2">Cliente</th><th className="px-2 py-2">Categoría</th><th className="px-2 py-2">Estado</th><th className="px-2 py-2">Acciones</th></tr></thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-2 py-2">{payment.concept}</td><td className="px-2 py-2">{payment.clientAccount.name}</td><td className="px-2 py-2">{payment.category}</td><td className="px-2 py-2">{payment.status}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button type="button" className="rounded-lg border border-[var(--border-subtle)] px-2 py-1" onClick={() => setEditingPayment(payment)} aria-label="Editar pago"><Pencil className="h-4 w-4" /></button>
                      <button type="button" className="rounded-lg border border-[var(--border-subtle)] px-2 py-1" onClick={() => setPartialPaymentTarget(payment)} aria-label="Registrar pago parcial"><Plus className="h-4 w-4" /></button>
                      <button type="button" className="rounded-lg border border-[var(--border-subtle)] px-2 py-1" onClick={() => setInvoiceTarget(payment)} aria-label="Vincular factura"><CreditCard className="h-4 w-4" /></button>
                      <button type="button" className="rounded-lg border border-[var(--border-subtle)] px-2 py-1" onClick={() => setHistoryTarget(payment)} aria-label="Ver historial"><Eye className="h-4 w-4" /></button>
                      <button type="button" className="rounded-lg border border-[var(--border-subtle)] px-2 py-1" onClick={() => setDeletingPayment(payment)} aria-label="Eliminar pago"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-sm text-[var(--muted)]">
                    No hay pagos para mostrar con los filtros actuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <CrudModal open={openCreateClient} onClose={() => setOpenCreateClient(false)} title="Crear usuario cliente">
        <form action={createClientAction} className="grid gap-3 md:grid-cols-2">
          <select name="tenantId" required className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"><option value="">Seleccionar tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.accountName} - {tenant.name}</option>)}</select>
          <input name="name" required placeholder="Nombre del cliente" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
          <input name="companyName" placeholder="Empresa" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
          <input name="email" type="email" placeholder="Email" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
          <input name="phone" placeholder="Teléfono" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
          <select name="contractType" defaultValue="BOTH" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"><option value="BUSINESS">Vase Business</option><option value="LABS">Vase Labs</option><option value="BOTH">Ambos</option></select>
          <select name="status" defaultValue="ACTIVE" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"><option value="ACTIVE">Activo</option><option value="PAUSED">Pausado</option><option value="FINISHED">Finalizado</option><option value="PENDING_PAYMENT">Pendiente</option></select>
          <button className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">Crear cliente</button>
        </form>
      </CrudModal>

      <CrudModal open={openCreatePayment} onClose={() => setOpenCreatePayment(false)} title="Registrar pago">
        <form action={createPaymentAction} className="grid gap-3 md:grid-cols-2">
          <select name="tenantId" required className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"><option value="">Seleccionar tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.accountName}</option>)}</select>
          <select name="clientAccountId" required className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"><option value="">Seleccionar cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
          <input name="concept" required placeholder="Concepto" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
          <select name="category" defaultValue="DEVELOPMENT" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"><option value="DEVELOPMENT">Desarrollo</option><option value="HOSTING">Hosting</option><option value="MAINTENANCE">Mantenimiento</option><option value="LABS_MONTHLY">Labs mensual</option><option value="TOKENS">Tokens</option><option value="OTHER">Otro</option></select>
          <input name="totalAmount" type="number" min="1" step="0.01" required placeholder="Monto total" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
          <input name="paidAmount" type="number" min="0" step="0.01" required placeholder="Monto cobrado" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
          <input name="dueAt" type="date" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
          <input name="paidAt" type="date" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
          <input name="method" placeholder="Método de pago" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
          <select name="status" defaultValue="ACTIVE" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"><option value="ACTIVE">Pagado/Activo</option><option value="PAST_DUE">Pendiente</option><option value="CANCELED">Cancelado</option><option value="TRIAL">Trial</option></select>
          <textarea name="notes" rows={2} placeholder="Notas internas" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm md:col-span-2" />
          <button className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">Guardar pago</button>
        </form>
      </CrudModal>

      <CrudModal open={Boolean(editingPayment)} onClose={() => setEditingPayment(null)} title="Editar pago">
        {editingPayment ? (
          <form action={updatePaymentAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="paymentId" value={editingPayment.id} />
            <input name="concept" defaultValue={editingPayment.concept} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
            <select name="category" defaultValue={editingPayment.category} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"><option value="DEVELOPMENT">Desarrollo</option><option value="HOSTING">Hosting</option><option value="MAINTENANCE">Mantenimiento</option><option value="LABS_MONTHLY">Labs mensual</option><option value="TOKENS">Tokens</option><option value="OTHER">Otro</option></select>
            <input name="totalAmount" type="number" step="0.01" defaultValue={editingPayment.totalAmount} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
            <input name="paidAmount" type="number" step="0.01" defaultValue={editingPayment.paidAmount} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
            <select name="status" defaultValue={editingPayment.status} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"><option value="ACTIVE">Activo</option><option value="PAST_DUE">Pendiente</option><option value="CANCELED">Cancelado</option><option value="TRIAL">Trial</option></select>
            <button className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">Guardar cambios</button>
          </form>
        ) : null}
      </CrudModal>

      <CrudModal open={Boolean(partialPaymentTarget)} onClose={() => setPartialPaymentTarget(null)} title="Registrar pago parcial">
        {partialPaymentTarget ? (
          <form action={addPartialAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="paymentId" value={partialPaymentTarget.id} />
            <input name="amount" type="number" min="1" step="0.01" required placeholder="Monto parcial" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
            <input name="paidAt" type="date" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
            <input name="method" placeholder="Método" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
            <textarea name="note" rows={2} placeholder="Nota interna" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm" />
            <button className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">Guardar parcial</button>
          </form>
        ) : null}
      </CrudModal>

      <CrudModal open={Boolean(invoiceTarget)} onClose={() => setInvoiceTarget(null)} title="Vincular factura">
        {invoiceTarget ? (
          <form action={attachInvoiceAction} className="grid gap-3">
            <input type="hidden" name="paymentId" value={invoiceTarget.id} />
            <input name="fileUrl" type="url" required placeholder="https://.../factura.pdf" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
            <button className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)]">Vincular factura</button>
          </form>
        ) : null}
      </CrudModal>

      <CrudModal open={Boolean(historyTarget)} onClose={() => setHistoryTarget(null)} title="Historial del pago">
        {historyTarget ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
              <p className="font-medium text-[var(--foreground)]">{historyTarget.concept}</p>
              <p className="text-[var(--muted)]">Cliente: {historyTarget.clientAccount.name}</p>
              <p className="text-[var(--muted)]">Cobrado: {historyTarget.paidAmount.toLocaleString("es-AR")} / {historyTarget.totalAmount.toLocaleString("es-AR")}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
              <p className="mb-2 font-medium text-[var(--foreground)]">Pagos parciales</p>
              {historyTarget.partialItems.length === 0 ? <p className="text-[var(--muted)]">Sin pagos parciales.</p> : (
                <ul className="space-y-1 text-[var(--muted)]">{historyTarget.partialItems.map((item) => <li key={item.id}>{new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(new Date(item.paidAt))} - {item.amount.toLocaleString("es-AR")} {item.method ? `(${item.method})` : ""}</li>)}</ul>
              )}
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
              <p className="mb-2 font-medium text-[var(--foreground)]">Facturas vinculadas</p>
              {(invoicesByPaymentId[historyTarget.id] ?? []).length === 0 ? <p className="text-[var(--muted)]">Sin facturas.</p> : (
                <ul className="space-y-1">{(invoicesByPaymentId[historyTarget.id] ?? []).map((invoice, idx) => <li key={`${historyTarget.id}-${idx}`}><a href={invoice.fileUrl} target="_blank" rel="noreferrer" className="text-[var(--accent-strong)] underline">Factura {idx + 1}</a></li>)}</ul>
              )}
            </div>
          </div>
        ) : null}
      </CrudModal>

      <CrudModal open={Boolean(editingClient)} onClose={() => setEditingClient(null)} title="Editar cliente">
        {editingClient ? (
          <form action={updateClientAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="clientAccountId" value={editingClient.id} />
            <input name="name" defaultValue={editingClient.name} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
            <input name="companyName" defaultValue={editingClient.companyName ?? ""} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
            <input name="email" defaultValue={editingClient.email ?? ""} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
            <input name="phone" defaultValue={editingClient.phone ?? ""} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
            <select name="contractType" defaultValue={editingClient.contractType} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"><option value="BUSINESS">Business</option><option value="LABS">Labs</option><option value="BOTH">Ambos</option></select>
            <select name="status" defaultValue={editingClient.status} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"><option value="ACTIVE">Activo</option><option value="PAUSED">Pausado</option><option value="FINISHED">Finalizado</option><option value="PENDING_PAYMENT">Pendiente</option></select>
            <button className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">Guardar cambios</button>
          </form>
        ) : null}
      </CrudModal>

      <CrudModal open={Boolean(deletingClient)} onClose={() => setDeletingClient(null)} title="Eliminar cliente">
        {deletingClient ? (
          <form action={deleteClientAction} className="grid gap-4"><input type="hidden" name="clientAccountId" value={deletingClient.id} /><p className="text-sm text-[var(--muted)]">Vas a eliminar a <strong>{deletingClient.name}</strong>.</p><button className="min-h-11 rounded-xl border border-[var(--danger)] px-4 text-sm font-semibold text-[var(--danger)]">Confirmar eliminación</button></form>
        ) : null}
      </CrudModal>

      <CrudModal open={Boolean(deletingPayment)} onClose={() => setDeletingPayment(null)} title="Eliminar pago">
        {deletingPayment ? (
          <form action={deletePaymentAction} className="grid gap-4"><input type="hidden" name="paymentId" value={deletingPayment.id} /><p className="text-sm text-[var(--muted)]">Vas a eliminar el pago <strong>{deletingPayment.concept}</strong>.</p><button className="min-h-11 rounded-xl border border-[var(--danger)] px-4 text-sm font-semibold text-[var(--danger)]">Confirmar eliminación</button></form>
        ) : null}
      </CrudModal>

      <ActionToast toast={toast} />
    </div>
  );
}
