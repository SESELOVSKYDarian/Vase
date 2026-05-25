import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";

type AdminAuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  try {
    await requireAdminPermission(adminPermissions.AUDIT);
  } catch {
    forbidden();
  }

  const params = await searchParams;
  const q = getStringParam(params.q)?.trim();
  const action = getStringParam(params.action)?.trim();
  const targetType = getStringParam(params.targetType)?.trim();
  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (action) exportParams.set("action", action);
  if (targetType) exportParams.set("targetType", targetType);

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
      ...(q
        ? {
            OR: [
              { action: { contains: q } },
              { targetType: { contains: q } },
              { targetId: { contains: q } },
              { actorUser: { email: { contains: q } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      actorUser: {
        select: {
          name: true,
          email: true,
        },
      },
      tenant: {
        select: {
          accountName: true,
        },
      },
    },
    take: 150,
  });

  return (
    <AppShell
      title="Auditoría central"
      subtitle="Trazabilidad de acciones administrativas, seguridad, billing y operaciones."
      tenantLabel="Master Admin"
    >
      <PanelCard title="Filtros" description="Busca por acción, actor o entidad.">
        <form action="/app/admin/audit" className="grid gap-3 md:grid-cols-4">
          <input name="q" defaultValue={q ?? ""} placeholder="Buscar..." className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2" />
          <input name="action" defaultValue={action ?? ""} placeholder="Acción exacta" className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2" />
          <input name="targetType" defaultValue={targetType ?? ""} placeholder="Tipo de destino" className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2" />
          <button className="rounded-xl bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)]">Filtrar</button>
        </form>
        <div className="mt-3">
          <a
            href={`/api/admin/audit/export?${exportParams.toString()}`}
            className="inline-flex rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]"
          >
            Exportar CSV
          </a>
        </div>
      </PanelCard>

      <PanelCard title={`Eventos (${logs.length})`} description="Registro inmutable para control operativo.">
        <div className="grid gap-3">
          {logs.map((log) => (
            <article key={log.id} className="rounded-2xl border border-[var(--border-subtle)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">{log.action}</p>
              <p className="text-xs text-[var(--muted)]">
                {log.targetType} · {log.targetId ?? "sin target"} · {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Actor: {log.actorUser?.email ?? "sistema"} · Tenant: {log.tenant?.accountName ?? "global"}
              </p>
            </article>
          ))}
        </div>
      </PanelCard>
    </AppShell>
  );
}
