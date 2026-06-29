type ProvisionPlan = {
  plan: "START" | "PREMIUM";
  premiumEnabled: boolean;
};

export function normalizeCustomProjectSlug(input: string) {
  const normalized = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "sitio";
}

export function resolveCustomProjectSlug(accountName: string, existingSlugs: string[]) {
  const base = normalizeCustomProjectSlug(accountName);
  const taken = new Set(existingSlugs.map((item) => item.trim().toLowerCase()));
  if (!taken.has(base)) return base;

  let attempt = 2;
  while (taken.has(`${base}-${attempt}`)) {
    attempt += 1;
  }
  return `${base}-${attempt}`;
}

export function canAutoProvisionCustomProject(
  plan: ProvisionPlan,
  premiumRequested: boolean,
) {
  if (!premiumRequested) return false;
  return plan.plan === "PREMIUM" || plan.premiumEnabled;
}
