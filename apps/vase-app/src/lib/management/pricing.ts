type PriceVersion = { version: number; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; setupPrice: number; monthlyPrice: number };

export function selectPublishedManagementPricing(versions: PriceVersion[]) {
  return versions.filter((item) => item.status === "PUBLISHED").sort((a, b) => b.version - a.version)[0] ?? null;
}

export function resolveManagementContractPrice(
  published: { setupPrice: number; monthlyPrice: number },
  override?: { setupPrice: number; monthlyPrice: number; reason: string } | null,
) {
  if (!override) return { ...published, overridden: false };
  if (override.reason.trim().length < 8) throw new Error("OVERRIDE_REASON_REQUIRED");
  return { setupPrice: override.setupPrice, monthlyPrice: override.monthlyPrice, overridden: true };
}
