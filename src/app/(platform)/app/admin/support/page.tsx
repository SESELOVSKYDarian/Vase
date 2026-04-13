import Link from "next/link";
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
    <AppShell
      title="Admin Support Knowledge"
      subtitle="Gestion global de FAQs para soporte asistido por IA, con control de alcance por tenant, conocimiento compartido y revision operativa desde master admin."
      tenantLabel="Vision global de plataforma"
    >
      <section className="grid gap-6 md:grid-cols-3">
        <PanelCard title="FAQs activas" description="Base usable por IA en este momento.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {activeCount}
          </p>
        </PanelCard>
        <PanelCard title="FAQs globales" description="Disponibles para toda la plataforma.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {globalCount}
          </p>
        </PanelCard>
        <PanelCard
          title="Workspace soporte"
          description="Acceso directo al panel operativo del equipo humano."
          actions={
            <Link href="/app/support" className="text-sm font-semibold text-[var(--accent)]">
              Abrir soporte
            </Link>
          }
        >
          <p className="text-sm leading-7 text-[var(--muted)]">
            Desde aqui puedes definir conocimiento global y por cliente, y luego probar como lo usa la IA.
          </p>
        </PanelCard>
      </section>

      <SupportKnowledgeManager
        items={items}
        categories={categories}
        tenants={tenants}
        currentPath="/app/admin/support"
        currentQuery={q}
        currentCategory={category}
        currentTenantId={tenantId}
        allowTenantInput
        canDeleteGlobal
      />

      <PanelCard
        eyebrow="Prueba IA"
        title="Validacion de respuesta"
        description="Verifica que la IA use correctamente FAQs globales y del tenant antes de dar acceso al equipo."
      >
        <SupportKnowledgeAiPreviewForm tenantId={tenantId} allowTenantInput />
      </PanelCard>
    </AppShell>
  );
}
