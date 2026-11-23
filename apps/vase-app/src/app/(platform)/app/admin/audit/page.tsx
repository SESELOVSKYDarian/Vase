import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Download, Search } from "lucide-react";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";

type AdminAuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const authSecurityActions = [
  "auth.signin_failed",
  "auth.signin_succeeded",
  "auth.account_temporarily_locked",
] as const;

function toFriendlyAction(action: string) {
  switch (action) {
    case "auth.signin_failed":
      return "Intento de ingreso fallido";
    case "auth.signin_succeeded":
      return "Entró a su cuenta";
    case "auth.account_temporarily_locked":
      return "Cuenta frenada por intentos fallidos";
    case "admin.account_email_changed":
      return "Cambió el correo del admin";
    default:
      return action;
  }
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
  const eventGroup = getStringParam(params.eventGroup)?.trim();

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (action) exportParams.set("action", action);
  if (targetType) exportParams.set("targetType", targetType);
  if (eventGroup) exportParams.set("eventGroup", eventGroup);

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
      ...(eventGroup === "auth_security" ? { action: { in: [...authSecurityActions] } } : {}),
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

  const views = [
    { id: "", label: "Todo" },
    { id: "auth_security", label: "Ingresos y seguridad" },
  ];
  const viewHref = (id: string) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (id) next.set("eventGroup", id);
    const text = next.toString();
    return text ? `/audit?${text}` : "/audit";
  };
  const when = (value: Date) => new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(value);

  return (
    <AppShell title="Registro de cambios" subtitle="Quién hizo qué y cuándo" tenantLabel="Admin">
      <div className="vpa-filt">
        <form className="vpa-search" action="/audit" role="search">
          <Search size={16} aria-hidden="true" />
          <input className="vpa-inp" type="search" name="q" defaultValue={q ?? ""} placeholder="Buscar por acción, correo o dato" aria-label="Buscar en el registro" />
          {eventGroup ? <input type="hidden" name="eventGroup" value={eventGroup} /> : null}
        </form>
        <nav className="vpa-seg" aria-label="Filtrar registro">
          {views.map((item) => (
            <a key={item.id || "all"} href={viewHref(item.id)} className={(eventGroup ?? "") === item.id ? "on" : undefined} aria-current={(eventGroup ?? "") === item.id ? "page" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        <a href={`/api/admin/audit/export?${exportParams.toString()}`} className="vpa-btn line sm">
          <Download size={14} aria-hidden="true" />
          Bajar CSV
        </a>
      </div>

      <section className="vpa-card" style={{ padding: "12px 20px" }}>
        {logs.length === 0 ? (
          <div className="vpa-empty" style={{ margin: "8px 0" }}>No hay movimientos con este filtro.</div>
        ) : (
          <div className="vpa-tw">
            <table className="vpa-tbl">
              <thead>
                <tr>
                  <th>Qué pasó</th>
                  <th>Quién</th>
                  <th>Cuenta</th>
                  <th>Cuándo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="wrap">
                      <b>{toFriendlyAction(log.action)}</b>
                      <span className="sub">
                        {log.targetType}
                        {log.targetId ? ` · ${log.targetId}` : ""}
                      </span>
                    </td>
                    <td className="wrap">
                      {log.actorUser?.name ?? "Sistema"}
                      <span className="sub">{log.actorUser?.email ?? (log.ipAddress ? `IP ${log.ipAddress}` : "")}</span>
                    </td>
                    <td className="vpa-mut">{log.tenant?.accountName ?? "—"}</td>
                    <td className="vpa-mut">{when(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
