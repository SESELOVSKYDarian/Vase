import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { isMercadoPagoPaymentId } from "@/lib/billing/mercadopago-rules";
import { isMercadoPagoConfigured, settleMercadoPagoPayment } from "@/server/services/mercadopago";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { ipAddress } = await getRequestContext();
  try {
    await enforceRateLimit({ scope: "webhook:mercadopago", key: ipAddress, limit: 300, windowSeconds: 60 });
  } catch {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const url = new URL(request.url);
  const payload = (await request.json().catch(() => null)) as { type?: unknown; data?: { id?: unknown } } | null;
  const type = payload?.type ?? url.searchParams.get("type");
  const paymentId = String(payload?.data?.id ?? url.searchParams.get("data.id") ?? "");

  if (type !== "payment" || !isMercadoPagoPaymentId(paymentId)) {
    return NextResponse.json({ received: true });
  }

  try {
    // El estado real se consulta a Mercado Pago; un aviso falso no puede acreditar nada.
    await settleMercadoPagoPayment(paymentId);
    return NextResponse.json({ received: true });
  } catch {
    // Un error hace que Mercado Pago reintente más tarde.
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }
}
