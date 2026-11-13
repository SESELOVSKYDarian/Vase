"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export type ProductSource = "EXTERNAL_API" | "VASE_MANAGEMENT";
export type ProductSourceResult = { ok: boolean; message: string; source?: ProductSource };

const sourceSchema = z.enum(["EXTERNAL_API", "VASE_MANAGEMENT"]);

// De dónde salen productos, precios y stock: el sistema de gestión del cliente o Vase Management.
// Mismas reglas que /api/internal/management/provider, que es lo que antes usaba Business.
export async function setProductSourceAction(source: ProductSource): Promise<ProductSourceResult> {
  try {
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = sourceSchema.safeParse(source);
    if (!parsed.success) return { ok: false, message: "Elegí una opción." };
    const tenantId = membership.tenantId;

    if (parsed.data === "VASE_MANAGEMENT") {
      const moduleAccess = await prisma.tenantModule.findUnique({
        where: { tenantId_moduleId: { tenantId, moduleId: "vase_management" } },
      });
      if (!moduleAccess?.isActive) return { ok: false, message: "Para usar Vase Management primero tenés que contratarlo." };
    }

    const contract = await prisma.tenantManagementContract.findUnique({ where: { tenantId }, select: { id: true } });
    if (!contract) {
      // Sin contrato de Management solo existe tu sistema de gestión, que ya es lo que se usa.
      if (parsed.data === "EXTERNAL_API") return { ok: true, message: "Listo.", source: "EXTERNAL_API" };
      return { ok: false, message: "Para usar Vase Management primero tenés que contratarlo." };
    }

    const updated = await prisma.tenantManagementContract.update({
      where: { tenantId },
      data: { integrationProvider: parsed.data, provisioningStatus: "PENDING", lastSyncError: null },
    });
    revalidatePath("/app/settings");
    return {
      ok: true,
      message: "Listo. Vase acomoda los datos, puede tardar unos minutos.",
      source: updated.integrationProvider as ProductSource,
    };
  } catch {
    return { ok: false, message: "No pudimos cambiarlo. Probá de nuevo." };
  }
}
