/** Estados de un pedido a medida, con texto en español. Sirve en servidor y en cliente. */
export const REQUEST_STATUS: Record<string, { label: string; hint: string; tone: string }> = {
  SUBMITTED: { label: "Recibido", hint: "Todavía nadie lo miró", tone: "y" },
  REVIEWING: { label: "En revisión", hint: "Lo estamos mirando", tone: "b" },
  QUOTED: { label: "Cotizado", hint: "Ya tiene precio", tone: "p" },
  IN_PROGRESS: { label: "En marcha", hint: "Lo estamos haciendo", tone: "b" },
  DELIVERED: { label: "Entregado", hint: "Terminado", tone: "g" },
};
