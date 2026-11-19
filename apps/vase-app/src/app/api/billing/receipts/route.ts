import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { RECEIPT_MAX_BYTES } from "@/lib/billing/transfer";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { submitTransferReceipt } from "@/server/services/transfer-receipts";

export const runtime = "nodejs";

/** El dueño de la cuenta sube el comprobante de transferencia de una factura. */
export async function POST(request: Request) {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    return NextResponse.json({ ok: false, message: "Tenés que ser dueño de la cuenta para pagar." }, { status: 403 });
  }

  try {
    await enforceRateLimit({ scope: "billing:receipt", key: membership.tenantId, limit: 10, windowSeconds: 60 * 60 });
  } catch {
    return NextResponse.json({ ok: false, message: "Subiste muchos comprobantes seguidos. Probá en un rato." }, { status: 429 });
  }

  // Corta antes de leer un archivo enorme (el formulario suma un poco más que el archivo).
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > RECEIPT_MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ ok: false, message: "El archivo pesa más de 5 MB." }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const paymentId = String(form?.get("paymentId") ?? "").trim();
  if (!(file instanceof File) || !paymentId || paymentId.length > 64) {
    return NextResponse.json({ ok: false, message: "Elegí el comprobante." }, { status: 400 });
  }

  const result = await submitTransferReceipt({
    tenantId: membership.tenantId,
    userId: session.user.id,
    clientPaymentId: paymentId,
    file,
    note: String(form?.get("note") ?? ""),
  });
  if (result.ok) revalidatePath("/app/billing");
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
