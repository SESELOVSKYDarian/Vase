export function getSupportPriorityLabel(priority: string) {
  switch (priority) {
    case "URGENT":
      return "Urgente";
    case "HIGH":
      return "Alta";
    case "LOW":
      return "Baja";
    default:
      return "Normal";
  }
}

export function getSupportStatusLabel(status: string) {
  switch (status) {
    case "QUEUED":
      return "En cola";
    case "ASSIGNED":
      return "Asignado";
    case "WAITING_CUSTOMER":
      return "Esperando cliente";
    case "WAITING_INTERNAL":
      return "Esperando interno";
    case "RESOLVED":
      return "Resuelto";
    case "RETURNED_TO_AI":
      return "Devuelto a IA";
    case "CLOSED":
      return "Cerrado";
    default:
      return status;
  }
}

export function getSupportTicketTone(status: string) {
  switch (status) {
    case "RESOLVED":
    case "RETURNED_TO_AI":
      return "success" as const;
    case "WAITING_INTERNAL":
      return "warning" as const;
    case "CLOSED":
      return "neutral" as const;
    case "QUEUED":
      return "premium" as const;
    default:
      return "info" as const;
  }
}

export function getSupportPriorityTone(priority: string) {
  switch (priority) {
    case "URGENT":
      return "danger" as const;
    case "HIGH":
      return "warning" as const;
    case "LOW":
      return "neutral" as const;
    default:
      return "info" as const;
  }
}

export function formatWaitingTime(from: Date) {
  const elapsedMs = Date.now() - from.getTime();
  const totalMinutes = Math.max(0, Math.floor(elapsedMs / 60000));

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 24) {
    return `${hours} h ${minutes} min`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} d ${remainingHours} h`;
}
