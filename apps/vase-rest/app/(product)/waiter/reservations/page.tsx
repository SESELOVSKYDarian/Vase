"use client";

import { useEffect, useState, type FormEvent } from "react";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";

type Reservation = {
  id: string;
  guestName: string;
  partySize: number;
  startsAt: string;
  endsAt: string;
  status: string;
  revision: number;
  tables: Array<{ table: { id: string; code: string } }>;
};

export default function ReservationsPage() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [error, setError] = useState("");
  async function refresh() {
    const payload = await readLocalEdgeClient().state("RESERVATION") as {
      aggregates: Array<{ state: Reservation }>;
    };
    setRows(payload.aggregates.map((item) => item.state)
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt)));
  }
  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const startsAt = new Date(String(form.get("startsAt")));
    const duration = Number(form.get("duration"));
    try {
      await readLocalEdgeClient().command({
        eventId: crypto.randomUUID(),
        aggregateType: "RESERVATION",
        aggregateId: crypto.randomUUID(),
        expectedVersion: 0,
        eventType: "RESERVATION_CREATED",
        idempotencyKey: crypto.randomUUID(),
        payload: {
          guestName: form.get("guestName"),
          guestPhone: String(form.get("guestPhone") ?? "") || undefined,
          partySize: Number(form.get("partySize")),
          startsAt: startsAt.toISOString(),
          endsAt: new Date(startsAt.getTime() + duration * 60_000).toISOString(),
          tableIds: String(form.get("tableIds"))
            .split(",").map((id) => id.trim()).filter(Boolean),
        },
      });
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "EDGE_RESERVATION_FAILED");
    }
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Agenda de sucursal</p>
      <h1>Reservas</h1>
      <form className="inline-form" onSubmit={create}>
        <label>Nombre<input name="guestName" required /></label>
        <label>Teléfono<input name="guestPhone" /></label>
        <label>Personas<input name="partySize" type="number" min="1" required /></label>
        <label>Fecha y hora<input name="startsAt" type="datetime-local" required /></label>
        <label>Duración (min)
          <input name="duration" type="number" min="30" defaultValue="120" required />
        </label>
        <label>IDs de mesas
          <input name="tableIds" placeholder="Separados por coma" required />
        </label>
        <button className="button button-primary">Confirmar reserva</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <div className="branch-list">
        {rows.map((row) => (
          <article key={row.id}>
            <code>{row.status}</code>
            <strong>{row.guestName} · {row.partySize}</strong>
            <span>
              {new Date(row.startsAt).toLocaleString("es-AR")} ·{" "}
              {row.tables.map((link) => link.table.code).join(", ")}
            </span>
          </article>
        ))}
      </div>
    </main>
  );
}
