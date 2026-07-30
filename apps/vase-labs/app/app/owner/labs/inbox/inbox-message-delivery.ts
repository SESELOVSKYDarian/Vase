export type InboxMessageDelivery = {
  status: "PENDING" | "SENT" | "FAILED";
  providerMessageId: string | null;
  error: string | null;
};

export function resolveInboxMessageDelivery(
  delivery: InboxMessageDelivery | null,
): {
  label: string;
  tone: "sent" | "pending" | "failed";
  detail: string;
} {
  if (delivery?.status === "FAILED") {
    return {
      label: "No enviado",
      tone: "failed",
      detail: "Meta rechazó el envío. Revisá la conexión del canal y volvé a intentarlo.",
    };
  }

  if (delivery?.status === "SENT" && delivery.providerMessageId) {
    return {
      label: "Enviado",
      tone: "sent",
      detail: "Meta aceptó el mensaje. La entrega al cliente todavía no fue confirmada.",
    };
  }

  if (delivery?.status === "PENDING") {
    return {
      label: "Procesando",
      tone: "pending",
      detail: "Labs todavía está esperando la respuesta del canal.",
    };
  }

  return {
    label: "Sin confirmar",
    tone: "pending",
    detail: "Labs no recibió una confirmación de envío para este mensaje.",
  };
}
