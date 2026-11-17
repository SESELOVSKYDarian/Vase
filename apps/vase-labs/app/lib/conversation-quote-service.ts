// Guarda el presupuesto que pidió la IA y arma lo que se manda por el chat (texto, PDF y datos para Conversaciones).
import { randomUUID } from "node:crypto";
import type { LabsChannel } from "@vase/contracts";
import type { PrismaClient } from "./db";
import {
  QUOTE_VALID_DAYS,
  buildQuoteLines,
  quoteChatText,
  quoteFileName,
  quotePublicUrl,
  quoteUnavailableText,
  type QuoteMessageMeta,
} from "./conversation-quote";

export async function createConversationQuote(
  prisma: PrismaClient,
  input: {
    assistantId: string;
    conversationId: string;
    globalTenantId: string;
    channel: LabsChannel;
    action: { items: Array<{ productId: string; quantity: number }>; customerName?: string; notes?: string };
  },
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ text: string; document?: { url: string; filename: string }; quote?: QuoteMessageMeta; handoffReason?: string }> {
  const products = await prisma.catalogProduct.findMany({
    where: {
      globalTenantId: input.globalTenantId,
      externalProductId: { in: input.action.items.map((item) => item.productId) },
      active: true,
    },
    select: { externalProductId: true, sku: true, name: true, price: true },
  });
  const built = buildQuoteLines(input.action.items, products);
  if (built.lines.length === 0) {
    return {
      text: quoteUnavailableText(built.missing),
      handoffReason: `Pide presupuesto y falta el precio de: ${built.missing.join(", ") || "productos que no están en el catálogo"}`.slice(0, 300),
    };
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: input.conversationId },
    select: { customerName: true },
  });
  const customerName = input.action.customerName || conversation?.customerName || null;
  const validUntil = new Date(Date.now() + QUOTE_VALID_DAYS * 86_400_000);
  const currency = "ARS";

  // El número es correlativo por cuenta. Si dos presupuestos salen a la vez, se reintenta con el siguiente.
  let created: { id: string; number: number } | null = null;
  for (let attempt = 0; attempt < 4 && !created; attempt += 1) {
    const last = await prisma.conversationQuote.findFirst({
      where: { globalTenantId: input.globalTenantId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    try {
      created = await prisma.conversationQuote.create({
        data: {
          id: randomUUID().replaceAll("-", ""),
          conversationId: input.conversationId,
          assistantId: input.assistantId,
          globalTenantId: input.globalTenantId,
          number: (last?.number ?? 0) + 1,
          currency,
          items: built.lines,
          subtotal: built.subtotal,
          total: built.total,
          customerName,
          notes: input.action.notes ?? null,
          validUntil,
        },
        select: { id: true, number: true },
      });
    } catch (error) {
      if ((error as { code?: string } | null)?.code !== "P2002") throw error;
    }
  }
  if (!created) throw new Error("CONVERSATION_QUOTE_NUMBER_CONFLICT");

  const url = quotePublicUrl(created, env);
  const quote: QuoteMessageMeta = {
    id: created.id,
    number: created.number,
    currency,
    total: built.total,
    validUntil: validUntil.toISOString(),
    url,
    lines: built.lines.slice(0, 8).map((line) => ({ name: line.name, quantity: line.quantity, total: line.total })),
  };
  return {
    text: quoteChatText({
      number: created.number,
      total: built.total,
      currency,
      validUntil,
      missing: built.missing,
      includesLink: input.channel === "INSTAGRAM",
      url,
    }),
    document: { url, filename: quoteFileName(created.number) },
    quote,
    ...(built.missing.length
      ? { handoffReason: `Presupuesto enviado, falta el precio de: ${built.missing.join(", ")}`.slice(0, 300) }
      : {}),
  };
}
