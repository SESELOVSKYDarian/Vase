import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SupportKnowledgeAiPreviewForm } from "@/components/support/support-knowledge-ai-preview-form";
import { SupportKnowledgeManager } from "@/components/support/support-knowledge-manager";
import { PanelCard } from "@/components/ui/panel-card";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { hasPlatformRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import {
  getSupportKnowledgeCategories,
  listSupportKnowledgeItems,
} from "@/server/queries/support-knowledge";

type SupportKnowledgePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SupportKnowledgePage({
  searchParams,
}: SupportKnowledgePageProps) {
  let session: Awaited<ReturnType<typeof requireVerifiedPlatformRole>>;

  try {
    session = await requireVerifiedPlatformRole(platformRoles.SUPPORT);
  } catch {
    forbidden();
  }

  const params = await searchParams;
  const tenantId = getStringParam(params.tenantId);
  const q = getStringParam(params.q);
  const category = getStringParam(params.category);
  const isMasterAdmin = hasPlatformRole(session.user.platformRole, platformRoles.SUPER_ADMIN);

  const [items, categories, tenants] = await Promise.all([
    listSupportKnowledgeItems({
      tenantId: tenantId || undefined,
      q: q || undefined,
      category: category || undefined,
      includeInactive: true,
    }),
    getSupportKnowledgeCategories(tenantId || undefined),
    prisma.tenant.findMany({
      select: {
        id: true,
        accountName: true,
        name: true,
      },
      orderBy: {
        accountName: "asc",
      },
      take: 200,
    }),
  ]);

  return (
    <AppShell
      title="Support Knowledge"
      subtitle="CMS operativo de FAQs para que soporte entrene la IA con respuestas verificadas, globales o por tenant, sin acoplarlas al chatbot."
      tenantLabel="Cobertura multi-tenant"
    >
      <SupportKnowledgeManager
        items={items}
        categories={categories}
        tenants={tenants}
        currentPath="/app/support/knowledge"
        currentQuery={q}
        currentCategory={category}
        currentTenantId={tenantId}
        allowTenantInput
        canDeleteGlobal={isMasterAdmin}
      />

      <PanelCard
        eyebrow="Prueba IA"
        title="Validar contexto antes de publicarlo"
        description="Simula una respuesta de soporte usando las FAQs encontradas para este tenant. Sirve para revisar tono, cobertura y huecos en la base."
      >
        <SupportKnowledgeAiPreviewForm tenantId={tenantId} allowTenantInput />
      </PanelCard>
    </AppShell>
  );
}
