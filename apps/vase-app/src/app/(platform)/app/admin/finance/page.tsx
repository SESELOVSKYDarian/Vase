import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { getAdminFinanceDashboard } from "@/server/queries/admin-finance";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AdminFinancePage() {
  try {
    await requireAdminPermission(adminPermissions.BILLING);
  } catch {
    forbidden();
  }

  const dashboard = await getAdminFinanceDashboard();

  return (
    <AppShell
      title="Finanzas"
      subtitle="Control financiero integral: ingresos, gastos, fondo empresa, socios e inversión."
      tenantLabel="Admin Master"
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <PanelCard title="Ingresos cobrados" description="Pagos efectivamente cobrados.">
          <p className="text-3xl font-semibold">{formatMoney(dashboard.kpis.collected)}</p>
        </PanelCard>
        <PanelCard title="Gastos totales" description="Gastos registrados.">
          <p className="text-3xl font-semibold">{formatMoney(dashboard.kpis.totalExpenses)}</p>
        </PanelCard>
        <PanelCard title="Balance real" description="Ingresos menos gastos.">
          <p className="text-3xl font-semibold">{formatMoney(dashboard.kpis.realBalance)}</p>
        </PanelCard>
        <PanelCard title="Fondo real empresa" description="Fondo bruto menos gastos.">
          <p className={`text-3xl font-semibold ${dashboard.kpis.realCompanyFund >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {formatMoney(dashboard.kpis.realCompanyFund)}
          </p>
        </PanelCard>
        <PanelCard title="Distribuible socios" description="Total calculado para socios.">
          <p className="text-3xl font-semibold">{formatMoney(dashboard.kpis.partnerDistributable)}</p>
        </PanelCard>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <a href="/users" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm font-semibold text-[var(--foreground)]">
          Gestionar clientes y pagos
        </a>
        <a href="/expenses" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm font-semibold text-[var(--foreground)]">
          Gestionar gastos y vencimientos
        </a>
        <a href="/settings" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm font-semibold text-[var(--foreground)]">
          Ajustes financieros
        </a>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <a
          href="/api/admin/reports/export?type=financial"
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm font-semibold text-[var(--foreground)]"
        >
          Exportar reporte financiero (CSV)
        </a>
        <a
          href="/api/admin/reports/export?type=operational"
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm font-semibold text-[var(--foreground)]"
        >
          Exportar reporte operativo (CSV)
        </a>
      </section>

      <PanelCard
        eyebrow="Composición del Fondo"
        title="Detalle de origen del fondo bruto"
        description="Desglose de montos destinados al fondo empresa."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-[var(--surface-strong)] p-4 text-sm">Empresa %: {formatMoney(dashboard.compositions.fundFromCompanyPercent)}</div>
          <div className="rounded-2xl bg-[var(--surface-strong)] p-4 text-sm">Hosting: {formatMoney(dashboard.compositions.hostingCollected)}</div>
          <div className="rounded-2xl bg-[var(--surface-strong)] p-4 text-sm">Mantenimiento: {formatMoney(dashboard.compositions.maintenanceCollected)}</div>
          <div className="rounded-2xl bg-[var(--surface-strong)] p-4 text-sm">Tokens: {formatMoney(dashboard.compositions.tokensCollected)}</div>
        </div>
      </PanelCard>

      <PanelCard
        eyebrow="Recupero de inversión"
        title="Estado de recupero"
        description="Seguimiento de inversión inicial y porcentaje recuperado."
      >
        <p className="text-sm text-[var(--muted)]">Total inversión: {formatMoney(dashboard.kpis.investmentTotal)}</p>
        <p className="text-sm text-[var(--muted)]">Recuperado: {formatMoney(dashboard.kpis.investmentRecovered)}</p>
        <div className="mt-3 h-3 w-full rounded-full bg-[var(--surface-strong)]">
          <div
            className="h-full rounded-full bg-[var(--accent-strong)]"
            style={{ width: `${dashboard.kpis.investmentRecoveryPct}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{dashboard.kpis.investmentRecoveryPct.toFixed(2)}%</p>
      </PanelCard>
    </AppShell>
  );
}
