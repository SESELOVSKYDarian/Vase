// Textos que se repiten en el Admin nuevo: nombres de productos, estados de cobro y formato de plata.

export const ADMIN_PRODUCT_NAMES: Record<string, string> = {
  BUSINESS: "Business",
  LABS: "Labs",
  MANAGEMENT: "Management",
  REST: "Rest",
};

export const ADMIN_BILLING_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Al día", cls: "g" },
  TRIAL: { label: "En prueba", cls: "y" },
  PAST_DUE: { label: "Vencido", cls: "r" },
  CANCELED: { label: "Cancelado", cls: "" },
};

export const ADMIN_TICKET_STATUS: Record<string, { label: string; cls: string }> = {
  QUEUED: { label: "En cola", cls: "y" },
  ASSIGNED: { label: "Asignado", cls: "y" },
  WAITING_CUSTOMER: { label: "Espera al cliente", cls: "" },
  WAITING_INTERNAL: { label: "Espera al equipo", cls: "y" },
  RESOLVED: { label: "Resuelto", cls: "g" },
  RETURNED_TO_AI: { label: "Volvió a la IA", cls: "" },
  CLOSED: { label: "Cerrado", cls: "" },
};

export function adminMoney(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

export function adminDate(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(value);
}

/** Estado de una factura: pagada, vencida o por pagar. */
export function invoiceState(invoice: { paidAt: Date | null; status: string; dueAt: Date | null }, now = Date.now()) {
  if (invoice.paidAt) return { label: "Pagada", cls: "g" };
  if (invoice.status === "CANCELED") return { label: "Cancelada", cls: "" };
  if (invoice.dueAt && invoice.dueAt.getTime() < now) return { label: "Vencida", cls: "r" };
  return { label: "Por pagar", cls: "y" };
}
