import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { isMercadoPagoPaymentId } from "@/lib/billing/mercadopago-rules";
import { isValidMercadoPagoSignature } from "@/lib/billing/mercadopago-signature";
import {
  isMercadoPagoConfigured,
  mercadoPagoWebhookSecret,
  settleMercadoPagoPayment,
} from "@/server/services/mercadopago";
import { refreshAutoDebit, settleAutoDebitCharge } from "@/server/services/mercadopago-autodebit";

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
  const type = String(payload?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");
  let resourceId = String(payload?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");

  // Con la clave secreta cargada, solo se procesan avisos firmados por Mercado Pago.
  const secret = mercadoPagoWebhookSecret();
  if (secret) {
    const signatureHeader = request.headers.get("x-signature");
    // Aviso viejo (IPN): no trae una firma que se pueda validar. Llega también en formato Webhook, que sí se procesa.
    if (!signatureHeader && url.searchParams.has("topic")) return NextResponse.json({ received: true });

    const signedId = url.searchParams.get("data.id");
    const valid = isValidMercadoPagoSignature({
      secret,
      signatureHeader,
      requestId: request.headers.get("x-request-id"),
      dataId: signedId,
    });
    // 401: Mercado Pago lo marca como fallido y reintenta (sirve si la clave estaba mal cargada).
    if (!valid) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    // Se usa el id firmado, no el del cuerpo.
    if (signedId) resourceId = signedId;
  }

  try {
    // El estado real siempre se consulta a Mercado Pago; un aviso falso no puede acreditar nada.
    if (type === "payment" && isMercadoPagoPaymentId(resourceId)) {
      await settleMercadoPagoPayment(resourceId);
    } else if ((type === "subscription_preapproval" || type === "preapproval") && /^[A-Za-z0-9-]{6,64}$/.test(resourceId)) {
      // Débito automático: el cliente lo autorizó, lo pausó o lo canceló.
      await refreshAutoDebit(resourceId);
    } else if ((type === "subscription_authorized_payment" || type === "authorized_payment") && /^\d{1,30}$/.test(resourceId)) {
      // Débito automático: un cobro del mes.
      await settleAutoDebitCharge(resourceId);
    }
    return NextResponse.json({ received: true });
  } catch {
    // Un error hace que Mercado Pago reintente más tarde.
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }
}
