"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { DATA_RESOURCES, EXTERNAL_SYSTEMS, SOURCE_PRODUCT } from "@/lib/business/data-sources";
import { rotateBusinessConnectionToken } from "@/server/services/business-connection";

export type DataSourceResult = { ok: boolean; message: string };

const MODULE_ID: Record<"business" | "management" | "rest", string> = {
  business: "vase_business",
  management: "vase_management",
  rest: "vase_rest",
};

const inputSchema = z.object({
  resource: z.enum(["CATALOG", "STOCK", "ORDERS", "CUSTOMERS"]),
  source: z.enum(["BUSINESS", "MANAGEMENT", "REST", "EXTERNAL"]),
  externalSystem: z.enum(EXTERNAL_SYSTEMS).optional(),
});

/**
 * Catálogo › "Conectar mi sistema": guarda de dónde sale una cosa (solo el Dueño).
 * Productos y precios también actualiza la fuente que ya usaba Business (tu sistema o Management).
 */
export async function setDataSourceAction(input: z.input<typeof inputSchema>): Promise<DataSourceResult> {
  try {
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Elegí una opción." };
    const { resource, source, externalSystem } = parsed.data;
    const tenantId = membership.tenantId;

    const definition = DATA_RESOURCES.find((item) => item.id === resource);
    if (!definition?.options.includes(source)) return { ok: false, message: "Eso no se puede elegir para esta parte." };

    if (source !== "EXTERNAL") {
      const product = SOURCE_PRODUCT[source];
      const access = await prisma.tenantModule.findUnique({
        where: { tenantId_moduleId: { tenantId, moduleId: MODULE_ID[product as keyof typeof MODULE_ID] } },
        select: { isActive: true },
      });
      if (!access?.isActive) return { ok: false, message: "Ese producto no lo tenés todavía." };
    }

    await prisma.tenantDataSource.upsert({
      where: { tenantId_resource: { tenantId, resource } },
      update: { source, externalSystem: source === "EXTERNAL" ? externalSystem ?? null : null },
      create: { tenantId, resource, source, externalSystem: source === "EXTERNAL" ? externalSystem ?? null : null },
    });

    // Business ya lee de dónde salen los productos en el contrato de Management: se mantiene igual.
    if (resource === "CATALOG" && (source === "EXTERNAL" || source === "MANAGEMENT")) {
      const contract = await prisma.tenantManagementContract.findUnique({ where: { tenantId }, select: { id: true } });
      if (contract) {
        await prisma.tenantManagementContract.update({
          where: { tenantId },
          data: { integrationProvider: source === "MANAGEMENT" ? "VASE_MANAGEMENT" : "EXTERNAL_API", provisioningStatus: "PENDING", lastSyncError: null },
        });
      }
    }

    revalidatePath("/app/catalogo");
    return { ok: true, message: "Guardado." };
  } catch {
    return { ok: false, message: "No pudimos guardarlo. Probá de nuevo." };
  }
}
