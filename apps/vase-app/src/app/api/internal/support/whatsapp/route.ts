import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleWhatsappSupportRequest } from "@/server/services/support/whatsapp-bridge";

const bodySchema = z.object({
  conversationId: z.string().min(1).max(191),
  phone: z.string().min(6).max(40),
  name: z.string().max(190).nullish(),
  reason: z.string().max(500).nullish(),
  recent: z.array(z.string().max(2000)).max(10).optional(),
});

/** Labs avisa que alguien pidió hablar con una persona por el WhatsApp de Vase. */
export async function POST(request: Request) {
  try {
    assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  try {
    return NextResponse.json(await handleWhatsappSupportRequest(parsed.data));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "FAILED" }, { status: 500 });
  }
}
