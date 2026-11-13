export type WorkDateFilter = "todas" | "mes" | "tres" | "anio";

const DAY_MS = 24 * 60 * 60 * 1000;
const THREE_MONTHS_DAYS = 92;

export function matchesWorkDate(value: Date, filter: WorkDateFilter, now: Date = new Date()) {
  switch (filter) {
    case "mes":
      return value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth();
    case "tres":
      return now.getTime() - value.getTime() <= THREE_MONTHS_DAYS * DAY_MS;
    case "anio":
      return value.getFullYear() === now.getFullYear();
    default:
      return true;
  }
}

export const WORK_STEP_COUNT = 5;
const STEP_LABELS = ["Pedido recibido", "En revisión", "Presupuesto", "En desarrollo", "Entregado"];
const STEP_INDEX: Record<string, number> = { SUBMITTED: 0, REVIEWING: 1, QUOTED: 2, IN_PROGRESS: 3, DELIVERED: 4 };

export type WorkProgress = {
  segments: Array<"done" | "now" | "todo">;
  stepLabel: string;
  state: string;
  tone: "y" | "b" | "g";
  next: string;
  isClientTurn: boolean;
};

export function describeWorkProgress(input: {
  status: string;
  quoteStatus?: string | null;
  quoteAmount?: string | null;
}): WorkProgress {
  const index = STEP_INDEX[input.status] ?? 0;
  const delivered = input.status === "DELIVERED";
  const isClientTurn = input.quoteStatus === "PENDING_CLIENT";
  const segments = Array.from({ length: WORK_STEP_COUNT }, (_, position) => {
    if (delivered || position < index) return "done" as const;
    return position === index ? ("now" as const) : ("todo" as const);
  });

  const next = isClientTurn
    ? `Revisá el presupuesto${input.quoteAmount ? ` de ${input.quoteAmount}` : ""}`
    : delivered
      ? "Ya está entregado"
      : index === 3
        ? "Lo estamos desarrollando"
        : index === 2
          ? "Estamos preparando el presupuesto"
          : "Estamos revisando tu pedido";

  return {
    segments,
    stepLabel: delivered ? "Entregado" : `Paso ${index + 1} de ${WORK_STEP_COUNT} · ${STEP_LABELS[index]}`,
    state: isClientTurn ? "Te toca a vos" : delivered ? "Terminado" : "Vase está trabajando",
    tone: isClientTurn ? "y" : delivered ? "g" : "b",
    next,
    isClientTurn,
  };
}

export type ClientMeetingKind = "v2" | "booking" | "request";

export type ClientMeetingSource = {
  id: string;
  kind: ClientMeetingKind;
  title: string;
  start: Date;
  end: Date | null;
  url: string | null;
  finished: boolean;
  /** CustomProjectMeeting del que viene, para no mostrar la misma reunión dos veces. */
  customMeetingId: string | null;
};

const MEETING_PRIORITY: Record<ClientMeetingKind, number> = { booking: 0, v2: 1, request: 2 };

export function mergeClientMeetings(sources: readonly ClientMeetingSource[], now: Date) {
  const seen = new Set<string>();
  const merged = [...sources]
    .sort((left, right) => MEETING_PRIORITY[left.kind] - MEETING_PRIORITY[right.kind])
    .filter((meeting) => {
      if (!meeting.customMeetingId) return true;
      if (seen.has(meeting.customMeetingId)) return false;
      seen.add(meeting.customMeetingId);
      return true;
    });
  const isUpcoming = (meeting: ClientMeetingSource) => !meeting.finished && meeting.start.getTime() >= now.getTime();
  return {
    upcoming: merged.filter(isUpcoming).sort((left, right) => left.start.getTime() - right.start.getTime()),
    past: merged.filter((meeting) => !isUpcoming(meeting)).sort((left, right) => right.start.getTime() - left.start.getTime()),
  };
}

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });
const timeText = new Intl.DateTimeFormat("es-AR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const fullDay = new Intl.DateTimeFormat("es-AR", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" });
const dayMonth = new Intl.DateTimeFormat("es-AR", { timeZone: TIME_ZONE, day: "numeric", month: "long" });
const shortDay = new Intl.DateTimeFormat("es-AR", { timeZone: TIME_ZONE, weekday: "long", day: "numeric" });

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMeetingTime(value: Date) {
  return timeText.format(value);
}

/** "Hoy, 15:30", "Mañana, 15:30" o "Jueves 12 de noviembre, 15:30", siempre en hora argentina. */
export function formatMeetingWhen(value: Date, now: Date) {
  const tomorrow = new Date(now.getTime() + DAY_MS);
  const key = dayKey.format(value);
  const time = timeText.format(value);
  if (key === dayKey.format(now)) return `Hoy, ${time}`;
  if (key === dayKey.format(tomorrow)) return `Mañana, ${time}`;
  return `${capitalize(fullDay.format(value).replace(",", ""))}, ${time}`;
}

export function formatMeetingDayMonth(value: Date) {
  return dayMonth.format(value);
}

export function formatSlotDay(value: Date) {
  return capitalize(shortDay.format(value).replace(",", ""));
}

export function formatCalendarTile(value: Date) {
  const parts = new Intl.DateTimeFormat("es-AR", { timeZone: TIME_ZONE, month: "short", day: "numeric" }).formatToParts(value);
  return {
    month: (parts.find((part) => part.type === "month")?.value ?? "").replace(".", "").toUpperCase(),
    day: parts.find((part) => part.type === "day")?.value ?? "",
  };
}

export function meetingMinutes(start: Date, end: Date | null) {
  if (!end) return null;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return minutes > 0 ? minutes : null;
}

export type TicketPresentation = { state: string; tone: "g" | "b" | ""; detail: string };

/** Traduce el estado interno del ticket a lo que entiende el cliente, como en la maqueta. */
export function describeSupportTicket(status: string, updatedLabel: string): TicketPresentation {
  switch (status) {
    case "WAITING_CUSTOMER":
      return { state: "Respondida", tone: "g", detail: `Te respondieron el ${updatedLabel}` };
    case "RESOLVED":
    case "RETURNED_TO_AI":
    case "CLOSED":
      return { state: "Cerrada", tone: "", detail: `Resuelta el ${updatedLabel}` };
    default:
      return { state: "En revisión", tone: "b", detail: `Actualizada el ${updatedLabel}` };
  }
}
