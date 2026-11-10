"use server";

import { revalidatePath } from "next/cache";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { BUSINESS_PROFILE_FIELDS, MAX_BRANCHES, branchSchema, businessProfileSchema } from "@/lib/business/business-profile";
import { prisma } from "@/lib/db/prisma";
import { sanitizeText } from "@/lib/security/sanitize";
import { isVaseUploadUrl } from "@/lib/storage/vase-uploads";
import { socialColumns, socialLinksSchema } from "@/lib/business/social-links";
import { createAuditLog } from "@/server/services/audit-log";

export type BusinessActionResult = { ok: boolean; message: string };

function refresh() {
  revalidatePath("/app", "layout");
}

async function requireOwner() {
  return requireTenantRole(tenantRoles.OWNER);
}

export async function updateBusinessProfileAction(
  _: BusinessActionResult | null,
  formData: FormData,
): Promise<BusinessActionResult> {
  try {
    const { session, membership } = await requireOwner();
    const raw = Object.fromEntries(BUSINESS_PROFILE_FIELDS.map((field) => [field, sanitizeText(String(formData.get(field) ?? ""))]));
    const parsed = businessProfileSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisá los datos." };
    }
    let rawLinks: unknown = [];
    try {
      rawLinks = JSON.parse(String(formData.get("socialLinks") ?? "[]"));
    } catch {
      return { ok: false, message: "Revisá el link de tus redes." };
    }
    const links = socialLinksSchema((value) => isVaseUploadUrl(value)).safeParse(rawLinks);
    if (!links.success) {
      return { ok: false, message: links.error.issues[0]?.message ?? "Revisá el link de tus redes." };
    }

    const { name, industry, legalName, taxId, taxCondition, fiscalAddress, city, province, postalCode, ...rest } = parsed.data;
    const contact = { ...rest, ...socialColumns(links.data), socialLinks: links.data };
    const tenantId = membership.tenantId;
    await prisma.$transaction([
      prisma.tenant.update({ where: { id: tenantId }, data: { name, industry } }),
      prisma.tenantBusinessInfo.upsert({
        where: { tenantId },
        update: contact,
        create: { tenantId, ...contact },
      }),
      prisma.tenantBillingProfile.upsert({
        where: { tenantId },
        update: { legalName, taxId, taxCondition, fiscalAddress, city, province, postalCode },
        create: { tenantId, legalName, taxId, taxCondition, fiscalAddress, city, province, postalCode },
      }),
    ]);
    await createAuditLog({
      action: "tenant.business_profile_updated",
      targetType: "tenant",
      targetId: tenantId,
      tenantId,
      actorUserId: session.user.id,
    });
    refresh();
    return { ok: true, message: "Guardado." };
  } catch {
    return { ok: false, message: "No pudimos guardar. Probá de nuevo." };
  }
}

export async function saveBusinessLogoAction(url: string | null): Promise<BusinessActionResult> {
  try {
    const { membership } = await requireOwner();
    if (url !== null && !isVaseUploadUrl(url)) return { ok: false, message: "No pudimos guardar el logo." };
    await prisma.tenantBusinessInfo.upsert({
      where: { tenantId: membership.tenantId },
      update: { logoUrl: url },
      create: { tenantId: membership.tenantId, logoUrl: url },
    });
    refresh();
    return { ok: true, message: "Logo guardado." };
  } catch {
    return { ok: false, message: "No pudimos guardar el logo." };
  }
}

export async function saveBranchAction(input: {
  id?: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  isMain: boolean;
}): Promise<BusinessActionResult> {
  try {
    const { membership } = await requireOwner();
    const tenantId = membership.tenantId;
    const parsed = branchSchema.safeParse({
      ...input,
      name: sanitizeText(String(input.name ?? "")),
      address: sanitizeText(String(input.address ?? "")),
      phone: sanitizeText(String(input.phone ?? "")),
      hours: sanitizeText(String(input.hours ?? "")),
      isMain: Boolean(input.isMain),
    });
    if (!parsed.success) return { ok: false, message: "Completá nombre y dirección." };
    const { id, ...data } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const count = await tx.tenantBranch.count({ where: { tenantId } });
      const isFirst = count === 0;
      const isMain = data.isMain || isFirst;
      if (isMain) {
        await tx.tenantBranch.updateMany({ where: { tenantId, isMain: true }, data: { isMain: false } });
      }
      if (id) {
        const updated = await tx.tenantBranch.updateMany({ where: { id, tenantId }, data: { ...data, isMain } });
        if (updated.count !== 1) throw new Error("BRANCH_NOT_FOUND");
      } else {
        if (count >= MAX_BRANCHES) throw new Error("TOO_MANY_BRANCHES");
        await tx.tenantBranch.create({ data: { tenantId, ...data, isMain, sortOrder: count } });
      }
    });
    refresh();
    return { ok: true, message: "Sucursal guardada." };
  } catch (error) {
    if (error instanceof Error && error.message === "TOO_MANY_BRANCHES") {
      return { ok: false, message: `Podés cargar hasta ${MAX_BRANCHES} sucursales.` };
    }
    return { ok: false, message: "No pudimos guardar la sucursal." };
  }
}

export async function deleteBranchAction(id: string): Promise<BusinessActionResult> {
  try {
    const { membership } = await requireOwner();
    const tenantId = membership.tenantId;
    await prisma.$transaction(async (tx) => {
      const branch = await tx.tenantBranch.findFirst({ where: { id, tenantId }, select: { isMain: true } });
      if (!branch) throw new Error("BRANCH_NOT_FOUND");
      await tx.tenantBranch.delete({ where: { id } });
      if (branch.isMain) {
        const next = await tx.tenantBranch.findFirst({ where: { tenantId }, orderBy: { sortOrder: "asc" }, select: { id: true } });
        if (next) await tx.tenantBranch.update({ where: { id: next.id }, data: { isMain: true } });
      }
    });
    refresh();
    return { ok: true, message: "Sucursal eliminada." };
  } catch {
    return { ok: false, message: "No pudimos eliminar la sucursal." };
  }
}
