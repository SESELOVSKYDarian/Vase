// El código está repartido por tema en la carpeta support/. Este archivo solo lo junta.
// partes: ./support/create-support-ticket-from-escalation.ts, ./support/update-support-ticket-lifecycle.ts
export { createSupportNotifications, getAutomaticSupportAssignee, createSupportTicketFromEscalation } from "./support/create-support-ticket-from-escalation";
export { assignSupportTicket, addSupportTicketNote, sendSupportReply, updateSupportTicketLifecycle } from "./support/update-support-ticket-lifecycle";
