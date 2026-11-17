import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../../lib/db";
import { requireTenantAccess } from "../../../../../../../lib/tenant-route-guard";
import { decryptChannelSecret } from "../../../../../../../lib/channel-secrets";
import { buildBusinessProfileContext } from "../../../../../../../lib/business-profile";
import { labsEntitlementsService } from "../../../../../../../lib/labs-entitlements-service";
import { generateInboxAssist, type InboxAssist } from "../../../../../../../lib/inbox-assist";

export const dynamic = "force-dynamic";

// Se calcula una vez por mensaje del cliente: volver a abrir la charla no gasta de nuevo.
const CACHE_MS = 15 * 60_000;
const cache = new Map<string, { at: number; lastMessageId: string; assist: InboxAssist }>();

function remember(conversationId: string, lastMessageId: string, assist: InboxAssist) {
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 100);
    for (const [key] of oldest) cache.delete(key);
  }
  cache.set(conversationId, { at: Date.now(), lastMessageId, assist });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; conversationId: string }> },
) {
  const { tenantSlug, conversationId } = await params;
  const access = await requireTenantAccess(request, tenantSlug);
  if (!access.ok) return access.response;

  const conversation = await labsPrisma.conversation.findFirst({
    where: { id: conversationId, assistant: { tenantSlug } },
    select: { id: true, channel: true, customerName: true, assistantId: true, assistant: { select: { globalTenantId: true } } },
  });
  if (!conversation) return NextResponse.json({ error: "CONVERSATION_NOT_FOUND" }, { status: 404 });

  const recent = await labsPrisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, role: true, content: true, createdAt: true },
  });
  const messages = recent.reverse();
  const last = messages.at(-1);
  if (!last) return NextResponse.json({ error: "CONVERSATION_EMPTY" }, { status: 409 });

  const cached = cache.get(conversationId);
  if (cached && cached.lastMessageId === last.id && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json({ assist: cached.assist, cached: true });
  }

  const globalTenantId = conversation.assistant.globalTenantId;
  const entitlement = await labsEntitlementsService.getEntitlement(globalTenantId).catch(() => null);
  const budget = (entitlement?.aiBudgetMicros ?? 0) + (entitlement?.extraAiBudgetMicros ?? 0);
  if (
    entitlement
    && (!["ACTIVE", "TRIAL"].includes(entitlement.status) || (budget > 0 && (entitlement.aiBudgetUsedMicros ?? 0) >= budget))
  ) {
    return NextResponse.json({ error: "AI_BUDGET_UNAVAILABLE" }, { status: 402 });
  }

  let apiKey = process.env.OPENAI_API_KEY ?? "";
  const secret = await labsPrisma.assistantSecret.findUnique({
    where: { assistantId_kind: { assistantId: conversation.assistantId, kind: "OPENAI_API_KEY" } },
    select: { encryptedValue: true },
  });
  if (secret?.encryptedValue && process.env.TOKEN_ENCRYPTION_SECRET?.trim()) {
    try {
      apiKey = decryptChannelSecret(secret.encryptedValue, process.env.TOKEN_ENCRYPTION_SECRET.trim());
    } catch {
      // queda la clave general
    }
  }
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY_MISSING" }, { status: 503 });

  // Cómo escribe el equipo: sus últimos mensajes en cualquier conversación de esta cuenta.
  const examples = await labsPrisma.message.findMany({
    where: { role: "human_agent", conversation: { assistantId: conversation.assistantId } },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: { content: true },
  });

  try {
    const result = await generateInboxAssist({
      apiKey,
      messages,
      styleExamples: examples.map((example) => example.content).filter((content) => content.trim().length > 3),
      businessContext: await buildBusinessProfileContext(globalTenantId).catch(() => ""),
      customerName: conversation.customerName,
    });
    await labsEntitlementsService.registerTokenUsage(globalTenantId, {
      channel: conversation.channel ?? "WHATSAPP",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      conversationId,
      assistantId: conversation.assistantId,
      model: result.model,
      source: `openai:${result.model}:inbox-assist`,
    }).catch(() => undefined);
    remember(conversationId, last.id, result.assist);
    return NextResponse.json({ assist: result.assist });
  } catch {
    return NextResponse.json({ error: "INBOX_ASSIST_FAILED" }, { status: 502 });
  }
}
