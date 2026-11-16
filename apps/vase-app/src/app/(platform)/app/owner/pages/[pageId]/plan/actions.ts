"use server";

// Acciones de "Tu plan": hacer una copia ahora y restablecer la web a la última copia.
import { revalidatePath } from "next/cache";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { createBusinessBackup, restoreBusinessBackup } from "@/server/services/business-storage";

export type BackupActionState = { ok: boolean; message: string };

const PROBLEMS: Record<string, string> = {
  backup_in_progress: "Ya hay una copia en curso. Probá de nuevo en unos minutos.",
  restore_disabled: "Restablecer todavía no está habilitado para tu cuenta. Escribinos y lo hacemos con vos.",
  backup_not_found: "Esa copia ya no existe. Recargá la página.",
  store_not_found: "Tu web todavía no tiene contenido para copiar.",
};

const explain = (error: unknown) =>
  PROBLEMS[error instanceof Error ? error.message : ""] ?? "No se pudo completar. Probá de nuevo en un rato.";

async function ownerTenantId() {
  const { membership } = await requireTenantRole(tenantRoles.OWNER);
  return membership.tenantId;
}

export async function createBackupAction(_previous: BackupActionState, formData: FormData): Promise<BackupActionState> {
  try {
    const tenantId = await ownerTenantId();
    await createBusinessBackup(tenantId);
    revalidatePath(`/app/owner/pages/${String(formData.get("pageId") ?? "")}/plan`);
    return { ok: true, message: "Copia guardada." };
  } catch (error) {
    return { ok: false, message: explain(error) };
  }
}

export async function restoreBackupAction(_previous: BackupActionState, formData: FormData): Promise<BackupActionState> {
  try {
    const tenantId = await ownerTenantId();
    const backupId = String(formData.get("backupId") ?? "");
    if (!backupId) return { ok: false, message: PROBLEMS.backup_not_found };
    await restoreBusinessBackup(tenantId, backupId);
    revalidatePath(`/app/owner/pages/${String(formData.get("pageId") ?? "")}/plan`);
    return { ok: true, message: "Listo: tu web volvió a como estaba en esa copia." };
  } catch (error) {
    return { ok: false, message: explain(error) };
  }
}
