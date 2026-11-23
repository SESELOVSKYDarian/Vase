// Puente con el soporte de Vase. Solo actúa en la cuenta de Labs de Vase (VASE_SUPPORT_LABS_TENANT_ID):
// cuando alguien pide hablar con una persona por WhatsApp, le avisa a app.vase.ar para que abra un ticket
// en el Workspace si el número es de un cliente.

type BridgePrisma = {
  conversation: { findUnique(input: unknown): Promise<unknown> };
};

type BridgeConversation = {
  id: string;
  channel: string | null;
  customerName: string | null;
  customerContact: string | null;
  externalUserId: string | null;
  assistant: { globalTenantId: string };
  messages: Array<{ content: string | null }>;
};

export function vaseSupportTenantId(env: NodeJS.ProcessEnv = process.env) {
  return env.VASE_SUPPORT_LABS_TENANT_ID?.trim() || null;
}

export async function notifyVaseSupportHandoff(
  prisma: BridgePrisma,
  input: { conversationId: string; reason?: string | null },
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
) {
  const tenantId = vaseSupportTenantId(env);
  const appUrl = env.APP_INTERNAL_URL?.trim();
  const token = env.SERVICE_TO_SERVICE_TOKEN?.trim();
  if (!tenantId || !appUrl || !token) return;

  const conversation = (await prisma.conversation.findUnique({
    where: { id: input.conversationId },
    select: {
      id: true,
      channel: true,
      customerName: true,
      customerContact: true,
      externalUserId: true,
      assistant: { select: { globalTenantId: true } },
      messages: { where: { direction: "INBOUND" }, orderBy: { createdAt: "desc" }, take: 5, select: { content: true } },
    },
  })) as BridgeConversation | null;
  if (!conversation || conversation.assistant.globalTenantId !== tenantId || conversation.channel !== "WHATSAPP") return;

  const phone = conversation.customerContact?.trim() || conversation.externalUserId?.trim();
  if (!phone) return;

  await fetcher(new URL("/api/internal/support/whatsapp", appUrl), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      conversationId: conversation.id,
      phone,
      name: conversation.customerName,
      reason: input.reason ?? null,
      recent: conversation.messages.map((message) => message.content ?? "").filter(Boolean).reverse(),
    }),
    signal: AbortSignal.timeout(5_000),
  });
}

/** Igual que notifyVaseSupportHandoff pero sin frenar ni romper la respuesta al cliente. */
export function notifyVaseSupportHandoffInBackground(prisma: BridgePrisma, input: { conversationId: string; reason?: string | null }) {
  void notifyVaseSupportHandoff(prisma, input).catch(() => undefined);
}

/**
 * Cada mensaje que entra por el WhatsApp de Vase abre 24 h gratis para responder.
 * Se avisa a app.vase.ar para que mande las respuestas que quedaron en espera.
 */
export function notifyVaseSupportInboundInBackground(
  input: { globalTenantId: string; channelType: string; conversationId: string },
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
) {
  const tenantId = vaseSupportTenantId(env);
  const appUrl = env.APP_INTERNAL_URL?.trim();
  const token = env.SERVICE_TO_SERVICE_TOKEN?.trim();
  if (!tenantId || !appUrl || !token || input.globalTenantId !== tenantId || input.channelType !== "WHATSAPP") return;
  void fetcher(new URL("/api/internal/support/whatsapp/inbound", appUrl), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ conversationId: input.conversationId }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => undefined);
}
