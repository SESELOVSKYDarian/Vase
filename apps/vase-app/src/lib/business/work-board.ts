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
