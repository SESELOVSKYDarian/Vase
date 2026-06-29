"use client";

type NoteItem = {
  id: string;
  body: string;
  visibility: "INTERNAL" | "CUSTOMER";
  createdAt: string | Date;
  authorUser: { name: string; platformRole?: string };
};

type EventItem = {
  id: string;
  message: string;
  eventType: string;
  createdAt: string | Date;
  actorUser: { name: string; platformRole?: string } | null;
};

function formatDateTime(value: string | Date) {
  const dateValue = typeof value === "string" ? new Date(value) : value;
  return dateValue.toLocaleString("es-AR");
}

function labelEventType(value: string) {
  return (
    {
      CREATED: "Creado",
      ESCALATED_FROM_AI: "Escalado IA",
      ASSIGNED: "Asignado",
      STATUS_CHANGED: "Cambio de estado",
      PRIORITY_CHANGED: "Cambio de prioridad",
      NOTE_ADDED: "Nota",
      AGENT_REPLIED: "Respuesta de agente",
      CUSTOMER_UPDATED: "Mensaje de cliente",
      RETURNED_TO_AI: "Devuelto a IA",
      RESOLVED: "Resuelto",
      CLOSED: "Cerrado",
    }[value] ?? value
  );
}

export function SupportTicketInternalHistory({
  notes,
  events,
}: {
  notes: NoteItem[];
  events: EventItem[];
}) {
  const internalNotes = notes.filter((note) => note.visibility === "INTERNAL");
  const customerNotes = notes.filter((note) => note.visibility === "CUSTOMER");

  return (
    <div className="grid gap-2 md:grid-cols-3">
      <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
        <p className="text-xs font-semibold text-[var(--foreground)]">Notas internas</p>
        {internalNotes.length ? (
          internalNotes.map((note) => (
            <article key={note.id} className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">
                {note.authorUser.name}
                {note.authorUser.platformRole ? ` (${note.authorUser.platformRole})` : ""} · {formatDateTime(note.createdAt)}
              </p>
              <p className="text-sm text-[var(--foreground)]">{note.body}</p>
            </article>
          ))
        ) : (
          <p className="text-xs text-[var(--muted)]">Sin notas internas.</p>
        )}
      </div>

      <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
        <p className="text-xs font-semibold text-[var(--foreground)]">Notas visibles cliente</p>
        {customerNotes.length ? (
          customerNotes.map((note) => (
            <article key={note.id} className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">
                {note.authorUser.name}
                {note.authorUser.platformRole ? ` (${note.authorUser.platformRole})` : ""} · {formatDateTime(note.createdAt)}
              </p>
              <p className="text-sm text-[var(--foreground)]">{note.body}</p>
            </article>
          ))
        ) : (
          <p className="text-xs text-[var(--muted)]">Sin notas para cliente.</p>
        )}
      </div>

      <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
        <p className="text-xs font-semibold text-[var(--foreground)]">Eventos</p>
        {events.length ? (
          events.map((event) => (
            <article key={event.id} className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">
                {labelEventType(event.eventType)} · {event.actorUser?.name ?? "Sistema"} · {formatDateTime(event.createdAt)}
              </p>
              <p className="text-sm text-[var(--foreground)]">{event.message}</p>
            </article>
          ))
        ) : (
          <p className="text-xs text-[var(--muted)]">Sin eventos registrados.</p>
        )}
      </div>
    </div>
  );
}
