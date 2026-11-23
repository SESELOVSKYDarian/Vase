import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SupportKnowledgeAiPreviewForm } from "@/components/support/support-knowledge-ai-preview-form";
import { SupportKnowledgeManager } from "@/components/support/support-knowledge-manager";
import { PanelCard } from "@/components/ui/panel-card";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import {
  getSupportKnowledgeCategories,
  listSupportKnowledgeItems,
} from "@/server/queries/support-knowledge";

type AdminSupportKnowledgePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSupportKnowledgePage({
  searchParams,
}: AdminSupportKnowledgePageProps) {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const params = await searchParams;
  const tenantId = getStringParam(params.tenantId);
  const q = getStringParam(params.q);
  const category = getStringParam(params.category);

  const [items, categories, tenants, activeCount, globalCount] = await Promise.all([
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
    prisma.supportKnowledgeItem.count({
      where: {
        isActive: true,
      },
    }),
    prisma.supportKnowledgeItem.count({
      where: {
        tenantId: null,
      },
    }),
  ]);

  return (
    <AppShell title="Conocimiento de la IA" subtitle="Lo que sabe la IA para contestarles a los clientes" tenantLabel="Admin">
      <section className="vpa-kpis" aria-label="Resumen">
        <div className="vpa-kpi"><span className="vpa-kt"><small>Respuestas activas</small><b>{activeCount}</b><em>Las usa la IA ahora</em></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>Para todos los clientes</small><b>{globalCount}</b><em>Sin cliente asignado</em></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>En esta lista</small><b>{items.length}</b><em>Con el filtro actual</em></span></div>
      </section>

      <SupportKnowledgeManager
        items={items}
        categories={categories}
        tenants={tenants}
        currentPath="/support"
        currentQuery={q}
        currentCategory={category}
        currentTenantId={tenantId}
        allowTenantInput
        canDeleteGlobal
      />

      <PanelCard
        title="Probar a la IA"
        description="Hacele una pregunta y mirá qué contestaría con lo que sabe."
      >
        <SupportKnowledgeAiPreviewForm tenantId={tenantId} allowTenantInput />
      </PanelCard>
    </AppShell>
  );
}
