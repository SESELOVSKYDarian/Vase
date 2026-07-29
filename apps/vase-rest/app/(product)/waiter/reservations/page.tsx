"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  readCloudStaffToken,
  readLocalEdgeClient,
} from "@/lib/edge/local-edge-client";

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
type Table = {
  id: string; code: string; name: string; capacity: number; status: string;
};

export default function ReservationsPage() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [error, setError] = useState("");
  const [view, setView] = useState<"UPCOMING" | "HISTORY">("UPCOMING");
  const [now, setNow] = useState(() => Date.now());
  async function refresh() {
    const client = readLocalEdgeClient();
    const [payload, tablePayload] = await Promise.all([
      client.state("RESERVATION"),
      client.state("TABLE"),
    ]) as [{
      aggregates: Array<{ state: Reservation }>;
    }, {
      aggregates: Array<{ state: Table }>;
    }];
    setRows(payload.aggregates.map((item) => item.state)
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt)));
    const cloudToken = readCloudStaffToken();
    if (cloudToken) {
      const response = await fetch("/api/v1/reservations?history=1", {
        headers: { authorization: `Bearer ${cloudToken}` },
        cache: "no-store",
      }).catch(() => null);
      if (response?.ok) {
        const cloud = await response.json() as { reservations: Reservation[] };
        setRows((local) => [...new Map(
          [...cloud.reservations, ...local].map((reservation) =>
            [reservation.id, reservation]),
        ).values()].sort((left, right) => left.startsAt.localeCompare(right.startsAt)));
      }
    }
    setTables(tablePayload.aggregates.map((item) => item.state)
      .filter((table) => table.status !== "DISABLED")
      .sort((left, right) => left.code.localeCompare(right.code)));
  }
  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
    const interval = setInterval(() => void refresh().catch(() => undefined), 15000);
    const clock = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
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
          tableIds: form.getAll("tableIds").map(String),
        },
      });
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "EDGE_RESERVATION_FAILED");
    }
  }

  async function cancel(row: Reservation) {
    const reason = prompt("Motivo de cancelación (opcional)") ?? undefined;
    try {
      await readLocalEdgeClient().command({
        eventId: crypto.randomUUID(),
        aggregateType: "RESERVATION",
        aggregateId: row.id,
        expectedVersion: row.revision,
        eventType: "RESERVATION_CANCELLED",
        idempotencyKey: crypto.randomUUID(),
        payload: { ...(reason ? { reason } : {}) },
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "EDGE_RESERVATION_CANCEL_FAILED");
    }
  }

  async function transition(
    row: Reservation,
    eventType: "RESERVATION_SEATED" | "RESERVATION_COMPLETED" | "RESERVATION_NO_SHOW",
  ) {
    setError("");
    try {
      await readLocalEdgeClient().command({
        eventId: crypto.randomUUID(),
        aggregateType: "RESERVATION",
        aggregateId: row.id,
        expectedVersion: row.revision,
        eventType,
        idempotencyKey: crypto.randomUUID(),
        payload: {},
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "EDGE_RESERVATION_STATUS_FAILED");
    }
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Agenda de sucursal</p>
      <h1>Reservas</h1>
      <div className="toolbar">
        <button className="button" type="button" onClick={() => setView("UPCOMING")}>
          Próximas
        </button>
        <button className="button" type="button" onClick={() => setView("HISTORY")}>
          Historial 90 días
        </button>
      </div>
      <form className="inline-form" onSubmit={create}>
        <label>Nombre<input name="guestName" required /></label>
        <label>Teléfono<input name="guestPhone" /></label>
        <label>Personas<input name="partySize" type="number" min="1" required /></label>
        <label>Fecha y hora<input name="startsAt" type="datetime-local" required /></label>
        <label>Duración (min)
          <input name="duration" type="number" min="30" defaultValue="120" required />
        </label>
        <fieldset>
          <legend>Mesas</legend>
          {tables.map((table) => (
            <label key={table.id}>
              <input type="checkbox" name="tableIds" value={table.id} />
              {table.code} · {table.capacity} personas
            </label>
          ))}
        </fieldset>
        <button className="button button-primary">Confirmar reserva</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <div className="branch-list">
        {rows.filter((row) => view === "UPCOMING"
          ? ["CONFIRMED", "SEATED"].includes(row.status) &&
            new Date(row.endsAt).getTime() >= now
          : !["CONFIRMED", "SEATED"].includes(row.status) ||
            new Date(row.endsAt).getTime() < now).map((row) => (
          <article key={row.id}>
            <code>{row.status}</code>
            <strong>{row.guestName} · {row.partySize}</strong>
            <span>
              {new Date(row.startsAt).toLocaleString("es-AR")} ·{" "}
              {row.tables.map((link) => link.table.code).join(", ")}
            </span>
            <div className="toolbar">
              {row.status === "CONFIRMED" ? (
                <>
                  <button className="button button-primary" onClick={() =>
                    void transition(row, "RESERVATION_SEATED")}>Sentar</button>
                  <button className="button" onClick={() =>
                    void transition(row, "RESERVATION_NO_SHOW")}>No se presentó</button>
                </>
              ) : null}
              {row.status === "SEATED" ? (
                <button className="button button-primary" onClick={() =>
                  void transition(row, "RESERVATION_COMPLETED")}>Finalizar</button>
              ) : null}
              {["CONFIRMED", "SEATED"].includes(row.status) ? (
                <button className="button" onClick={() => void cancel(row)}>Cancelar</button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
