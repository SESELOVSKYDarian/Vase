"use server";

// Revisar un pedido de personalización.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText } from "@/lib/security/sanitize";
import { reviewCustomizationRequestSchema } from "@/lib/validators/builder";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminReviewActionState } from "./shared";

export async function reviewCustomizationRequestAction(
  _: AdminReviewActionState,
  formData: FormData,
): Promise<AdminReviewActionState> {
  try {
    const requestContext = await getRequestContext();
    const verifiedSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = reviewCustomizationRequestSchema.safeParse({
      requestId: formData.get("requestId"),
      status: formData.get("status"),
      quotedPriceLabel: formData.get("quotedPriceLabel"),
      reviewNotes: formData.get("reviewNotes"),
    });

    if (!parsed.success) {
      return {
        error: "Revisa estado, cotizacion y notas antes de guardar.",
      };
    }

    const request = await prisma.customPageRequest.findUnique({
      where: { id: parsed.data.requestId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!request) {
      return {
        error: "La solicitud ya no existe.",
      };
    }

    await prisma.customPageRequest.update({
      where: { id: request.id },
      data: {
        status: parsed.data.status,
        quotedPriceLabel: sanitizeNullableText(parsed.data.quotedPriceLabel),
        reviewNotes: sanitizeNullableText(parsed.data.reviewNotes),
        reviewedAt: new Date(),
        reviewedByUserId: verifiedSession.user.id,
      },
    });

    await createAuditLog({
      action: "platform.custom_page_request_reviewed",
      targetType: "custom_page_request",
      targetId: request.id,
      tenantId: request.tenantId,
      actorUserId: verifiedSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        status: parsed.data.status,
      },
    });

    revalidatePath("/app/admin");
    return {
      success: "Solicitud actualizada correctamente.",
    };
  } catch {
    return {
      error: "No pudimos guardar la revision administrativa.",
    };
  }
}
