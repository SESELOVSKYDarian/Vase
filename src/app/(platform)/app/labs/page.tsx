import Link from "next/link";
import type { Route } from "next";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";

export default async function LabsPage() {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const dashboard = await getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole);
  if (!dashboard) forbidden();
  if (!dashboard.modules.some((module) => module.key === "labs" && module.isActive)) {
    forbidden();
  }

  return (
    <AppShell
      title="Vase Labs"
      subtitle="Guia simple para crear tu chatbot y dejarlo activo."
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      projectCreation={dashboard.projectCreation}
    >
      <section className="grid gap-6 xl:grid-cols-3">
        <PanelCard eyebrow="Paso 1" title="Conecta un canal" description="Conecta WhatsApp o webchat para recibir mensajes.">
          <Link href={"/app/owner/labs/integrations" as Route} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]">
            Ir a integraciones
          </Link>
        </PanelCard>
        <PanelCard eyebrow="Paso 2" title="Carga conocimiento" description="Agrega FAQs, archivos o URLs para entrenar respuestas.">
          <Link href={"/app/owner/labs/chatbots" as Route} className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)]">
            Configurar contenido
          </Link>
        </PanelCard>
        <PanelCard eyebrow="Paso 3" title="Revisa resultados" description="Monitorea conversaciones y rendimiento en Labs.">
          <Link href={"/app/owner/labs/activity" as Route} className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)]">
            Ver analiticas
          </Link>
        </PanelCard>
      </section>
    </AppShell>
  );
}
