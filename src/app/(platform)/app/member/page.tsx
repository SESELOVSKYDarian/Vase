import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";

export default async function MemberPage() {
  let membership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.MEMBER));
  } catch {
    forbidden();
  }

  return (
    <AppShell
      title="Member Workspace"
      subtitle="Una experiencia limpia y enfocada para ejecutar tareas sin exponer controles sensibles."
      tenantLabel={membership.tenant.name}
    >
      <PanelCard
        title="Workspace esencial"
        description="Este panel está deliberadamente simplificado para cumplir mínimo privilegio y reducir errores operativos."
      >
        <ul className="grid gap-4 text-sm leading-7 text-[var(--muted)] md:grid-cols-3">
          <li className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">Acceso a funciones asignadas por el tenant.</li>
          <li className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">Ninguna autorización crítica depende del frontend.</li>
          <li className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">Preparado para extender tareas, archivos y flujos.</li>
        </ul>
      </PanelCard>
    </AppShell>
  );
}
