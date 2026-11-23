// Workspace: tickets de soporte y trabajos de desarrollo en un mismo tablero de 4 columnas.
// Cada uno conserva su propio estado; acá se traduce a la columna y de la columna al estado.

export type WorkspaceKind = "ticket" | "task";
export type WorkspaceColumn = "todo" | "doing" | "waiting" | "done";

export const WORKSPACE_COLUMNS: Array<{ id: WorkspaceColumn; label: string }> = [
  { id: "todo", label: "Por hacer" },
  { id: "doing", label: "En curso" },
  { id: "waiting", label: "Esperando" },
  { id: "done", label: "Hecho" },
];

const TICKET_COLUMN: Record<string, WorkspaceColumn> = {
  QUEUED: "todo",
  RETURNED_TO_AI: "todo",
  ASSIGNED: "doing",
  WAITING_CUSTOMER: "waiting",
  WAITING_INTERNAL: "waiting",
  RESOLVED: "done",
  CLOSED: "done",
};
const TASK_COLUMN: Record<string, WorkspaceColumn> = {
  PENDING: "todo",
  IN_PROGRESS: "doing",
  IN_REVIEW: "waiting",
  BLOCKED: "waiting",
  COMPLETED: "done",
  CANCELED: "done",
};

export const TICKET_STATUS_FOR: Record<WorkspaceColumn, "QUEUED" | "ASSIGNED" | "WAITING_INTERNAL" | "RESOLVED"> = {
  todo: "QUEUED",
  doing: "ASSIGNED",
  waiting: "WAITING_INTERNAL",
  done: "RESOLVED",
};
export const TASK_STATUS_FOR: Record<WorkspaceColumn, "PENDING" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED"> = {
  todo: "PENDING",
  doing: "IN_PROGRESS",
  waiting: "IN_REVIEW",
  done: "COMPLETED",
};

export function columnFor(kind: WorkspaceKind, status: string): WorkspaceColumn {
  return (kind === "ticket" ? TICKET_COLUMN[status] : TASK_COLUMN[status]) ?? "todo";
}

export function isWorkspaceColumn(value: unknown): value is WorkspaceColumn {
  return value === "todo" || value === "doing" || value === "waiting" || value === "done";
}

export const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Nuevo",
  RETURNED_TO_AI: "Volvió a la IA",
  ASSIGNED: "Asignado",
  WAITING_CUSTOMER: "Esperando al cliente",
  WAITING_INTERNAL: "Esperando al equipo",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado",
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  IN_REVIEW: "En revisión",
  BLOCKED: "Trabado",
  COMPLETED: "Terminado",
  CANCELED: "Cancelado",
};

/** Prioridad común: tickets usan NORMAL, trabajos MEDIUM; las dos valen 1. */
export const PRIORITIES = [
  { id: "LOW", label: "Baja", rank: 0, tone: "" },
  { id: "MEDIUM", label: "Media", rank: 1, tone: "b" },
  { id: "HIGH", label: "Alta", rank: 2, tone: "y" },
  { id: "URGENT", label: "Urgente", rank: 3, tone: "r" },
] as const;
export type WorkspacePriority = (typeof PRIORITIES)[number]["id"];

export function normalizePriority(value: string): WorkspacePriority {
  if (value === "NORMAL") return "MEDIUM";
  return (PRIORITIES.find((item) => item.id === value)?.id ?? "MEDIUM") as WorkspacePriority;
}

export function priorityFor(kind: WorkspaceKind, value: WorkspacePriority) {
  return kind === "ticket" && value === "MEDIUM" ? "NORMAL" : value;
}

export function priorityInfo(value: string) {
  const id = normalizePriority(value);
  return PRIORITIES.find((item) => item.id === id) ?? PRIORITIES[1];
}

/** Referencia corta y estable: T-abc123 para tickets, D-abc123 para trabajos (con el id completo). */
export function itemKey(kind: WorkspaceKind, id: string) {
  return `${kind === "ticket" ? "T" : "D"}-${id}`;
}

export function parseItemKey(key: string): { kind: WorkspaceKind; id: string } | null {
  const match = /^([TD])-([a-z0-9]{8,40})$/i.exec(key.trim());
  if (!match) return null;
  return { kind: match[1].toUpperCase() === "T" ? "ticket" : "task", id: match[2] };
}

/** Código que se lee en la tarjeta, al estilo SOP-4F2A1 / DEV-9C0B3. */
export function itemCode(kind: WorkspaceKind, id: string) {
  return `${kind === "ticket" ? "SOP" : "DEV"}-${id.slice(-5).toUpperCase()}`;
}

/** Iniciales para el circulito del responsable. */
export function initials(name: string | null | undefined) {
  if (!name) return "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
