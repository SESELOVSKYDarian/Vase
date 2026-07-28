import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { OnboardingWorkspace } from "./onboarding-workspace";

export default async function RestOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const requestHeaders = await headers();
  const { tenant } = await searchParams;
  try {
    const context = await resolveRestOwnerRequest({
      cookieHeader: requestHeaders.get("cookie"),
      requestedTenantSlug: tenant,
    });
    return <OnboardingWorkspace tenantSlug={context.tenantSlug} tenantName={context.tenantName} />;
  } catch (error) {
    if (error instanceof Error && error.message.includes("SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=https%3A%2F%2Frest.vase.ar%2Fonboarding");
    }
    throw error;
  }
}
