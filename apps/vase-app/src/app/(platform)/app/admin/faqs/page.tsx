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
    <AppShell title="Respuestas guardadas" subtitle="Preguntas frecuentes que valen para todos los clientes" tenantLabel="Admin">
      <section className="vpa-kpis" aria-label="Resumen">
        <div className="vpa-kpi"><span className="vpa-kt"><small>Cargadas</small><b>{total}</b></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>Activas</small><b>{active}</b><em>Se muestran y las usa la IA</em></span></div>
      </section>

      <PanelCard title="Preguntas y respuestas" description="Agregá, editá o apagá una respuesta.">
        <AdminFaqEditor items={items.filter((item) => item.tenantId === null)} />
      </PanelCard>
    </AppShell>
  );
}
