"use client";

import { useCallback, useEffect, useState } from "react";
import { readCloudStaffToken } from "@/lib/edge/local-edge-client";

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
      headers: { authorization: `Bearer ${readCloudStaffToken()}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setOrders(payload.orders);
  }, []);

  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
    const interval = setInterval(() => void refresh().catch(() => undefined), 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function mutate(
    deliveryOrderId: string,
    action: "ACCEPT" | "REJECT" | "UPDATE" | "CANCEL",
    extra: Record<string, string> = {},
  ) {
    setError("");
    const response = await fetch("/api/v1/delivery", {
      method: "POST",
      headers: {
        authorization: `Bearer ${readCloudStaffToken()}`,
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

  function reasonAction(order: DeliveryOrder, action: "REJECT" | "CANCEL") {
    const reason = window.prompt(
      action === "REJECT" ? "Motivo del rechazo" : "Motivo de la cancelación",
    );
    if (reason?.trim()) {
      void mutate(order.id, action, { reason: reason.trim() })
        .catch((cause) => setError(String(cause)));
    }
  }

  const nextStatuses: Record<string, string[]> = {
    ACCEPTED: ["PREPARING"],
    PREPARING: ["READY"],
    READY: ["PICKED_UP"],
    PICKED_UP: ["DELIVERED"],
  };

  return (
    <main className="product-content">
      <p className="eyebrow">Operación</p>
      <h1>Delivery</h1>
      <p>Los cambios se envían al proveedor conectado y sólo se guardan después de su respuesta.</p>
      {error ? <p role="alert">{error}</p> : null}
      {!orders.length && !error ? <p>No hay pedidos recibidos para esta sucursal.</p> : null}
      <div className="catalog-grid">
        {orders.map((order) => (
          <article className="ui-card" key={order.id}>
            <p className="eyebrow">{order.connection.provider}</p>
            <h2>{order.customerName ?? order.providerOrderId}</h2>
            <strong>{order.status}</strong>
            <p>{order.deliveryAddress ?? "Retiro o dirección no informada"}</p>
            <p>{order.currency} {order.total}</p>
            {["RECEIVED", "PENDING"].includes(order.status)
              ? <>
                  <button className="button button-primary" onClick={() =>
                    void mutate(order.id, "ACCEPT")
                      .catch((cause) => setError(String(cause)))}>
                    Aceptar
                  </button>
                  <button className="button" onClick={() =>
                    reasonAction(order, "REJECT")}>Rechazar</button>
                </>
              : null}
            {(nextStatuses[order.status] ?? []).map((status) => (
              <button className="button button-primary" key={status} onClick={() =>
                void mutate(order.id, "UPDATE", { status })
                  .catch((cause) => setError(String(cause)))}>
                {status === "PREPARING" ? "Iniciar preparación"
                  : status === "READY" ? "Marcar listo"
                    : status === "PICKED_UP" ? "Retirado por repartidor"
                      : "Marcar entregado"}
              </button>
            ))}
            {!["REJECTED", "CANCELLED", "DELIVERED"].includes(order.status)
              ? <button className="button" onClick={() =>
                  reasonAction(order, "CANCEL")}>Cancelar</button>
              : null}
          </article>
        ))}
      </div>
    </main>
  );
}
