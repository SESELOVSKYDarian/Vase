import Link from "next/link";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardSupportWidget } from "@/components/support/dashboard-support-widget";
import { PanelCard } from "@/components/ui/panel-card";
import { MetricCard } from "@/components/business/metric-card";
import { StatusBadge } from "@/components/business/status-badge";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getLabsPlanLabel } from "@/lib/labs/plans";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { getLabsOwnerDashboard } from "@/server/queries/labs";
import { getTenantSupportOverview, getTenantSupportWidgetContext } from "@/server/queries/support";

export default async function LabsPage() {
  let membership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [labsDashboard, rootDashboard, supportOverview, supportWidget] = await Promise.all([
    getLabsOwnerDashboard(membership.tenantId),
    getUnifiedTenantDashboard(membership.tenantId),
    getTenantSupportOverview(membership.tenantId),
    getTenantSupportWidgetContext(membership.tenantId),
  ]);

  if (!rootDashboard || !labsDashboard) {
    forbidden();
  }

  return (
    <AppShell
      title="Vase Labs"
      subtitle="Portada operativa del ecosistema de IA, chatbot y automatización dentro del panel general de Vase."
      tenantLabel={membership.tenant.name}
      modules={rootDashboard.modules}
      notifications={rootDashboard.notifications}
      supportWidget={
        <DashboardSupportWidget
          tenantName={membership.tenant.name}
          conversationOptions={supportWidget.conversationOptions}
          supportSummary={supportWidget.summary}
        />
      }
    >
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Conocimiento" value={labsDashboard.summary.knowledgeItems} note="FAQs, URLs y archivos cargados." />
        <MetricCard label="Canales conectados" value={labsDashboard.summary.connectedChannels} note="Canales activos para conversaciones." />
        <MetricCard label="Conversaciones abiertas" value={labsDashboard.summary.openConversations} note="Hilos aún operativos hoy." />
        <MetricCard label="Tickets activos" value={supportOverview.summary.active} note="Escalaciones humanas en seguimiento." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PanelCard
          eyebrow="Plan de Labs"
          title="Estado del workspace"
          description="Resumen del plan actual y del progreso de configuración del módulo de IA."
          actions={<StatusBadge tone="info" label={getLabsPlanLabel(labsDashboard.workspace.plan)} />}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Conocimiento cargado</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {labsDashboard.setupSteps.hasKnowledge ? "Listo" : "Pendiente"}
              </p>
            </div>
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Escalación humana</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {labsDashboard.setupSteps.hasEscalation ? "Activa" : "Pendiente"}
              </p>
            </div>
          </div>
        </PanelCard>

        <PanelCard
          eyebrow="Siguiente paso"
          title="Gestión avanzada"
          description="Abre el workspace completo de Labs para configurar IA, canales, jobs de entrenamiento y soporte."
        >
          <Link
            href="/app/owner/labs"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
          >
            Abrir gestión avanzada de Labs
          </Link>
        </PanelCard>
      </section>
    </AppShell>
  );
}
