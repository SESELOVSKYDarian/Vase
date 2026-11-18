"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { changeSharedCustomer, changeSharedOrderStatus } from "@/server/services/business-shared";

export type SharedActionResult = { ok: boolean; message: string };

const orderSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["submitted", "pending_payment", "paid", "processing", "unpaid", "cancelled"]),
  notifyCustomer: z.boolean().default(false),
  reason: z.string().trim().max(400).optional(),
});

const ORDER_ERRORS: Record<string, string> = {
  notification_reason_required: "Para avisarle al cliente que se canceló, contale el motivo.",
  order_not_found: "No encontramos ese pedido.",
  BUSINESS_NOT_CONNECTED: "Tu cuenta no tiene tienda en Vase Business.",
};

/** Pedidos (Compartido): cambia el estado de un pedido. Lo pueden hacer el Dueño y los Encargados. */
export async function changeOrderStatusAction(input: z.input<typeof orderSchema>): Promise<SharedActionResult> {
  try {
    const { membership } = await requireTenantRole(tenantRoles.MANAGER);
    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Elegí un estado." };
    const result = await changeSharedOrderStatus(membership.tenantId, parsed.data.orderId, parsed.data);
    if (!result.ok) {
      const message = result.error.startsWith("insufficient_stock")
        ? "No hay stock suficiente para reactivar este pedido."
        : ORDER_ERRORS[result.error] ?? "No pudimos cambiar el pedido. Probá de nuevo.";
      return { ok: false, message };
    }
    revalidatePath("/app/pedidos");
    revalidatePath("/app");
    return { ok: true, message: parsed.data.notifyCustomer ? "Listo. Le avisamos al cliente." : "Listo." };
  } catch {
    return { ok: false, message: "No pudimos cambiar el pedido. Probá de nuevo." };
  }
}

const customerSchema = z.object({
  userId: z.string().uuid(),
  change: z.enum(["approve", "wholesale", "retail"]),
});

/** Clientes (Compartido): aprobar o pasar a mayorista/minorista. */
export async function changeCustomerAction(input: z.input<typeof customerSchema>): Promise<SharedActionResult> {
  try {
    const { membership } = await requireTenantRole(tenantRoles.MANAGER);
    const parsed = customerSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "No pudimos hacer el cambio." };
    const { userId, change } = parsed.data;
    const result = await changeSharedCustomer(
      membership.tenantId,
      userId,
      change === "approve" ? { status: "active" } : { role: change },
    );
    if (!result.ok) {
      return { ok: false, message: result.error === "cannot_change_admin" ? "Esa persona administra tu tienda: no se puede cambiar desde acá." : "No pudimos hacer el cambio. Probá de nuevo." };
    }
    revalidatePath("/app/clientes");
    revalidatePath("/app");
    return { ok: true, message: change === "approve" ? "Cliente aprobado." : change === "wholesale" ? "Ahora es mayorista." : "Ahora es minorista." };
  } catch {
    return { ok: false, message: "No pudimos hacer el cambio. Probá de nuevo." };
  }
}
