import type { Route } from "next";
import { forbidden } from "next/navigation";
import Link from "next/link";
import { CalendarDays, FileText, LifeBuoy, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getMasterV2Dashboard } from "@/server/queries/v2-dashboards";

const money = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);

const time = (value: Date) =>
  new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(value);

const PRODUCT_NAMES: Record<string, string> = { BUSINESS: "Business", LABS: "Labs", MANAGEMENT: "Management", REST: "Rest" };

const STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Al día", cls: "g" },
  TRIAL: { label: "En prueba", cls: "y" },
  PAST_DUE: { label: "Vencido", cls: "r" },
  CANCELED: { label: "Cancelado", cls: "" },
};

/** Inicio del Admin: cómo está Vase hoy y lo que necesita tu ok, con atajos a cada sección. */
export default async function AdminPage() {
  let session;
  try {
    session = await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [dashboard, unpaid, activeTenants, newTenants, quotesWaiting, nextMeeting, recentTenants] = await Promise.all([
    getMasterV2Dashboard(),
    prisma.clientPayment.findMany({
      where: { paidAt: null, status: { not: "CANCELED" } },
      select: { tenantId: true, totalAmount: true, paidAmount: true, dueAt: true },
    }),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.tenant.count({ where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
    prisma.customQuote.count({ where: { status: "PENDING_CLIENT" } }),
    prisma.customProjectMeetingBooking.findFirst({
      where: { scheduledStart: { gte: now, lt: todayEnd }, status: "SCHEDULED" },
      orderBy: { scheduledStart: "asc" },
      select: { scheduledStart: true, tenant: { select: { name: true } } },
    }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        industry: true,
        subscription: { select: { billingStatus: true } },
        tenantModules: { where: { isActive: true }, select: { module: { select: { product: true } } } },
      },
    }),
  ]);

  const owed = unpaid.reduce((sum, row) => sum + Math.max(0, Number(row.totalAmount) - Number(row.paidAmount)), 0);
  const owingTenants = new Set(unpaid.map((row) => row.tenantId)).size;
  const overdue = unpaid.filter((row) => row.dueAt && row.dueAt < now);
  const overdueAmount = overdue.reduce((sum, row) => sum + Math.max(0, Number(row.totalAmount) - Number(row.paidAmount)), 0);
  const oldestOverdueDays = overdue.length
    ? Math.max(...overdue.map((row) => Math.floor((now.getTime() - (row.dueAt as Date).getTime()) / 86_400_000)))
    : 0;

  const todo = [
    dashboard.support.criticos > 0
      ? {
          key: "tickets",
          icon: <LifeBuoy size={18} />,
          tone: "r",
          title: `${dashboard.support.criticos} ${dashboard.support.criticos === 1 ? "ticket urgente" : "tickets urgentes"} sin resolver`,
          text: `${dashboard.support.abiertos} abiertos en total`,
          href: "/tickets",
          cta: "Ver",
        }
      : null,
    overdue.length > 0
      ? {
          key: "cobros",
          icon: <Wallet size={18} />,
          tone: "y",
          title: `${overdue.length} ${overdue.length === 1 ? "cobro vencido" : "cobros vencidos"}`,
          text: `${money(overdueAmount)} en total · el más viejo hace ${oldestOverdueDays} ${oldestOverdueDays === 1 ? "día" : "días"}`,
          href: "/finance",
          cta: "Cobrar",
        }
      : null,
    quotesWaiting > 0
      ? {
          key: "presupuestos",
          icon: <FileText size={18} />,
          tone: "b",
          title: `${quotesWaiting} ${quotesWaiting === 1 ? "presupuesto esperando" : "presupuestos esperando"} respuesta`,
          text: "Los mandaste y el cliente todavía no contestó",
          href: "/customizations",
          cta: "Abrir",
        }
      : null,
    nextMeeting
      ? {
          key: "reunion",
          icon: <CalendarDays size={18} />,
          tone: "g",
          title: `Reunión ${time(nextMeeting.scheduledStart)} con ${nextMeeting.tenant.name}`,
          text: dashboard.meetings.hoy > 1 ? `${dashboard.meetings.hoy} reuniones hoy` : "Hoy",
          href: "/meetings",
          cta: "Ver",
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; icon: React.ReactNode; tone: string; title: string; text: string; href: string; cta: string }>;

  const firstName = session.user.name?.trim().split(/\s+/)[0];

  return (
    <AppShell title={firstName ? `Hola, ${firstName}` : "Inicio"} subtitle="Así está Vase hoy" tenantLabel="Admin" currentUserName={session.user.name ?? "Admin Vase"}>
      <div className="vpa-kpis">
        <div className="vpa-kpi">
          <span className="vpa-kt">
            <small>Ingreso del mes</small>
            <b>{money(dashboard.finances.ingresosMes)}</b>
            <em>gastos {money(dashboard.finances.gastosMes)}</em>
          </span>
        </div>
        <div className="vpa-kpi">
          <span className="vpa-kt">
            <small>Clientes activos</small>
            <b>{activeTenants.toLocaleString("es-AR")}</b>
            <em>{newTenants > 0 ? `+${newTenants} este mes` : "ninguno nuevo este mes"}</em>
          </span>
        </div>
        <div className="vpa-kpi">
          <span className="vpa-kt">
            <small>Cobros pendientes</small>
            <b>{money(owed)}</b>
            <em>{owingTenants === 1 ? "1 cliente" : `${owingTenants} clientes`}</em>
          </span>
        </div>
        <div className="vpa-kpi">
          <span className="vpa-kt">
            <small>Tickets abiertos</small>
            <b>{dashboard.support.abiertos.toLocaleString("es-AR")}</b>
            <em>{dashboard.support.criticos > 0 ? `${dashboard.support.criticos} urgentes` : "ninguno urgente"}</em>
          </span>
        </div>
      </div>

      <section className="vpa-card">
        <div className="vpa-sech">
          <div>
            <h3>Para hacer hoy</h3>
            <p>Lo que necesita tu ok.</p>
          </div>
        </div>
        {todo.length === 0 ? (
          <div className="vpa-empty">Todo en orden. No hay nada esperándote.</div>
        ) : (
          <div className="vpa-opps">
            {todo.map((item) => (
              <div className="vpa-opp" key={item.key}>
                <span className={`ic ${item.tone}`} aria-hidden="true">
                  {item.icon}
                </span>
                <span className="vpa-g1">
                  <b>{item.title}</b>
                  <span>{item.text}</span>
                </span>
                <Link href={item.href as Route} className="vpa-btn line sm">
                  {item.cta}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="vpa-card" style={{ padding: "12px 20px" }}>
        <div className="vpa-sech" style={{ marginTop: 8 }}>
          <div>
            <h3>Últimos clientes</h3>
          </div>
          <Link href={"/clients" as Route} className="vpa-btn line sm">
            Ver todos
          </Link>
        </div>
        <div className="vpa-tw">
          <table className="vpa-tbl">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Productos</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentTenants.map((tenant) => {
                const products = [...new Set(tenant.tenantModules.map((row) => PRODUCT_NAMES[row.module.product] ?? row.module.product))];
                const state = STATUS[tenant.subscription?.billingStatus ?? "TRIAL"] ?? STATUS.TRIAL;
                return (
                  <tr key={tenant.id}>
                    <td className="wrap">
                      <b>{tenant.name}</b>
                      {tenant.industry ? <span className="sub">{tenant.industry}</span> : null}
                    </td>
                    <td className="vpa-mut">{products.length ? products.join(" · ") : "—"}</td>
                    <td>
                      <span className={`vpa-tag ${state.cls}`}>
                        <i />
                        {state.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
