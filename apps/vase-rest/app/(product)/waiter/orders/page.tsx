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
type Table = {
  id: string; code: string; name: string; capacity: number; status: string;
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [error, setError] = useState("");
  async function refresh() {
    const client = readLocalEdgeClient();
    const [payload, tablePayload] = await Promise.all([
      client.state("ORDER"),
      client.state("TABLE"),
    ]) as [{
      aggregates: Array<{ version: number; state: Order }>;
    }, {
      aggregates: Array<{ state: Table }>;
    }];
    setOrders(payload.aggregates.map((item) => ({
      ...item.state,
      aggregateVersion: item.version,
    })).filter((item) =>
      ["OPEN", "SUBMITTED", "PARTIALLY_READY", "READY"].includes(item.status)));
    setTables(tablePayload.aggregates.map((item) => item.state)
      .filter((table) => ["AVAILABLE", "RESERVED"].includes(table.status))
      .sort((left, right) => left.code.localeCompare(right.code)));
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
        <label>Mesa (opcional)
          <select name="tableId" defaultValue="">
            <option value="">Mostrador / retiro</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.code} Â· {table.capacity} personas Â· {table.status}
              </option>
            ))}
          </select>
        </label>
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
