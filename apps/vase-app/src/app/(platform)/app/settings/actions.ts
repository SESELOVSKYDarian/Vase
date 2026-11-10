"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { isVaseUploadUrl } from "@/lib/storage/vase-uploads";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function updateTenantBusinessDataAction(formData: FormData) {
  const { membership } = await requireTenantRole(tenantRoles.OWNER);

  const name = normalize(formData.get("name"));
  const accountName = normalize(formData.get("accountName"));
  const industry = normalize(formData.get("industry"));
  const billingEmail = normalize(formData.get("billingEmail"));
  const locale = normalize(formData.get("locale")) || "es";

  if (!name || !accountName || !industry) {
    return;
  }

  await prisma.tenant.update({
    where: { id: membership.tenantId },
    data: {
      name,
      accountName,
      industry,
      billingEmail: billingEmail || null,
      locale,
    },
  });

  revalidatePath("/app/settings");
  revalidatePath("/app");
  revalidatePath("/app/billing");
}

const MAX_PROFILE_NAME_LENGTH = 120;

export async function updateProfileNameAction(formData: FormData) {
  const { session } = await requireTenantRole(tenantRoles.MEMBER);
  const name = normalize(formData.get("name")).slice(0, MAX_PROFILE_NAME_LENGTH);

  if (!name) {
    return;
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  revalidatePath("/app", "layout");
}

/** Solo acepta fotos guardadas en uploads.vase.ar: nunca una dirección cualquiera. */
export async function saveAvatarAction(url: string): Promise<{ ok: boolean; message: string }> {
  const { session } = await requireTenantRole(tenantRoles.MEMBER);
  if (!isVaseUploadUrl(url)) {
    return { ok: false, message: "No pudimos guardar la foto." };
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: url } });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Foto guardada." };
}

export async function removeAvatarAction() {
  const { session } = await requireTenantRole(tenantRoles.MEMBER);
  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: null } });
  revalidatePath("/app", "layout");
}

export async function deleteTenantAccountAction() {
  const { membership, session } = await requireTenantRole(tenantRoles.OWNER);
  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    await tx.tenant.delete({
      where: { id: membership.tenantId },
    });

    const membershipsLeft = await tx.membership.count({
      where: { userId },
    });

    if (membershipsLeft === 0) {
      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    }
  });

  redirect("/signin?accountDeleted=1");
}
