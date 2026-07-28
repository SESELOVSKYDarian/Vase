"use client";

import { useEffect, useState } from "react";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";

type Ticket = {
  id: string;
  status: string;
  revision: number;
  queuedAt: string;
  priority?: number;
  recallReason?: string | null;
  station: { name: string };
  order: { orderNumber: number; table: { code: string } | null };
  orderItem: {
    nameSnapshot: string;
    quantity: number;
    notes?: string;
    modifiers: Array<{ nameSnapshot: string }>;
  };
};

export default function KitchenPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  const [view, setView] = useState<"ACTIVE" | "COMPLETED" | "ALL">("ACTIVE");
  const [station, setStation] = useState("ALL");
  const [now, setNow] = useState(() => Date.now());

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

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function command(
    ticket: Ticket,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    setError("");
    try {
      await readLocalEdgeClient().command({
        eventId: crypto.randomUUID(),
        aggregateType: "KITCHEN_TICKET",
        aggregateId: ticket.id,
        expectedVersion: ticket.revision,
        eventType,
        idempotencyKey: crypto.randomUUID(),
        payload,
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "REST_EDGE_COMMAND_FAILED");
    }
  }

  async function advance(ticket: Ticket) {
    const to = ticket.status === "QUEUED" ? "PREPARING"
      : ticket.status === "PREPARING" ? "READY" : "SERVED";
    await command(ticket, `KITCHEN_TICKET_${to}`, {});
  }

  const stations = [...new Set(tickets.map((ticket) => ticket.station.name))].sort();
  const visible = tickets
    .filter((ticket) => station === "ALL" || ticket.station.name === station)
    .filter((ticket) => view === "ALL" ||
      (view === "ACTIVE"
        ? !["SERVED", "CANCELLED"].includes(ticket.status)
        : ["SERVED", "CANCELLED"].includes(ticket.status)))
    .sort((left, right) =>
      (right.priority ?? 0) - (left.priority ?? 0) ||
      new Date(left.queuedAt).getTime() - new Date(right.queuedAt).getTime());

  return (
    <main className="product-content kds-screen">
      <p className="eyebrow">Kitchen display</p>
      <h1>Producción</h1>
      {error ? <p role="alert">{error}</p> : null}
      <div className="toolbar">
        <label>Estación
          <select value={station} onChange={(event) => setStation(event.target.value)}>
            <option value="ALL">Todas</option>
            {stations.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>Vista
          <select value={view} onChange={(event) =>
            setView(event.target.value as typeof view)}>
            <option value="ACTIVE">En producción</option>
            <option value="COMPLETED">Completadas</option>
            <option value="ALL">Todas</option>
          </select>
        </label>
      </div>
      <div className="kds-grid">
        {visible.map((ticket) => (
          <article className={`kds-ticket status-${ticket.status.toLowerCase()}`} key={ticket.id}>
            <header>
              <strong>#{ticket.order.orderNumber}</strong>
              <span>{ticket.order.table?.code ?? "Mostrador"}</span>
            </header>
            <small>
              {ticket.station.name} · {new Date(ticket.queuedAt).toLocaleTimeString("es-AR")}
              {" · "}{Math.max(0, Math.floor(
                (now - new Date(ticket.queuedAt).getTime()) / 60000,
              ))} min
            </small>
            <h2>{ticket.orderItem.quantity} × {ticket.orderItem.nameSnapshot}</h2>
            {ticket.orderItem.modifiers.map((modifier) =>
              <span key={modifier.nameSnapshot}>+ {modifier.nameSnapshot}</span>)}
            {ticket.orderItem.notes ? <p>{ticket.orderItem.notes}</p> : null}
            {ticket.recallReason ? <p>Reclamo: {ticket.recallReason}</p> : null}
            <label>Prioridad
              <select value={ticket.priority ?? 0} onChange={(event) =>
                void command(ticket, "KITCHEN_TICKET_PRIORITY_SET", {
                  priority: Number(event.target.value),
                })}>
                <option value={0}>Normal</option>
                <option value={1}>Alta</option>
                <option value={2}>Urgente</option>
              </select>
            </label>
            <footer>
              {!["SERVED", "CANCELLED"].includes(ticket.status)
                ? <button type="button" onClick={() => void advance(ticket)}>
                    {ticket.status === "QUEUED" ? "Preparar"
                      : ticket.status === "PREPARING" ? "Marcar listo" : "Entregado"}
                  </button>
                : null}
              {["READY", "SERVED"].includes(ticket.status)
                ? <button type="button" onClick={() => {
                    const reason = window.prompt("Motivo para volver a preparación");
                    if (reason?.trim()) {
                      void command(ticket, "KITCHEN_TICKET_RECALLED", {
                        reason: reason.trim(),
                      });
                    }
                  }}>Reabrir</button>
                : null}
              <span>{ticket.status}</span>
            </footer>
          </article>
        ))}
      </div>
    </main>
  );
}
