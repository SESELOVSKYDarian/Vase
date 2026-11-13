import { z } from "zod";
import { MAX_BRANCHES, branchSchema, businessProfileSchema } from "@/lib/business/business-profile";
import { prisma } from "@/lib/db/prisma";
import { sanitizeText } from "@/lib/security/sanitize";

// Cambios de Mi negocio que se pueden hacer desde cualquier producto (app o Labs).
// Siempre atados a un tenant: nunca se toca una sucursal de otro.

export type BusinessEditResult = { ok: true; message: string } | { ok: false; message: string };

export class BusinessEditError extends Error {}

/** Contacto y horario general: lo que más cambia desde los productos. */
export const contactSchema = businessProfileSchema.pick({ tagline: true, phone: true, whatsapp: true, email: true, website: true, hours: true });
export const CONTACT_FIELDS = Object.keys(contactSchema.shape) as Array<keyof z.input<typeof contactSchema>>;

export async function updateBusinessContact(tenantId: string, input: Record<string, unknown>): Promise<BusinessEditResult> {
  const raw = Object.fromEntries(CONTACT_FIELDS.map((field) => [field, sanitizeText(String(input[field] ?? ""))]));
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  await prisma.tenantBusinessInfo.upsert({
    where: { tenantId },
    update: parsed.data,
    create: { tenantId, ...parsed.data },
  });
  return { ok: true, message: "Guardado." };
}

export type BranchInput = { id?: string; name: string; address: string; phone: string; hours: string; isMain: boolean };

export async function saveBusinessBranch(tenantId: string, input: BranchInput): Promise<BusinessEditResult> {
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

  try {
    await prisma.$transaction(async (tx) => {
      const count = await tx.tenantBranch.count({ where: { tenantId } });
      const isMain = data.isMain || count === 0;
      if (isMain) {
        await tx.tenantBranch.updateMany({ where: { tenantId, isMain: true }, data: { isMain: false } });
      }
      if (id) {
        const updated = await tx.tenantBranch.updateMany({ where: { id, tenantId }, data: { ...data, isMain } });
        if (updated.count !== 1) throw new BusinessEditError("BRANCH_NOT_FOUND");
      } else {
        if (count >= MAX_BRANCHES) throw new BusinessEditError("TOO_MANY_BRANCHES");
        await tx.tenantBranch.create({ data: { tenantId, ...data, isMain, sortOrder: count } });
      }
    });
  } catch (error) {
    if (error instanceof BusinessEditError && error.message === "TOO_MANY_BRANCHES") {
      return { ok: false, message: `Podés cargar hasta ${MAX_BRANCHES} sucursales.` };
    }
    if (error instanceof BusinessEditError) return { ok: false, message: "Esa sucursal ya no existe." };
    throw error;
  }
  return { ok: true, message: "Sucursal guardada." };
}

export async function deleteBusinessBranch(tenantId: string, id: string): Promise<BusinessEditResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const branch = await tx.tenantBranch.findFirst({ where: { id, tenantId }, select: { isMain: true } });
      if (!branch) throw new BusinessEditError("BRANCH_NOT_FOUND");
      await tx.tenantBranch.delete({ where: { id } });
      if (branch.isMain) {
        const next = await tx.tenantBranch.findFirst({ where: { tenantId }, orderBy: { sortOrder: "asc" }, select: { id: true } });
        if (next) await tx.tenantBranch.update({ where: { id: next.id }, data: { isMain: true } });
      }
    });
  } catch (error) {
    if (error instanceof BusinessEditError) return { ok: false, message: "Esa sucursal ya no existe." };
    throw error;
  }
  return { ok: true, message: "Sucursal eliminada." };
}
