import type { Route } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { TestChargeForm } from "@/components/admin/test-charge-form";
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
export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<{ v?: string | string[] }> }) {
  try {
    await requireAdminPermission(adminPermissions.BILLING);
  } catch {
    forbidden();
  }

  const requested = (await searchParams).v;
  const view: ViewId = VIEWS.find((item) => item.id === requested)?.id ?? "pendientes";
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [dashboard, collectedMonth, expensesMonth, unpaid, paid] = await Promise.all([
    getAdminFinanceDashboard(),
    prisma.clientPayment.aggregate({ where: { paidAt: { gte: monthStart } }, _sum: { paidAmount: true } }),
    prisma.expense.aggregate({ where: { startsAt: { gte: monthStart, lt: now } }, _sum: { amount: true } }),
    prisma.clientPayment.findMany({
      where: { paidAt: null, status: { not: "CANCELED" } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      take: 100,
      select: { id: true, concept: true, totalAmount: true, paidAmount: true, dueAt: true, paidAt: true, status: true, tenant: { select: { id: true, name: true } } },
    }),
    view === "cobrados"
      ? prisma.clientPayment.findMany({
          where: { paidAt: { not: null } },
          orderBy: { paidAt: "desc" },
          take: 50,
          select: { id: true, concept: true, totalAmount: true, paidAmount: true, dueAt: true, paidAt: true, status: true, method: true, tenant: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
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
          <nav className="vpa-seg" aria-label="Ver cobros">
            {VIEWS.map((item) => (
              <Link
                key={item.id}
                href={(item.id === "pendientes" ? "/finance" : `/finance?v=${item.id}`) as Route}
                className={view === item.id ? "on" : undefined}
                aria-current={view === item.id ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        {rows.length === 0 ? (
          <div className="vpa-empty" style={{ margin: "8px 0" }}>
            {view === "cobrados" ? "Todavía no entró ningún pago." : "No hay nada por cobrar."}
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

      <section className="vpa-card">
        <div className="vpa-sech">
          <div>
            <h3>Fondo de la empresa</h3>
            <p>Desde el principio, según cómo se reparte cada cobro.</p>
          </div>
          <Link href={"/settings" as Route} className="vpa-btn line sm">
            Reglas de reparto
          </Link>
        </div>
        <div className="vpa-facts2">
          <div>
            <small>Fondo real</small>
            <b className={dashboard.kpis.realCompanyFund < 0 ? "low" : undefined}>{adminMoney(dashboard.kpis.realCompanyFund)}</b>
          </div>
          <div>
            <small>Para socios</small>
            <b>{adminMoney(dashboard.kpis.partnerDistributable)}</b>
          </div>
          <div>
            <small>Hosting cobrado</small>
            <b>{adminMoney(dashboard.compositions.hostingCollected)}</b>
          </div>
          <div>
            <small>Mantenimiento cobrado</small>
            <b>{adminMoney(dashboard.compositions.maintenanceCollected)}</b>
          </div>
        </div>
        {dashboard.kpis.investmentTotal > 0 ? (
          <div style={{ marginTop: 16 }}>
            <div className="vpa-hrow" style={{ marginBottom: 8 }}>
              <span className="vpa-g1">
                <b>Recupero de la inversión</b>
                <span>
                  {adminMoney(dashboard.kpis.investmentRecovered)} de {adminMoney(dashboard.kpis.investmentTotal)}
                </span>
              </span>
              <b>{dashboard.kpis.investmentRecoveryPct.toFixed(0)}%</b>
            </div>
            <span className="vpa-nprog" aria-hidden="true">
              <i style={{ width: `${dashboard.kpis.investmentRecoveryPct}%` }} />
            </span>
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          <a href="/api/admin/reports/export?type=financial" className="vpa-btn line sm">
            <Download size={14} aria-hidden="true" />
            Reporte financiero (CSV)
          </a>
          <a href="/api/admin/reports/export?type=operational" className="vpa-btn line sm">
            <Download size={14} aria-hidden="true" />
            Reporte operativo (CSV)
          </a>
        </div>
      </section>

      <section className="vpa-card">
        <div className="vpa-sech">
          <div>
            <h3>Cobro de prueba</h3>
            <p>Le crea a una cuenta una factura chica para probar Mercado Pago con plata real.</p>
          </div>
        </div>
        <TestChargeForm />
      </section>
    </AppShell>
  );
}
