"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireVerifiedPlatformRole, requireVerifiedUser, platformRoles } from "@/lib/auth/guards";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createAuditLog } from "@/server/services/audit-log";

export type ClientChangeState = { error?: string; success?: string };

const schema = z.object({
  tenantId: z.string().trim().min(1).max(64),
  title: z.string().trim().min(3).max(160),
  detail: z.string().trim().min(3).max(4000),
  status: z.enum(["REVIEWING", "IN_PROGRESS", "DELIVERED"]),
  free: z.boolean(),
  priceLabel: z.string().trim().max(120).optional(),
});

/**
 * El equipo de Vase carga un cambio que un cliente pidió por otro medio (mail, WhatsApp, reunión).
 * Le aparece al cliente en "Trabajos a medida" con su paso, como si lo hubiera pedido desde el panel.
 */
export async function createClientChangeAction(_: ClientChangeState, formData: FormData): Promise<ClientChangeState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = schema.safeParse({
      tenantId: formData.get("tenantId"),
      title: formData.get("title"),
      detail: formData.get("detail"),
      status: formData.get("status"),
      free: formData.get("free") === "on",
      priceLabel: formData.get("priceLabel") ?? undefined,
    });
    if (!parsed.success) return { error: "Elegí el cliente y completá qué hay que cambiar." };

    const tenant = await prisma.tenant.findUnique({ where: { id: parsed.data.tenantId }, select: { id: true } });
    if (!tenant) return { error: "Ese cliente ya no existe." };

    const priceLabel = parsed.data.free ? "Sin cargo" : sanitizeNullableText(parsed.data.priceLabel ?? null);
    const created = await prisma.customPageRequest.create({
      data: {
        tenantId: tenant.id,
        requesterUserId: null,
        requestType: "TEMPLATE_CUSTOMIZATION",
        pageScope: sanitizeText(parsed.data.title),
        businessObjective: sanitizeText(parsed.data.detail),
        premiumRequested: !parsed.data.free,
        status: parsed.data.status,
        quotedPriceLabel: priceLabel,
        reviewNotes: "Cargado por el equipo de Vase.",
        reviewedAt: new Date(),
        reviewedByUserId: session.user.id,
      },
      select: { id: true },
    });

    await createAuditLog({
      action: "platform.custom_page_request_created_for_client",
      targetType: "custom_page_request",
      targetId: created.id,
      tenantId: tenant.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { status: parsed.data.status, free: parsed.data.free },
    });

    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/owner/customizations");
    return { success: "Listo. El cliente ya lo ve en Trabajos a medida." };
  } catch {
    return { error: "No pudimos cargar el cambio." };
  }
}
