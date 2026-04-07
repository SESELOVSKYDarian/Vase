import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getTenantOverview } from "@/server/queries/dashboard";

export default async function ManagerPage() {
  let membership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.MANAGER));
  } catch {
    forbidden();
  }

  const overview = await getTenantOverview(membership.tenantId);

  return (
    <AppShell
      title="Manager Workspace"
      subtitle="Operación diaria con foco en coordinación, visibilidad y procesos claros para equipos no técnicos."
      tenantLabel={membership.tenant.name}
    >
      <PanelCard
        title="Resumen operativo"
        description="El manager puede ver miembros, proyectos y flags activos sin acceder a privilegios de owner."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
            <p className="text-sm text-[var(--muted)]">Miembros</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{overview.members}</p>
          </div>
          <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
            <p className="text-sm text-[var(--muted)]">Proyectos</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{overview.projects}</p>
          </div>
          <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
            <p className="text-sm text-[var(--muted)]">Flags</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{overview.flags}</p>
          </div>
        </div>
      </PanelCard>
    </AppShell>
  );
}
