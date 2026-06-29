import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminFaqEditor } from "@/components/admin/admin-faq-editor";
import { PanelCard } from "@/components/ui/panel-card";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { listSupportKnowledgeItems } from "@/server/queries/support-knowledge";

type AdminFaqPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminFaqPage({ searchParams }: AdminFaqPageProps) {
  try {
    await requireAdminPermission(adminPermissions.FAQS);
  } catch {
    forbidden();
  }

  const params = await searchParams;
  const q = getStringParam(params.q);
  const category = getStringParam(params.category);

  const [items, total, active] = await Promise.all([
    listSupportKnowledgeItems({ q: q || undefined, category: category || undefined, includeInactive: true }),
    prisma.supportKnowledgeItem.count({ where: { tenantId: null } }),
    prisma.supportKnowledgeItem.count({ where: { tenantId: null, isActive: true } }),
  ]);

  return (
    <AppShell
      title="FAQs de plataforma"
      subtitle="Gestiona preguntas frecuentes globales para soporte y base de conocimiento."
      tenantLabel="Master Admin"
    >
      <section className="grid gap-6 md:grid-cols-2">
        <PanelCard title="FAQs globales" description="Total de entradas cargadas.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">{total}</p>
        </PanelCard>
        <PanelCard title="FAQs activas" description="Entradas visibles para asistencia.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">{active}</p>
        </PanelCard>
      </section>

      <PanelCard title="Editor avanzado FAQ" description="Crea, edita y elimina FAQs globales en una sola vista.">
        <AdminFaqEditor items={items.filter((item) => item.tenantId === null)} />
      </PanelCard>
    </AppShell>
  );
}
