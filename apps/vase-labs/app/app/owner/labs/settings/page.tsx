import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsPageHeader, LabsSection, LabsStatusPill } from "../labs-ui";
import { IntegrationProviderCard } from "./integration-provider-card";

export const dynamic = "force-dynamic";

async function getSettingsData() {
  const requestHeaders = await headers();

  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const entitlement = await labsPrisma.labsEntitlement.findUnique({
      where: { globalTenantId: resolved.context.globalTenantId },
    });

    return {
      tenantName: resolved.context.tenantName,
      plan: entitlement?.plan ?? resolved.context.entitlement.plan,
      status: entitlement?.status ?? resolved.context.entitlement.status,
      enabledChannels: resolved.context.entitlement.enabledChannels,
      tokensIncluded: entitlement?.tokensIncluded ?? 0,
      extraTokens: entitlement?.extraTokens ?? 0,
      tokensUsed: entitlement?.tokensUsed ?? 0,
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Fsettings");
    }
    redirect("https://app.vase.ar/app");
  }
}

export default async function LabsSettingsPage() {
  const data = await getSettingsData();
  const availableTokens = Math.max(0, data.tokensIncluded + data.extraTokens - data.tokensUsed);

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Control operativo"
        title="Ajustes"
        description="Estado del workspace, plan, canales habilitados y capacidad de IA."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabsSection title="Tenant" description={data.tenantName}>
          <LabsStatusPill label={data.status} tone={data.status === "ACTIVE" ? "success" : "warning"} />
        </LabsSection>
        <LabsSection title="Plan" description={data.plan}>
          <p className="text-sm text-[var(--muted)]">{data.enabledChannels.length} canales habilitados</p>
        </LabsSection>
        <LabsSection title="Tokens disponibles">
          <p className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{availableTokens.toLocaleString("es-AR")}</p>
        </LabsSection>
        <LabsSection title="Tokens usados">
          <p className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{data.tokensUsed.toLocaleString("es-AR")}</p>
        </LabsSection>
      </section>
      <IntegrationProviderCard />
    </div>
  );
}
