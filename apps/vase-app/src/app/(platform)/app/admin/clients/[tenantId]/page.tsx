import type { Route } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { Boxes, Sparkles, Store, UtensilsCrossed } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { amountDue } from "@/lib/billing/mercadopago-rules";
import { prisma } from "@/lib/db/prisma";
import { ADMIN_BILLING_STATUS, ADMIN_PRODUCT_NAMES, ADMIN_TICKET_STATUS, adminDate, adminMoney, invoiceState } from "@/lib/admin/labels";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "productos", label: "Productos y plan" },
  { id: "cobros", label: "Cobros" },
  { id: "soporte", label: "Soporte" },
  { id: "actividad", label: "Actividad" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const PRODUCT_ICON: Record<string, { icon: typeof Store; tone: string }> = {
  BUSINESS: { icon: Store, tone: "g" },
  LABS: { icon: Sparkles, tone: "b" },
  MANAGEMENT: { icon: Boxes, tone: "y" },
  REST: { icon: UtensilsCrossed, tone: "r" },
};

const OPEN_TICKETS = ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"] as const;

/** "billing.account_activated" → "Billing · account activated": legible sin inventar traducciones. */
function actionLabel(action: string) {
  const [area, ...rest] = action.split(".");
  const what = rest.join(" ").replace(/_/g, " ");
  return what ? `${area.charAt(0).toUpperCase()}${area.slice(1)} · ${what}` : action;
}

/** Ficha del cliente: todo lo de una cuenta en un lugar (productos, cobros, tickets y lo que se hizo). */
export default async function AdminClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  try {
    await requireAdminPermission(adminPermissions.USERS);
  } catch {
    forbidden();
  }

  const { tenantId } = await params;
  const requested = (await searchParams).tab;
  const tab: TabId = TABS.find((item) => item.id === requested)?.id ?? "resumen";

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      status: true,
      billingEmail: true,
      createdAt: true,
      subscription: { select: { billingStatus: true, plan: true, trialEndsAt: true, currentPeriodEndsAt: true, nextBillingAt: true, paidAt: true, businessBlockedAt: true } },
      tenantModules: { where: { isActive: true }, select: { module: { select: { id: true, name: true, product: true } } } },
      memberships: {
        where: { status: "ACTIVE" },
        select: { role: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!tenant) notFound();

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const [invoices, submodules, tickets, activity, autoDebit, paidThisYear] = await Promise.all([
    prisma.clientPayment.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, concept: true, category: true, totalAmount: true, paidAmount: true, dueAt: true, paidAt: true, status: true, method: true, createdAt: true },
    }),
    prisma.tenantSubmodule.findMany({
      where: { tenantId, isActive: true },
      select: { submodule: { select: { name: true, moduleId: true } } },
    }),
    prisma.supportTicket.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, subject: true, status: true, priority: true, createdAt: true },
    }),
    tab === "actividad"
      ? prisma.auditLog.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 60,
          select: { id: true, action: true, createdAt: true, actorUser: { select: { name: true, email: true } } },
        })
      : Promise.resolve([]),
    prisma.billingAutoDebit.findUnique({ where: { tenantId }, select: { status: true } }),
    prisma.clientPayment.aggregate({ where: { tenantId, paidAt: { gte: yearStart } }, _sum: { paidAmount: true } }),
  ]);

  const owner = tenant.memberships.find((membership) => membership.role === "OWNER")?.user ?? null;
  const unpaid = invoices.filter((invoice) => !invoice.paidAt && invoice.status !== "CANCELED");
  const owes = unpaid.reduce((sum, invoice) => sum + amountDue(Number(invoice.totalAmount), Number(invoice.paidAmount)), 0);
  const overdue = unpaid.some((invoice) => invoice.dueAt && invoice.dueAt < now);
  const openTickets = tickets.filter((ticket) => (OPEN_TICKETS as readonly string[]).includes(ticket.status)).length;
  const billing = tenant.subscription?.billingStatus ?? "TRIAL";
  const state = overdue ? ADMIN_BILLING_STATUS.PAST_DUE : (ADMIN_BILLING_STATUS[billing] ?? ADMIN_BILLING_STATUS.TRIAL);
  const planOf = (moduleId: string) => submodules.filter((row) => row.submodule.moduleId === moduleId).map((row) => row.submodule.name);
  const tabHref = (id: TabId) => (id === "resumen" ? `/clients/${tenantId}` : `/clients/${tenantId}?tab=${id}`) as Route;

  return (
    <AppShell
      title={tenant.name}
      subtitle={`Cliente desde ${adminDate(tenant.createdAt)}${owner ? ` · Dueño: ${owner.name ?? owner.email}` : ""}`}
      tenantLabel="Admin"
    >
      <Link href={"/clients" as Route} className="vpa-backl">
        ← Clientes
      </Link>

      <nav className="vpa-seg" aria-label="Ficha del cliente" style={{ alignSelf: "flex-start", maxWidth: "100%", overflowX: "auto" }}>
        {TABS.map((item) => (
          <Link key={item.id} href={tabHref(item.id)} className={tab === item.id ? "on" : undefined} aria-current={tab === item.id ? "page" : undefined}>
            {item.label}
            {item.id === "soporte" && openTickets > 0 ? ` ${openTickets}` : ""}
          </Link>
        ))}
      </nav>

      {tab === "resumen" ? (
        <>
          <div className="vpa-kpis">
            <div className="vpa-kpi">
              <span className="vpa-kt">
                <small>Estado</small>
                <b>
                  <span className={`vpa-tag ${tenant.status === "SUSPENDED" ? "r" : state.cls}`}>
                    <i />
                    {tenant.status === "SUSPENDED" ? "Suspendida" : state.label}
                  </span>
                </b>
                <em>{autoDebit?.status === "authorized" ? "con débito automático" : "paga cuando le llega la factura"}</em>
              </span>
            </div>
            <div className="vpa-kpi">
              <span className="vpa-kt">
                <small>Debe</small>
                <b>{owes > 0 ? adminMoney(owes) : "Nada"}</b>
                <em>{unpaid.length === 1 ? "1 factura" : `${unpaid.length} facturas`}</em>
              </span>
            </div>
            <div className="vpa-kpi">
              <span className="vpa-kt">
                <small>Pagó este año</small>
                <b>{adminMoney(Number(paidThisYear._sum.paidAmount ?? 0))}</b>
                <em>desde enero</em>
              </span>
            </div>
            <div className="vpa-kpi">
              <span className="vpa-kt">
                <small>Tickets abiertos</small>
                <b>{openTickets}</b>
                <em>{tickets.length} en total</em>
              </span>
            </div>
          </div>

          <section className="vpa-card">
            <div className="vpa-sech">
              <div>
                <h3>Datos de la cuenta</h3>
              </div>
            </div>
            <div className="vpa-facts2">
              <div>
                <small>Dueño</small>
                <b>{owner ? `${owner.name ?? "—"} · ${owner.email}` : "Sin dueño"}</b>
              </div>
              <div>
                <small>Correo de facturación</small>
                <b>{tenant.billingEmail ?? "—"}</b>
              </div>
              <div>
                <small>Cuenta</small>
                <b>{tenant.slug}</b>
              </div>
              <div>
                <small>Rubro</small>
                <b>{tenant.industry || "—"}</b>
              </div>
              <div>
                <small>Personas en la cuenta</small>
                <b>{tenant.memberships.length}</b>
              </div>
              <div>
                <small>Próximo cobro</small>
                <b>{adminDate(tenant.subscription?.nextBillingAt ?? null)}</b>
              </div>
            </div>
            <div className="row" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              <Link href={"/users" as Route} className="vpa-btn line sm">
                Accesos y cobros avanzados
              </Link>
              <Link href={tabHref("cobros")} className="vpa-btn line sm">
                Ver cobros
              </Link>
            </div>
          </section>
        </>
      ) : null}

      {tab === "productos" ? (
        <section className="vpa-card">
          <div className="vpa-sech">
            <div>
              <h3>Productos que usa</h3>
              <p>
                {tenant.subscription?.businessBlockedAt ? "Business está bloqueado por falta de pago. " : ""}
                {tenant.subscription?.currentPeriodEndsAt ? `Período pagado hasta ${adminDate(tenant.subscription.currentPeriodEndsAt)}.` : ""}
              </p>
            </div>
          </div>
          {tenant.tenantModules.length === 0 ? (
            <div className="vpa-empty">Todavía no tiene productos activos.</div>
          ) : (
            <div className="vpa-opps">
              {tenant.tenantModules.map(({ module }) => {
                const look = PRODUCT_ICON[module.product] ?? PRODUCT_ICON.BUSINESS;
                const Icon = look.icon;
                const plan = planOf(module.id);
                return (
                  <div className="vpa-opp" key={module.id}>
                    <span className={`ic ${look.tone}`} aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <span className="vpa-g1">
                      <b>
                        {ADMIN_PRODUCT_NAMES[module.product] ?? module.name}
                        {plan.length ? ` · ${plan.join(", ")}` : ""}
                      </b>
                      <span>{module.name}</span>
                    </span>
                    <Link href={"/modules" as Route} className="vpa-btn line sm">
                      Ajustar
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {tab === "cobros" ? (
        <section className="vpa-card" style={{ padding: "12px 20px" }}>
          <div className="vpa-sech" style={{ marginTop: 8 }}>
            <div>
              <h3>Facturas</h3>
              <p>{autoDebit?.status === "authorized" ? "Tiene débito automático con Mercado Pago." : "Paga desde Plan y pagos con Mercado Pago."}</p>
            </div>
            <Link href={"/users" as Route} className="vpa-btn line sm">
              Cargar un cobro
            </Link>
          </div>
          {invoices.length === 0 ? (
            <div className="vpa-empty">Todavía no tiene facturas.</div>
          ) : (
            <div className="vpa-tw">
              <table className="vpa-tbl">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th className="r">Importe</th>
                    <th>Vence</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const invoiceTag = invoiceState(invoice, now.getTime());
                    return (
                      <tr key={invoice.id}>
                        <td className="vpa-mut">{adminDate(invoice.createdAt)}</td>
                        <td className="wrap">
                          <b>{invoice.concept}</b>
                          {invoice.method ? <span className="sub">{invoice.method}</span> : null}
                        </td>
                        <td className="r">{adminMoney(Number(invoice.totalAmount))}</td>
                        <td className="vpa-mut">{adminDate(invoice.dueAt)}</td>
                        <td>
                          <span className={`vpa-tag ${invoiceTag.cls}`}>
                            <i />
                            {invoiceTag.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === "soporte" ? (
        <section className="vpa-card" style={{ padding: "12px 20px" }}>
          <div className="vpa-sech" style={{ marginTop: 8 }}>
            <div>
              <h3>Tickets</h3>
            </div>
            <Link href={"/tickets" as Route} className="vpa-btn line sm">
              Abrir Soporte
            </Link>
          </div>
          {tickets.length === 0 ? (
            <div className="vpa-empty">No tiene tickets.</div>
          ) : (
            <div className="vpa-tw">
              <table className="vpa-tbl">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Asunto</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => {
                    const ticketTag = ADMIN_TICKET_STATUS[ticket.status] ?? { label: ticket.status, cls: "" };
                    return (
                      <tr key={ticket.id}>
                        <td className="vpa-mut">{adminDate(ticket.createdAt)}</td>
                        <td className="wrap">
                          <b>{ticket.subject}</b>
                        </td>
                        <td className={ticket.priority === "URGENT" ? "low" : "vpa-mut"}>{ticket.priority === "URGENT" ? "Urgente" : ticket.priority === "HIGH" ? "Alta" : "Normal"}</td>
                        <td>
                          <span className={`vpa-tag ${ticketTag.cls}`}>
                            <i />
                            {ticketTag.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === "actividad" ? (
        <section className="vpa-card" style={{ padding: "12px 20px" }}>
          <div className="vpa-sech" style={{ marginTop: 8 }}>
            <div>
              <h3>Lo que se hizo en la cuenta</h3>
              <p>Los últimos 60 cambios.</p>
            </div>
          </div>
          {activity.length === 0 ? (
            <div className="vpa-empty">Sin actividad registrada.</div>
          ) : (
            <div className="vpa-tw">
              <table className="vpa-tbl">
                <thead>
                  <tr>
                    <th>Cuándo</th>
                    <th>Qué</th>
                    <th>Quién</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((entry) => (
                    <tr key={entry.id}>
                      <td className="vpa-mut">
                        {new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(entry.createdAt)}
                      </td>
                      <td className="wrap">{actionLabel(entry.action)}</td>
                      <td className="vpa-mut">{entry.actorUser?.name ?? entry.actorUser?.email ?? "Sistema"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </AppShell>
  );
}
