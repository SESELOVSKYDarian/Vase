"use client";

import { useEffect, useState } from "react";

function token() {
  try { return JSON.parse(sessionStorage.getItem("vase-rest-staff-session") ?? "{}").sessionToken ?? ""; }
  catch { return ""; }
}
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
    const response = await fetch("/api/v1/kds", {
      headers: { authorization: `Bearer ${token()}` }, cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setTickets(payload.tickets);
  }
  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
    const interval = setInterval(() => void refresh().catch(() => undefined), 5000);
    return () => clearInterval(interval);
  }, []);
  async function advance(ticket: Ticket) {
    const to = ticket.status === "QUEUED" ? "PREPARING"
      : ticket.status === "PREPARING" ? "READY" : "SERVED";
    const response = await fetch("/api/v1/kds", {
      method: "POST",
      headers: { authorization: `Bearer ${token()}`, "content-type": "application/json" },
      body: JSON.stringify({
        ticketId: ticket.id, expectedRevision: ticket.revision,
        to, commandId: crypto.randomUUID(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    await refresh();
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
