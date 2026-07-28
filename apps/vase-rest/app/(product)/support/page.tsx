"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { readCloudStaffToken } from "@/lib/edge/local-edge-client";

type Ticket = {
  externalTicketId: string;
  status: string;
  createdAt: string;
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const pendingRequestId = useRef(crypto.randomUUID());

  const headers = (): Record<string, string> => {
    const token = readCloudStaffToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  };
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/support", {
      headers: headers(),
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setTickets(payload.tickets);
  }, []);
  useEffect(() => { void load().catch((cause) => setError(String(cause))); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/support", {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify({
        requestId: pendingRequestId.current,
        category: form.get("category"),
        priority: form.get("priority"),
        title: form.get("title"),
        description: form.get("description"),
        route: location.pathname,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error);
      return;
    }
    setSuccess(`Ticket ${payload.ticketId} creado en Workplace.`);
    pendingRequestId.current = crypto.randomUUID();
    event.currentTarget.reset();
    await load();
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Workplace</p>
      <h1>Soporte Vase Rest</h1>
      <p>El ticket se registra directamente en el centro operativo de Vase.</p>
      <form className="settings-form" onSubmit={submit}>
        <label>Categoría<select name="category" defaultValue="INCIDENT">
          <option value="INCIDENT">Incidente</option>
          <option value="BILLING">Facturación</option>
          <option value="INTEGRATION">Integración</option>
          <option value="HARDWARE">Hardware</option>
          <option value="PRODUCT_QUESTION">Consulta de producto</option>
        </select></label>
        <label>Prioridad<select name="priority" defaultValue="MEDIUM">
          <option value="LOW">Baja</option><option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option><option value="URGENT">Urgente</option>
        </select></label>
        <label>Asunto<input name="title" minLength={5} maxLength={160} required /></label>
        <label>Descripción<textarea name="description" minLength={20} maxLength={10000} required /></label>
        <button className="button button-primary">Crear ticket</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {success ? <p role="status">{success}</p> : null}
      <section className="ui-card">
        <h2>Tickets recientes</h2>
        {tickets.length === 0 ? <p>No hay tickets registrados.</p> : (
          <ul>{tickets.map((ticket) => (
            <li key={ticket.externalTicketId}>
              <strong>{ticket.externalTicketId}</strong> · {ticket.status} ·{" "}
              {new Date(ticket.createdAt).toLocaleString("es-AR")}
            </li>
          ))}</ul>
        )}
      </section>
    </main>
  );
}
