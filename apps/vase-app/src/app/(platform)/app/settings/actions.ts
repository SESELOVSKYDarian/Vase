"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

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
