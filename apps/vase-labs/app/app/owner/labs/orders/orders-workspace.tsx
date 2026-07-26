"use client";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  channel: string;
  currency: string;
  totalAmount: unknown;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  businessUpdatedAt: Date;
};

function money(value: unknown, currency: string) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(Number(value ?? 0));
}

function date(value: Date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default function OrdersWorkspace({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) {
    return (
      <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] p-8 text-center">
        <div>
          <p className="text-lg font-semibold text-[var(--foreground)]">Todavia no hay pedidos en Labs</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Cuando la IA arme pedidos desde WhatsApp, Instagram o Messenger van a aparecer aca.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--surface-strong)] text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3">Pedido</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Canal</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Actualizado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-[var(--surface-strong)]">
              <td className="px-4 py-3 font-semibold text-[var(--foreground)]">{order.orderNumber}</td>
              <td className="px-4 py-3 text-[var(--muted)]">{order.customerName ?? order.customerEmail ?? order.customerPhone ?? "Cliente"}</td>
              <td className="px-4 py-3">{order.channel}</td>
              <td className="px-4 py-3">{order.status}</td>
              <td className="px-4 py-3 text-right font-semibold">{money(order.totalAmount, order.currency)}</td>
              <td className="px-4 py-3 text-xs text-[var(--muted)]">{date(order.businessUpdatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
