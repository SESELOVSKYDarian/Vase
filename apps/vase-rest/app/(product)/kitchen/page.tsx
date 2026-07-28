"use client";

import { useEffect, useState } from "react";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";
type Ticket = {
  id: string; status: string; revision: number; queuedAt: string;
  station: { name: string };
  order: { orderNumber: number; table: { code: string } | null };
  orderItem: { nameSnapshot: string; quantity: number; notes?: string; modifiers: Array<{ nameSnapshot: string }> };
};

export default function KitchenPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  async function refresh() {
    const payload = await readLocalEdgeClient().state("KITCHEN_TICKET") as {
      aggregates: Array<{ version: number; state: Ticket }>;
    };
    setTickets(payload.aggregates.map((aggregate) => ({
      ...aggregate.state,
      revision: aggregate.version,
    })));
  }
  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
    const interval = setInterval(() => void refresh().catch(() => undefined), 5000);
    return () => clearInterval(interval);
  }, []);
  async function advance(ticket: Ticket) {
    const to = ticket.status === "QUEUED" ? "PREPARING"
      : ticket.status === "PREPARING" ? "READY" : "SERVED";
    try {
      await readLocalEdgeClient().command({
        eventId: crypto.randomUUID(),
        aggregateType: "KITCHEN_TICKET",
        aggregateId: ticket.id,
        expectedVersion: ticket.revision,
        eventType: `KITCHEN_TICKET_${to}`,
        idempotencyKey: crypto.randomUUID(),
        payload: { ...ticket, status: to, revision: ticket.revision + 1 },
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "REST_EDGE_COMMAND_FAILED");
    }
  }
  return (
    <main className="product-content kds-screen">
      <p className="eyebrow">Kitchen display</p><h1>Producción</h1>
      {error ? <p role="alert">{error}</p> : null}
      <div className="kds-grid">
        {tickets.map((ticket) => (
          <button className={`kds-ticket status-${ticket.status.toLowerCase()}`} key={ticket.id}
            onClick={() => void advance(ticket)}>
            <header><strong>#{ticket.order.orderNumber}</strong><span>{ticket.order.table?.code ?? "Mostrador"}</span></header>
            <small>{ticket.station.name} · {new Date(ticket.queuedAt).toLocaleTimeString("es-AR")}</small>
            <h2>{ticket.orderItem.quantity} × {ticket.orderItem.nameSnapshot}</h2>
            {ticket.orderItem.modifiers.map((modifier) => <span key={modifier.nameSnapshot}>+ {modifier.nameSnapshot}</span>)}
            {ticket.orderItem.notes ? <p>{ticket.orderItem.notes}</p> : null}
            <footer>{ticket.status}</footer>
          </button>
        ))}
      </div>
    </main>
  );
}
