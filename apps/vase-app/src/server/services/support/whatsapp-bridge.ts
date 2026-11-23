// Puente WhatsApp ↔ Workspace. El número de Vase está conectado en Labs (la cuenta propia de Vase).
// - Labs avisa cuando alguien pide hablar con una persona: si el número está vinculado a una cuenta de Vase,
//   se abre (o se suma a) un ticket; si no, queda como contacto para vincularlo desde el Workspace.
// - Cuando el equipo le responde al cliente desde el Workspace, el mensaje sale por WhatsApp a través de Labs.
import { prisma } from "@/lib/db/prisma";
import { createSupportTicketEvent } from "./create-support-ticket-from-escalation";

/** Solo dígitos. Para comparar se usan los últimos 10 (sin 54, 9 ni 0 adelante). */
export function normalizePhone(raw: string | null | undefined) {
  return String(raw ?? "").replace(/\D/g, "");
}

export function samePhone(left: string | null | undefined, right: string | null | undefined) {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  if (a.length < 8 || b.length < 8) return false;
  return a.slice(-10) === b.slice(-10);
}

/** Busca la cuenta cuyo teléfono o WhatsApp de "Mi negocio" coincide con el número. */
export async function findTenantByPhone(phone: string) {
  const rows = await prisma.tenantBusinessInfo.findMany({
    where: { OR: [{ phone: { not: null } }, { whatsapp: { not: null } }] },
    select: { tenantId: true, phone: true, whatsapp: true },
    take: 2000,
  });
  return rows.find((row) => samePhone(row.phone, phone) || samePhone(row.whatsapp, phone))?.tenantId ?? null;
}

export type WhatsappSupportRequest = {
  conversationId: string;
  phone: string;
  name?: string | null;
  reason?: string | null;
  recent?: string[];
};

export async function handleWhatsappSupportRequest(input: WhatsappSupportRequest) {
  const phone = normalizePhone(input.phone);
  if (phone.length < 8) throw new Error("PHONE_REQUIRED");
  const name = input.name?.trim().slice(0, 120) || null;
  const recent = (input.recent ?? []).map((line) => String(line).trim()).filter(Boolean).slice(-6);

  let contact = await prisma.supportContact.findUnique({ where: { phone } });
  if (!contact) {
    contact = await prisma.supportContact.create({
      data: { phone, name, tenantId: await findTenantByPhone(phone), labsConversationId: input.conversationId, lastRequestAt: new Date() },
    });
  } else {
    contact = await prisma.supportContact.update({
      where: { id: contact.id },
      data: { name: contact.name ?? name, labsConversationId: input.conversationId, lastRequestAt: new Date() },
    });
  }

  if (!contact.tenantId) return { linked: false as const, contactId: contact.id };
  const opened = await openTicketForContact(contact.id, input.reason ?? null, recent);
  if (opened.created) await acknowledgeWhatsappTicket(opened.ticketId, input.conversationId).catch(() => undefined);
  return { linked: true as const, contactId: contact.id, ticketId: opened.ticketId };
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  return `${user.slice(0, 2)}${"•".repeat(Math.max(2, Math.min(6, user.length - 2)))}@${domain}`;
}

/**
 * Apenas se abre el ticket (el cliente acaba de escribir: estamos dentro de las 24 h, es gratis),
 * le avisamos que lo vamos a analizar y que, si no le respondemos por acá en 24 h, le llega al correo.
 */
export async function acknowledgeWhatsappTicket(ticketId: string, labsConversationId: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      createdByUser: { select: { email: true } },
      tenant: { select: { billingEmail: true, primaryOwner: { select: { email: true } } } },
    },
  });
  if (!ticket) return;
  const email = ticket.createdByUser?.email ?? ticket.tenant.primaryOwner?.email ?? ticket.tenant.billingEmail;
  const code = `SOP-${ticket.id.slice(-5).toUpperCase()}`;
  const text = [
    `¡Gracias por escribirnos! Ya cargamos tu pedido (${code}) y lo vamos a estar analizando.`,
    email
      ? `Si no te respondemos por acá en las próximas 24 horas, te mandamos la respuesta a tu correo (${maskEmail(email)}).`
      : "Si no te respondemos por acá en las próximas 24 horas, te mandamos la respuesta a tu correo.",
  ].join("\n\n");
  const result = await sendWhatsappReply(labsConversationId, text);
  await createSupportTicketEvent(ticket.id, "AGENT_REPLIED", result.ok ? "Aviso automático enviado por WhatsApp." : "No se pudo mandar el aviso automático por WhatsApp.", undefined, {
    whatsapp: result.ok ? "sent" : "failed",
    automatic: true,
  });
}

