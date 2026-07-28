"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { readCloudStaffToken } from "@/lib/edge/local-edge-client";

function sessionToken() {
  return readCloudStaffToken();
}
type Order = {
  id: string; orderNumber: number; status: string; total: string;
  table: { code: string } | null; _count: { items: number };
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  async function refresh() {
    const response = await fetch("/api/v1/orders", {
      headers: { authorization: `Bearer ${sessionToken()}` }, cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setOrders(payload.orders);
  }
  useEffect(() => { void refresh().catch((cause) => setError(String(cause))); }, []);
  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tableId = String(form.get("tableId") ?? "").trim();
    const response = await fetch("/api/v1/orders", {
      method: "POST",
      headers: { authorization: `Bearer ${sessionToken()}`, "content-type": "application/json" },
      body: JSON.stringify({
        action: "OPEN", tableId: tableId || undefined,
        guestCount: Number(form.get("guestCount")),
        commandId: crypto.randomUUID(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    router.push(`/waiter/orders/${payload.result.orderId}`);
  }
  return (
    <main className="product-content">
      <p className="eyebrow">Comandas activas</p><h1>Pedidos</h1>
      <form className="inline-form" onSubmit={open}>
        <label>ID de mesa (opcional)<input name="tableId" /></label>
        <label>Comensales<input name="guestCount" type="number" min="1" defaultValue="2" required /></label>
        <button className="button button-primary">Abrir pedido</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">
        {orders.map((order) => (
          <a className="ui-card" href={`/waiter/orders/${order.id}`} key={order.id}>
            <code>#{order.orderNumber}</code><strong>{order.table?.code ?? "Mostrador"}</strong>
            <span>{order._count.items} ítems · ARS {order.total}</span><small>{order.status}</small>
          </a>
        ))}
      </div>
    </main>
  );
}
