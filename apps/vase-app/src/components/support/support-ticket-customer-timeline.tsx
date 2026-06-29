"use client";

type NoteItem = {
  id: string;
  body: string;
  visibility: "INTERNAL" | "CUSTOMER";
  createdAt: string | Date;
  authorUser: { name: string };
};

type EventItem = {
  id: string;
  message: string;
  eventType: string;
  createdAt: string | Date;
  actorUser: { name: string } | null;
};

type TimelineEntry = {
  id: string;
  label: string;
  body: string;
  actor: string;
  createdAt: string | Date;
};

function formatDateTime(value: string | Date) {
  const dateValue = typeof value === "string" ? new Date(value) : value;
  return dateValue.toLocaleString("es-AR");
}

function labelEventType(value: string) {
  return (
    {
      AGENT_REPLIED: "Respuesta",
      STATUS_CHANGED: "Cambio de estado",
      RESOLVED: "Resuelto",
      CLOSED: "Cerrado",
    }[value] ?? value
  );
}

function buildCustomerTimeline(notes: NoteItem[], events: EventItem[]): TimelineEntry[] {
  const visibleEvents = new Set(["AGENT_REPLIED", "STATUS_CHANGED", "RESOLVED", "CLOSED"]);
  const noteEntries: TimelineEntry[] = notes
    .filter((note) => note.visibility === "CUSTOMER")
    .map((note) => ({
      id: `note-${note.id}`,
      label: "Nota visible",
      body: note.body,
      actor: note.authorUser.name,
      createdAt: note.createdAt,
    }));
  const eventEntries: TimelineEntry[] = events
    .filter((event) => visibleEvents.has(event.eventType))
    .map((event) => ({
      id: `event-${event.id}`,
      label: labelEventType(event.eventType),
      body: event.message,
      actor: event.actorUser?.name ?? "Sistema",
      createdAt: event.createdAt,
    }));

  return [...noteEntries, ...eventEntries].sort((a, b) => {
    const dateA = typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() : a.createdAt.getTime();
    const dateB = typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() : b.createdAt.getTime();
    return dateB - dateA;
  });
}

export function SupportTicketCustomerTimeline({
  notes,
  events,
  emptyMessage = "Aun no hay actualizaciones visibles para cliente.",
}: {
  notes: NoteItem[];
  events: EventItem[];
  emptyMessage?: string;
}) {
  const timeline = buildCustomerTimeline(notes, events);

  if (!timeline.length) {
    return <p className="text-xs text-[var(--muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-2">
      {timeline.map((item) => (
        <article key={item.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2">
          <p className="text-xs text-[var(--muted)]">
            {item.label} · {item.actor} · {formatDateTime(item.createdAt)}
          </p>
          <p className="text-sm text-[var(--foreground)]">{item.body}</p>
        </article>
      ))}
    </div>
  );
}