/** Abre un ticket para el contacto (o suma el pedido al que ya está abierto con la misma conversación). */
export async function openTicketForContact(contactId: string, reason: string | null, recent: string[] = []) {
  const contact = await prisma.supportContact.findUnique({ where: { id: contactId } });
  if (!contact?.tenantId) throw new Error("CONTACT_NOT_LINKED");
  const summary = [reason ? `Motivo: ${reason}` : null, ...recent.map((line) => `• ${line}`)].filter(Boolean).join("\n");

  const open = contact.labsConversationId
    ? await prisma.supportTicket.findFirst({
        where: { labsConversationId: contact.labsConversationId, status: { notIn: ["RESOLVED", "CLOSED"] } },
        select: { id: true },
      })
    : null;
  if (open) {
    await prisma.supportTicket.update({ where: { id: open.id }, data: { lastCustomerMessageAt: new Date(), waitingSince: new Date() } });
    await createSupportTicketEvent(open.id, "CUSTOMER_UPDATED", summary || "El cliente volvió a escribir por WhatsApp.");
    return { ticketId: open.id, created: false };
  }

  const firstLine = (recent.at(-1) ?? reason ?? "Pedido por WhatsApp").replace(/\s+/g, " ").slice(0, 120);
  const ticket = await prisma.supportTicket.create({
    data: {
      tenantId: contact.tenantId,
      createdByUserId: contact.userId,
      source: "AI_ESCALATION",
      priority: "NORMAL",
      status: "QUEUED",
      subject: `WhatsApp: ${firstLine}`,
      customerName: contact.name,
      customerContact: `+${contact.phone}`,
      aiSummary: summary || null,
      labsConversationId: contact.labsConversationId,
      lastCustomerMessageAt: new Date(),
    },
    select: { id: true },
  });
  await createSupportTicketEvent(ticket.id, "CREATED", "Ticket creado desde WhatsApp.", undefined, { phone: contact.phone });
  return { ticketId: ticket.id, created: true };
}

