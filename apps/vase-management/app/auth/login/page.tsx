import { normalizeManagementTenantSlug } from "@vase/auth";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: { tenant?: string | string[] };
};

const VASE_APP_PUBLIC_URL = process.env.VASE_APP_PUBLIC_URL || "https://app.vase.ar";

function managementDashboardUrl() {
  const fallback = new URL("https://management.vase.ar/dashboard");
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return fallback;

  try {
    const candidate = new URL(configured);
    const isLocalDevelopment = process.env.NODE_ENV !== "production"
      && candidate.protocol === "http:"
      && (candidate.hostname === "localhost" || candidate.hostname === "127.0.0.1");
    const isProductionVaseUrl = candidate.protocol === "https:"
      && (candidate.hostname === "vase.ar" || candidate.hostname.endsWith(".vase.ar"));

    if (candidate.username || candidate.password || (!isLocalDevelopment && !isProductionVaseUrl)) {
      return fallback;
    }

    return new URL("/dashboard", candidate.origin);
  } catch {
    return fallback;
  }
}

export default function LoginPage({ searchParams = {} }: LoginPageProps) {
  const rawTenant = Array.isArray(searchParams.tenant)
    ? searchParams.tenant[0]
    : searchParams.tenant;
  const tenantSlug = normalizeManagementTenantSlug(rawTenant);
  const returnUrl = managementDashboardUrl();
  if (tenantSlug) returnUrl.searchParams.set("tenant", tenantSlug);

  const signInUrl = new URL(
    "/signin",
    VASE_APP_PUBLIC_URL,
  );
  signInUrl.searchParams.set("redirectTo", returnUrl.toString());
  redirect(signInUrl.toString());
}
