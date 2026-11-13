"use server";

import { revalidatePath } from "next/cache";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { BUSINESS_PROFILE_FIELDS, businessProfileSchema } from "@/lib/business/business-profile";
import { prisma } from "@/lib/db/prisma";
import { sanitizeText } from "@/lib/security/sanitize";
import { isVaseUploadUrl } from "@/lib/storage/vase-uploads";
import { socialColumns, socialLinksSchema } from "@/lib/business/social-links";
import { createAuditLog } from "@/server/services/audit-log";
import { notifyBusinessProfileChanged } from "@/server/services/business-profile";
import { deleteBusinessBranch, saveBusinessBranch, type BranchInput } from "@/server/services/business-profile-edit";

export type BusinessActionResult = { ok: boolean; message: string };

function refresh(tenantId: string) {
  revalidatePath("/app", "layout");
  notifyBusinessProfileChanged(tenantId);
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
    refresh(tenantId);
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
    refresh(membership.tenantId);
    return { ok: true, message: "Logo guardado." };
  } catch {
    return { ok: false, message: "No pudimos guardar el logo." };
  }
}

export async function saveBranchAction(input: BranchInput): Promise<BusinessActionResult> {
  try {
    const { membership } = await requireOwner();
    const result = await saveBusinessBranch(membership.tenantId, input);
    if (result.ok) refresh(membership.tenantId);
    return result;
  } catch {
    return { ok: false, message: "No pudimos guardar la sucursal." };
  }
}

export async function deleteBranchAction(id: string): Promise<BusinessActionResult> {
  try {
    const { membership } = await requireOwner();
    const result = await deleteBusinessBranch(membership.tenantId, id);
    if (result.ok) refresh(membership.tenantId);
    return result.ok ? result : { ok: false, message: "No pudimos eliminar la sucursal." };
  } catch {
    return { ok: false, message: "No pudimos eliminar la sucursal." };
  }
}