/** Manda un texto al cliente por WhatsApp en la conversación de Labs del ticket. */
export async function sendWhatsappReply(labsConversationId: string, text: string) {
  const base = process.env.LABS_INTERNAL_URL ?? "http://vase-labs:3007";
  const response = await fetch(new URL(`/api/internal/support/conversations/${encodeURIComponent(labsConversationId)}/reply`, base), {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`, "content-type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!response) return { ok: false, error: "LABS_UNREACHABLE" };
  if (response.ok) return { ok: true };
  const payload = (await response.json().catch(() => ({}))) as { error?: string; providerMessage?: string };
  return { ok: false, error: payload.providerMessage ?? payload.error ?? `LABS_${response.status}` };
}

/** Meta no deja escribir texto libre si el cliente no escribió en las últimas 24 h (error 131047). */
export function isWindowClosedError(error: string | undefined) {
  return Boolean(error && /131047|re-?engagement|24 ?h|outside.*window|WINDOW/i.test(error));
}

/**
 * Plantilla aprobada por Meta: la única forma de escribirle a alguien que no habló en las últimas 24 h
 * o de empezar una charla. WHATSAPP_REPLY_TEMPLATE: aviso de respuesta ({{1}} = el texto).
 * WHATSAPP_START_TEMPLATE: primer mensaje ({{1}} = nombre). Idioma: WHATSAPP_TEMPLATE_LANG (es_AR).
 */
export async function sendWhatsappTemplate(phone: string, kind: "reply" | "start", bodyParams: string[]) {
  const name = (kind === "reply" ? process.env.WHATSAPP_REPLY_TEMPLATE : process.env.WHATSAPP_START_TEMPLATE)?.trim();
  if (!name) return { ok: false, error: "TEMPLATE_NOT_CONFIGURED" };
  const base = process.env.LABS_INTERNAL_URL ?? "http://vase-labs:3007";
  const response = await fetch(new URL("/api/internal/support/whatsapp/start", base), {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`, "content-type": "application/json" },
    body: JSON.stringify({
      phone: normalizePhone(phone),
      template: { name, language: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "es_AR", bodyParams },
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!response) return { ok: false, error: "LABS_UNREACHABLE" };
  if (response.ok) return { ok: true };
  const payload = (await response.json().catch(() => ({}))) as { error?: string; providerMessage?: string };
  return { ok: false, error: payload.providerMessage ?? payload.error ?? `LABS_${response.status}` };
}

/** Número de WhatsApp de Vase para el link "escribinos" (wa.me). */
export function vaseWhatsappNumber() {
  return normalizePhone(process.env.VASE_WHATSAPP_NUMBER ?? "5492234496403");
}

/**
 * Responde por WhatsApp. Si pasaron 24 h desde el último mensaje del cliente:
 * - con plantilla configurada, la manda (se paga);
 * - sin plantilla (gratis): la respuesta queda en espera y sale sola apenas el cliente vuelva a escribir,
 *   y mientras tanto le llega por correo con un botón para abrir el chat.
 */
export async function deliverWhatsappReply(
  ticket: { id: string; labsConversationId: string | null; customerContact: string | null },
  text: string,
) {
  if (!ticket.labsConversationId) return { sent: false as const, reason: "NO_WHATSAPP" };
  const direct = await sendWhatsappReply(ticket.labsConversationId, text);
  if (direct.ok) return { sent: true as const, via: "text" as const };
  if (!isWindowClosedError(direct.error)) return { sent: false as const, reason: direct.error ?? "SEND_FAILED" };

  if (process.env.WHATSAPP_REPLY_TEMPLATE?.trim() && ticket.customerContact) {
    const template = await sendWhatsappTemplate(ticket.customerContact, "reply", [text.slice(0, 900)]);
    if (template.ok) return { sent: true as const, via: "template" as const };
  }

  await createSupportTicketEvent(ticket.id, "AGENT_REPLIED", "Respuesta en espera: sale por WhatsApp cuando el cliente vuelva a escribir.", undefined, {
    whatsapp: "pending",
    text,
  });
  const emailed = await emailReplyToCustomer(ticket.id, text).catch(() => false);
  return { sent: false as const, reason: "QUEUED", emailed };
}

/** Correo al cliente con la respuesta y un botón que abre el chat de WhatsApp con Vase (así se reabren las 24 h). */
async function emailReplyToCustomer(ticketId: string, text: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      subject: true,
      createdByUser: { select: { email: true, name: true } },
      tenant: { select: { billingEmail: true, name: true, primaryOwner: { select: { email: true, name: true } } } },
    },
  });
  const to = ticket?.createdByUser?.email ?? ticket?.tenant.primaryOwner?.email ?? ticket?.tenant.billingEmail;
  if (!ticket || !to) return false;
  const name = (ticket.createdByUser?.name ?? ticket.tenant.primaryOwner?.name ?? "").split(" ")[0];
  const { sendNoticeEmail } = await import("@/server/services/auth-email");
  await sendNoticeEmail({
    email: to,
    subject: `Respuesta de Vase: ${ticket.subject.replace(/^WhatsApp:\s*/, "")}`.slice(0, 150),
    title: "Te respondimos",
    greeting: name ? `Hola, ${name}` : undefined,
    message: text,
    button: {
      label: "Seguir por WhatsApp",
      url: `https://wa.me/${vaseWhatsappNumber()}?text=${encodeURIComponent("Hola, vi la respuesta de Vase")}`,
    },
    note: "Si nos escribís por WhatsApp, seguimos la charla por ahí.",
    reason: `Te llegó porque pediste ayuda a Vase para ${ticket.tenant.name}.`,
  });
  return true;
}

/** El cliente volvió a escribir: se mandan por WhatsApp las respuestas que estaban en espera, en orden. */
export async function flushPendingWhatsappReplies(labsConversationId: string) {
  const events = await prisma.supportTicketEvent.findMany({
    where: {
      eventType: "AGENT_REPLIED",
      ticket: { labsConversationId },
      metadata: { path: "$.whatsapp", equals: "pending" },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, metadata: true },
    take: 20,
  });
  let sent = 0;
  for (const event of events) {
    const meta = (event.metadata ?? {}) as { text?: unknown };
    const text = typeof meta.text === "string" ? meta.text : "";
    if (!text) continue;
    const result = await sendWhatsappReply(labsConversationId, text);
    if (!result.ok) break;
    await prisma.supportTicketEvent.update({ where: { id: event.id }, data: { metadata: { whatsapp: "sent", text, sentAt: new Date().toISOString() } } });
    sent += 1;
  }
  return { pending: events.length, sent };
}
