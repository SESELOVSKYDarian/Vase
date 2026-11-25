import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { safeEqual } from "@/lib/security/safe-compare";
import { parseOpenWaWebhookMessage } from "@/lib/integrations";
import { handleInboundChannelMessage } from "@/server/services/chatbot/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;

  // Este canal no oficial no viene firmado por Meta: con una clave compartida evitamos que
  // cualquiera meta mensajes falsos en la bandeja y en la IA de una cuenta.
  // Si la clave todavía no está cargada en el servidor, se sigue aceptando (para no cortar
  // canales que ya andan) y queda el aviso en el registro.
  const expectedSecret = process.env.OPENWA_WEBHOOK_SECRET?.trim();
  if (expectedSecret) {
    const bearer = req.headers.get("authorization");
    const providedSecret = req.headers.get("x-webhook-secret") ?? (bearer?.startsWith("Bearer ") ? bearer.slice(7).trim() : null);
    if (!safeEqual(providedSecret, expectedSecret)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  } else {
    console.warn("[openwa-webhook] OPENWA_WEBHOOK_SECRET sin cargar: el webhook acepta pedidos sin clave");
  }
  const channel = await prisma.aiChannelConnection.findFirst({
    where: {
      tenant: { slug: tenantSlug },
      channelType: "WHATSAPP",
      status: "CONNECTED",
    },
    orderBy: { createdAt: "asc" },
  });

  if (!channel) {
    return NextResponse.json({ ok: false, error: "channel_not_configured" }, { status: 404 });
  }

  const payload = (await req.json()) as unknown;
  const message = parseOpenWaWebhookMessage({
    tenantId: channel.tenantId,
    payload,
    channelType: "WHATSAPP",
  });

  if (!message) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  await handleInboundChannelMessage(message);
  return NextResponse.json({ ok: true });
}
