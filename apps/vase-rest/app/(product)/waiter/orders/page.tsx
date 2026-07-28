"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";

type Order = {
  id: string;
  orderNumber: number | null;
  status: string;
  total: string;
  tableId: string | null;
  items: Array<unknown>;
  aggregateVersion: number;
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  async function refresh() {
    const payload = await readLocalEdgeClient().state("ORDER") as {
      aggregates: Array<{ version: number; state: Order }>;
    };
    setOrders(payload.aggregates.map((item) => ({
      ...item.state,
      aggregateVersion: item.version,
    })).filter((item) =>
      ["OPEN", "SUBMITTED", "PARTIALLY_READY", "READY"].includes(item.status)));
  }
  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
  }, []);

  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const tableId = String(form.get("tableId") ?? "").trim();
    const orderId = crypto.randomUUID();
    try {
      await readLocalEdgeClient().command({
        eventId: crypto.randomUUID(),
        aggregateType: "ORDER",
        aggregateId: orderId,
        expectedVersion: 0,
        eventType: "ORDER_OPENED",
        idempotencyKey: crypto.randomUUID(),
        payload: {
          tableId: tableId || undefined,
          guestCount: Number(form.get("guestCount")),
        },
      });
      router.push(`/waiter/orders/${orderId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "EDGE_ORDER_OPEN_FAILED");
    }
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Comandas activas</p>
      <h1>Pedidos</h1>
      <form className="inline-form" onSubmit={open}>
        <label>ID de mesa (opcional)<input name="tableId" /></label>
        <label>Comensales
          <input name="guestCount" type="number" min="1" defaultValue="2" required />
        </label>
        <button className="button button-primary">Abrir pedido</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">
        {orders.map((order) => (
          <a className="ui-card" href={`/waiter/orders/${order.id}`} key={order.id}>
            <code>{order.orderNumber ? `#${order.orderNumber}` : "OFFLINE"}</code>
            <strong>{order.tableId ? "Mesa vinculada" : "Mostrador"}</strong>
            <span>{order.items.length} ítems · ARS {order.total}</span>
            <small>{order.status}</small>
          </a>
        ))}
      </div>
    </main>
  );
}
