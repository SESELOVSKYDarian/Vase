"use client";

import { useCallback, useEffect, useState } from "react";
import { readCloudStaffToken } from "@/lib/edge/local-edge-client";

function token() {
  return readCloudStaffToken();
}

type DeliveryOrder = {
  id: string;
  providerOrderId: string;
  status: string;
  customerName: string | null;
  deliveryAddress: string | null;
  total: string;
  currency: string;
  connection: { provider: string; status: string };
};

export default function DeliveryPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/v1/delivery", {
      headers: { authorization: `Bearer ${token()}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setOrders(payload.orders);
  }, []);
  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
  }, [refresh]);

  async function mutate(
    deliveryOrderId: string,
    action: "ACCEPT" | "REJECT" | "UPDATE" | "CANCEL",
    extra: Record<string, string> = {},
  ) {
    const response = await fetch("/api/v1/delivery", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action,
        deliveryOrderId,
        commandId: crypto.randomUUID(),
        ...extra,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    await refresh();
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Operación</p>
      <h1>Delivery</h1>
      <p>Pedidos obtenidos y verificados directamente desde cada proveedor certificado.</p>
      {error ? <p role="alert">{error}</p> : null}
      {!orders.length && !error ? (
        <p>No hay pedidos reales recibidos para esta sucursal.</p>
      ) : null}
      <div className="catalog-grid">
        {orders.map((order) => (
          <article className="ui-card" key={order.id}>
            <p className="eyebrow">{order.connection.provider}</p>
            <h2>{order.customerName ?? order.providerOrderId}</h2>
            <strong>{order.status}</strong>
            <p>{order.deliveryAddress ?? "Retiro o dirección no informada"}</p>
            <p>{order.currency} {order.total}</p>
            <button className="button button-primary" onClick={() =>
              void mutate(order.id, "ACCEPT").catch((cause) => setError(String(cause)))}>
              Aceptar
            </button>
            <button className="button" onClick={() =>
              void mutate(order.id, "UPDATE", { status: "READY" })
                .catch((cause) => setError(String(cause)))}>
              Marcar listo
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
