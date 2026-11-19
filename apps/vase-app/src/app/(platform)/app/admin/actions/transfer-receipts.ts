"use server";

// Revisión de comprobantes de transferencia desde Admin › Finanzas.
import { revalidatePath } from "next/cache";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { approveTransferReceipt, rejectTransferReceipt, type ReceiptResult } from "@/server/services/transfer-receipts";

function refresh() {
  revalidatePath("/app/admin/finance");
  revalidatePath("/app/admin");
}

export async function approveTransferReceiptAction(receiptId: string, amount: number | null): Promise<ReceiptResult> {
  try {
    const session = await requireAdminPermission(adminPermissions.BILLING);
    if (typeof receiptId !== "string" || receiptId.length > 64) return { ok: false, message: "Comprobante inválido." };
    const value = typeof amount === "number" && Number.isFinite(amount) && amount > 0 ? amount : null;
    const result = await approveTransferReceipt({ receiptId, reviewerId: session.user.id, amount: value });
    if (result.ok) refresh();
    return result;
  } catch {
    return { ok: false, message: "No pudimos aprobar el comprobante." };
  }
}

export async function rejectTransferReceiptAction(receiptId: string, reason: string): Promise<ReceiptResult> {
  try {
    const session = await requireAdminPermission(adminPermissions.BILLING);
    if (typeof receiptId !== "string" || receiptId.length > 64 || typeof reason !== "string") return { ok: false, message: "Datos inválidos." };
    const result = await rejectTransferReceipt({ receiptId, reviewerId: session.user.id, reason });
    if (result.ok) refresh();
    return result;
  } catch {
    return { ok: false, message: "No pudimos rechazar el comprobante." };
  }
}
