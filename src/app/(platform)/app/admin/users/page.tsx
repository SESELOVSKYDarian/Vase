import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminAccessPolicyForm } from "@/components/admin/admin-access-policy-form";
import { AdminUserGovernanceForm } from "@/components/admin/admin-user-governance-form";
import { AdminUserTenantAccessForm } from "@/components/admin/admin-user-tenant-access-form";
import { PanelCard } from "@/components/ui/panel-card";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import {
  buildTenantModuleAccessSummary,
  userAccessModuleIds,
} from "@/lib/admin/user-access";
import { prisma } from "@/lib/db/prisma";

type AdminUsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function hasActiveModule(
  modules: Array<{ moduleId: string; isActive: boolean }>,
  moduleId: string,
) {
  return modules.some((module) => module.moduleId === moduleId && module.isActive);
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const params = await searchParams;
  const q = getStringParam(params.q)?.trim();
  const role = getStringParam(params.role);

  const [users, tenants] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
              ],
            }
          : {}),
        ...(role ? { platformRole: role as "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" | "USER" } : {}),
      },
      include: {
        adminAccessPolicy: true,
        internalProfile: true,
        memberships: {
          orderBy: { createdAt: "desc" },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                accountName: true,
                tenantModules: {
                  select: {
                    moduleId: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ platformRole: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        accountName: true,
      },
      orderBy: { accountName: "asc" },
      take: 300,
    }),
  ]);

  const activeMemberships = users.reduce(
    (total, user) => total + user.memberships.filter((membership) => membership.status === "ACTIVE").length,
    0,
  );
  const labsTenants = new Set(
    users.flatMap((user) =>
      user.memberships
        .filter((membership) =>
          hasActiveModule(membership.tenant.tenantModules, userAccessModuleIds.labs),
        )
        .map((membership) => membership.tenantId),
    ),
  );

  return (
    <AppShell
      title="Usuarios"
      subtitle="Gestion de roles, tenants y acceso a Vase Business o Vase Labs desde el control master."
      tenantLabel="Admin Master"
    >
      <section className="grid gap-4 md:grid-cols-3">
        <PanelCard title="Usuarios" description="Total listado con los filtros actuales.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">{users.length}</p>
        </PanelCard>
        <PanelCard title="Memberships activos" description="Relaciones usuario-tenant con acceso operativo.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">{activeMemberships}</p>
        </PanelCard>
        <PanelCard title="Tenants con Labs" description="Clientes con modulo Vase Labs activo.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">{labsTenants.size}</p>
        </PanelCard>
      </section>

      <PanelCard title="Filtros" description="Busca usuarios por nombre, email o rol de plataforma.">
        <form action="/app/admin/users" className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre o email..."
            className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
          />
          <select
            name="role"
            defaultValue={role ?? ""}
            className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
          >
            <option value="">Todos los roles</option>
            <option value="USER">User</option>
            <option value="SUPPORT">Support</option>
            <option value="DEVELOPER">Developer</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)]">
            Aplicar
          </button>
        </form>
      </PanelCard>

      <PanelCard
        title="Asignacion rapida"
        description="Selecciona un usuario, tenant, rol y modulos. Labs se activa por tenant."
      >
        {users.length === 0 || tenants.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Necesitas al menos un usuario y un tenant para asignar acceso.</p>
        ) : (
          <div className="grid gap-4">
            {users.slice(0, 8).map((user) => (
              <div key={user.id} className="grid gap-2">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {user.name} <span className="font-normal text-[var(--muted)]">{user.email}</span>
                </p>
                <AdminUserTenantAccessForm userId={user.id} tenants={tenants} title="Asignar tenant y modulos" />
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard title="Usuarios registrados" description="Roles de plataforma, permisos y acceso por tenant.">
        <div className="grid gap-5">
          {users.map((user) => (
            <article
              key={user.id}
              className="grid gap-4 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]/75 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                    {user.platformRole}
                  </p>
                  <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{user.name}</h2>
                  <p className="text-sm text-[var(--muted)]">{user.email}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Estado: {user.isDisabled ? "Deshabilitado" : "Activo"}
                    {user.internalProfile ? ` - Perfil interno: ${user.internalProfile.type}` : ""}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
                  Tenants: {user.memberships.length}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <div className="grid gap-3">
                  <AdminUserGovernanceForm userId={user.id} platformRole={user.platformRole} />
                  <AdminAccessPolicyForm userId={user.id} policy={user.adminAccessPolicy} />
                </div>

                <div className="grid gap-3">
                  <AdminUserTenantAccessForm
                    userId={user.id}
                    tenants={tenants}
                    title="Agregar acceso a tenant"
                  />

                  {user.memberships.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--muted)]">
                      Este usuario todavia no tiene tenants asignados.
                    </p>
                  ) : (
                    user.memberships.map((membership) => {
                      const modules = membership.tenant.tenantModules;
                      return (
                        <div key={membership.id} className="grid gap-3 rounded-2xl bg-[var(--surface)] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--foreground)]">
                                {membership.tenant.accountName}
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                Rol: {membership.role} - Estado: {membership.status}
                              </p>
                            </div>
                            <p className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs text-[var(--muted)]">
                              {buildTenantModuleAccessSummary(modules)}
                            </p>
                          </div>
                          <AdminUserTenantAccessForm
                            userId={user.id}
                            tenants={tenants}
                            defaultTenantId={membership.tenantId}
                            defaultRole={membership.role}
                            defaultStatus={membership.status}
                            businessAccess={hasActiveModule(modules, userAccessModuleIds.business)}
                            labsAccess={hasActiveModule(modules, userAccessModuleIds.labs)}
                            title="Editar acceso existente"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </PanelCard>
    </AppShell>
  );
}
