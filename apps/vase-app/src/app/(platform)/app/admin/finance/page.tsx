import type { Route } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ChargeButton } from "@/components/admin/client-ficha";
import { Search } from "lucide-react";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { adminDate, adminMoney, invoiceState } from "@/lib/admin/labels";
import { amountDue } from "@/lib/billing/mercadopago-rules";
import { prisma } from "@/lib/db/prisma";
import { getAdminFinanceDashboard } from "@/server/queries/admin-finance";

const VIEWS = [
  { id: "pendientes", label: "Por cobrar" },
  { id: "cobrados", label: "Cobrados" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

const MONTH = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

/** Finanzas: cuánto entró este mes, cuánto falta cobrar, los gastos y lo que queda. Abajo, el fondo de la empresa. */
export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<{ v?: string | string[]; q?: string | string[] }> }) {
  try {
    await requireAdminPermission(adminPermissions.BILLING);
  } catch {
    forbidden();
  }

  const query = await searchParams;
  const requested = query.v;
  const search = (Array.isArray(query.q) ? query.q[0] : query.q)?.trim().slice(0, 80) ?? "";
  const textFilter = search ? { OR: [{ concept: { contains: search } }, { tenant: { name: { contains: search } } }] } : {};
  const view: ViewId = VIEWS.find((item) => item.id === requested)?.id ?? "pendientes";
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [dashboard, collectedMonth, expensesMonth, unpaid, paid, tenants] = await Promise.all([
    getAdminFinanceDashboard(),
    prisma.clientPayment.aggregate({ where: { paidAt: { gte: monthStart } }, _sum: { paidAmount: true } }),
    prisma.expense.aggregate({ where: { startsAt: { gte: monthStart, lt: now } }, _sum: { amount: true } }),
    prisma.clientPayment.findMany({
      where: { paidAt: null, status: { not: "CANCELED" }, ...textFilter },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      take: 100,
      select: { id: true, concept: true, totalAmount: true, paidAmount: true, dueAt: true, paidAt: true, status: true, tenant: { select: { id: true, name: true } } },
    }),
    view === "cobrados"
      ? prisma.clientPayment.findMany({
          where: { paidAt: { not: null }, ...textFilter },
          orderBy: { paidAt: "desc" },
          take: 50,
          select: { id: true, concept: true, totalAmount: true, paidAmount: true, dueAt: true, paidAt: true, status: true, method: true, tenant: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
    prisma.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 1000 }),
  ]);

  const collected = Number(collectedMonth._sum.paidAmount ?? 0);
  const spent = Number(expensesMonth._sum.amount ?? 0);
  const owed = unpaid.reduce((sum, row) => sum + amountDue(Number(row.totalAmount), Number(row.paidAmount)), 0);
  const owingClients = new Set(unpaid.map((row) => row.tenant.id)).size;
  const overdueCount = unpaid.filter((row) => row.dueAt && row.dueAt < now).length;
  const rows = view === "cobrados" ? paid : unpaid;

  return (
    <AppShell title="Finanzas" subtitle={MONTH.format(now).replace(/^./, (letter) => letter.toUpperCase())} tenantLabel="Admin">
      <div className="vpa-kpis">
        <div className="vpa-kpi">
          <span className="vpa-kt">
            <small>Cobrado este mes</small>
            <b>{adminMoney(collected)}</b>
            <em>{adminMoney(dashboard.kpis.collected)} en total</em>
          </span>
        </div>
        <div className="vpa-kpi">
          <span className="vpa-kt">
            <small>Por cobrar</small>
            <b>{adminMoney(owed)}</b>
            <em>
              {owingClients === 1 ? "1 cliente" : `${owingClients} clientes`}
              {overdueCount ? ` · ${overdueCount} vencidos` : ""}
            </em>
          </span>
        </div>
        <div className="vpa-kpi">
          <span className="vpa-kt">
            <small>Gastos del mes</small>
            <b>{adminMoney(spent)}</b>
            <em>
              <Link href={"/expenses" as Route}>ver gastos</Link>
            </em>
          </span>
        </div>
        <div className="vpa-kpi">
          <span className="vpa-kt">
            <small>Queda este mes</small>
            <b className={collected - spent < 0 ? "low" : undefined}>{adminMoney(collected - spent)}</b>
            <em>cobrado menos gastos</em>
          </span>
        </div>
      </div>

      <section className="vpa-card" style={{ padding: "12px 20px" }}>
        <div className="vpa-sech" style={{ marginTop: 8 }}>
          <div>
            <h3>Cobros</h3>
            <p>{view === "cobrados" ? "Los últimos 50 pagos que entraron." : "Facturas que todavía no se pagaron, las más viejas primero."}</p>
          </div>
          <form className="vpa-search" action="/finance" role="search" style={{ minWidth: 220 }}>
            <Search size={16} aria-hidden="true" />
            <input className="vpa-inp" type="search" name="q" defaultValue={search} placeholder="Buscar cliente o concepto" aria-label="Buscar cobros" />
            {view === "cobrados" ? <input type="hidden" name="v" value="cobrados" /> : null}
          </form>
          <nav className="vpa-seg" aria-label="Ver cobros">
            {VIEWS.map((item) => (
              <Link
                key={item.id}
                href={`/finance?${new URLSearchParams({ ...(item.id === "cobrados" ? { v: "cobrados" } : {}), ...(search ? { q: search } : {}) }).toString()}` as Route}
                className={view === item.id ? "on" : undefined}
                aria-current={view === item.id ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <ChargeButton tenants={tenants} label="Nuevo cobro" />
        </div>
        {rows.length === 0 ? (
          <div className="vpa-empty" style={{ margin: "8px 0" }}>
            {search ? `No hay cobros con “${search}”.` : view === "cobrados" ? "Todavía no entró ningún pago." : "No hay nada por cobrar."}
          </div>
        ) : (
          <div className="vpa-tw">
            <table className="vpa-tbl">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Concepto</th>
                  <th className="r">{view === "cobrados" ? "Cobrado" : "Debe"}</th>
                  <th>{view === "cobrados" ? "Pagó" : "Vence"}</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const tag = invoiceState(row, now.getTime());
                  return (
                    <tr key={row.id}>
                      <td className="wrap">
                        <Link href={`/clients/${row.tenant.id}?tab=cobros` as Route}>
                          <b>{row.tenant.name}</b>
                        </Link>
                      </td>
                      <td className="wrap">
                        {row.concept}
                        {(row as { method?: string | null }).method ? <span className="sub">{(row as { method?: string | null }).method}</span> : null}
                      </td>
                      <td className="r">
                        {adminMoney(view === "cobrados" ? Number(row.paidAmount) : amountDue(Number(row.totalAmount), Number(row.paidAmount)))}
                      </td>
                      <td className="vpa-mut">{adminDate(view === "cobrados" ? row.paidAt : row.dueAt)}</td>
                      <td>
                        <span className={`vpa-tag ${tag.cls}`}>
                          <i />
                          {tag.label}
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

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href="/api/admin/reports/export?type=financial" className="vpa-btn line sm">
          <Download size={14} aria-hidden="true" />
          Reporte financiero (CSV)
        </a>
        <a href="/api/admin/reports/export?type=operational" className="vpa-btn line sm">
          <Download size={14} aria-hidden="true" />
          Reporte operativo (CSV)
        </a>
      </div>
    </AppShell>
  );
}
