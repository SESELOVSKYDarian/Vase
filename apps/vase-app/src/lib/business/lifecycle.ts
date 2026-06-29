import type { StorefrontPage } from "@prisma/client";

export function calculateTemporaryLifecycle(now = new Date()) {
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const graceEndsAt = new Date(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  return { expiresAt, graceEndsAt };
}

export function deriveStorefrontLifecycle(
  page: Pick<StorefrontPage, "isTemporary" | "expiresAt" | "graceEndsAt">,
  now = new Date(),
) {
  if (!page.isTemporary || !page.expiresAt || !page.graceEndsAt) {
    return {
      phase: "stable" as const,
      shouldDelete: false,
      label: "Sin vencimiento automatico",
    };
  }

  if (now > page.graceEndsAt) {
    return {
      phase: "delete" as const,
      shouldDelete: true,
      label: "Debe eliminarse por vencimiento",
    };
  }

  if (now > page.expiresAt) {
    return {
      phase: "grace" as const,
      shouldDelete: false,
      label: "En gracia de 7 dias",
    };
  }

  return {
    phase: "active" as const,
    shouldDelete: false,
    label: "Activa por 30 dias",
  };
}
