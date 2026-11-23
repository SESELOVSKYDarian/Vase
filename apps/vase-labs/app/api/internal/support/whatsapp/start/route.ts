import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../lib/db";
import { createOfficialChannelSender } from "../../../../../lib/official-channel-sender";
import { PrismaOfficialChannelSenderRepository } from "../../../../../lib/official-channel-sender-repository";
import { vaseSupportTenantId } from "../../../../../lib/vase-support-bridge";

/**
 * Empezar una charla desde el número de Vase (o volver a escribir pasadas las 24 h).
 * WhatsApp solo lo permite con una plantilla aprobada por Meta. Cuando el cliente contesta,
 * la conversación entra a Labs como cualquier otra.
 */
export async function POST(request: Request) {
  try {
    assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const globalTenantId = vaseSupportTenantId();
  if (!globalTenantId) return NextResponse.json({ error: "VASE_SUPPORT_LABS_TENANT_ID_MISSING" }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as {
    phone?: unknown;
    template?: { name?: unknown; language?: unknown; bodyParams?: unknown };
  };
  const phone = String(body.phone ?? "").replace(/\D/g, "");
  const name = typeof body.template?.name === "string" ? body.template.name.trim() : "";
  const language = typeof body.template?.language === "string" ? body.template.language.trim() : "es_AR";
  const bodyParams = Array.isArray(body.template?.bodyParams)
    ? body.template.bodyParams.map((value) => String(value).slice(0, 900)).slice(0, 10)
    : [];
  if (phone.length < 8 || !name) return NextResponse.json({ error: "PHONE_AND_TEMPLATE_REQUIRED" }, { status: 400 });

  const sender = createOfficialChannelSender({
    repository: new PrismaOfficialChannelSenderRepository(labsPrisma),
    encryptionSecret: process.env.TOKEN_ENCRYPTION_SECRET ?? "",
    graphVersion: process.env.META_GRAPH_VERSION?.trim() || "v25.0",
  });
  try {
    const result = await sender.send({
      globalTenantId,
      channelType: "WHATSAPP",
      recipientId: phone,
      text: "",
      template: { name, language, bodyParams },
    });
    return NextResponse.json({ ok: true, providerMessageId: result.providerMessageId });
  } catch (error) {
    const source = error as { code?: unknown; providerMessage?: unknown } | null;
    return NextResponse.json(
      {
        error: typeof source?.code === "string" ? source.code : "SEND_FAILED",
        providerMessage: typeof source?.providerMessage === "string" ? source.providerMessage : undefined,
      },
      { status: 502 },
    );
  }
}
