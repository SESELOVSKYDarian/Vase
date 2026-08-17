import { normalizeManagementTenantSlug } from "@vase/auth";
import { normalizeVaseRedirectTarget } from "@/lib/auth/redirect-target";
import { redirect } from "next/navigation";

type ManagementEntryPageProps = {
  searchParams: Promise<{ tenant?: string | string[] }>;
};

function managementOrigin() {
  const fallback = "https://management.vase.ar";
  const normalized = normalizeVaseRedirectTarget(
    process.env.MANAGEMENT_PUBLIC_URL,
    { fallback },
  );

  try {
    return new URL(normalized).origin;
  } catch {
    return fallback;
  }
}

export default async function ManagementEntryPage({ searchParams }: ManagementEntryPageProps) {
  const tenant = (await searchParams).tenant;
  const tenantSlug = normalizeManagementTenantSlug(
    typeof tenant === "string" ? tenant : undefined,
  );
  const destination = new URL("/dashboard", managementOrigin());
  if (tenantSlug) destination.searchParams.set("tenant", tenantSlug);

  redirect(destination.toString());
}
