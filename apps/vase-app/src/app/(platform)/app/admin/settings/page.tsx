import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import {
  updateFinancialSettingsAction,
  updatePartnerConfigAction,
  upsertTokenPlanSettingAction,
} from "@/app/(platform)/app/admin/actions";

function toNumber(value: unknown) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object" && value && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

export default async function AdminSettingsPage() {
  try {
    await requireAdminPermission(adminPermissions.BILLING);
  } catch {
    forbidden();
  }

  const [partnerConfig, financialSettings, tokenPlans] = await Promise.all([
    prisma.partnerConfig.findFirst({ where: { tenantId: null }, orderBy: { updatedAt: "desc" } }),
    prisma.financialSettings.findFirst({ where: { tenantId: null }, orderBy: { updatedAt: "desc" } }),
    prisma.tokenPlanSetting.findMany({ where: { tenantId: null }, orderBy: { key: "asc" } }),
  ]);

  const money = (name: string, label: string, value: number, step = "0.01") => (
    <label className="vpa-fld">
      <span>{label}</span>
      <input className="vpa-inp" name={name} type="number" step={step} defaultValue={value} />
    </label>
  );
  const TOKEN_DEFAULTS: Record<string, { label: string; price: number; amount: number }> = {
    BASIC: { label: "Básico", price: 10000, amount: 500000 },
    MEDIUM: { label: "Medio", price: 20000, amount: 1200000 },
    PRO: { label: "Pro", price: 40000, amount: 3000000 },
  };

  return (
    <AppShell title="Reglas de cobro" subtitle="Hosting, reparto de lo que entra y paquetes de tokens. Los precios de cada producto están en Productos." tenantLabel="Admin">
      <section className="vpa-g2" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
        <form action={updateFinancialSettingsAction} className="vpa-card stack">
          <div className="vpa-sech">
            <div className="vpa-g1">
              <h3>Hosting, mantenimiento y soporte</h3>
              <p>Valen para todas las cuentas.</p>
            </div>
          </div>
          <div className="vpa-form">
            {money("hostingMonthlyPrice", "Hosting por mes", toNumber(financialSettings?.hostingMonthlyPrice ?? 25000))}
            {money("hostingYearlyPrice", "Hosting por año", toNumber(financialSettings?.hostingYearlyPrice ?? 280000))}
            {money("maintenanceMonthlyPrice", "Mantenimiento por mes", toNumber(financialSettings?.maintenanceMonthlyPrice ?? 25000))}
            {money("maxSupportTickets", "Tickets de soporte por mes", financialSettings?.maxSupportTickets ?? 5, "1")}
            <label className="vpa-check vpa-span2" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              <input type="checkbox" name="tokensDefaultToFund" defaultChecked={financialSettings?.tokensDefaultToFund ?? true} />
              Lo que entra por tokens va al fondo de la empresa
            </label>
          </div>
          <div>
            <button className="vpa-btn acc">Guardar</button>
          </div>
        </form>

        <form action={updatePartnerConfigAction} className="vpa-card stack">
          <div className="vpa-sech">
            <div className="vpa-g1">
              <h3>Cómo se reparte lo que entra</h3>
              <p>Tiene que sumar 100%.</p>
            </div>
          </div>
          <div className="vpa-form">
            {money("alexisPercent", "Alexis %", toNumber(partnerConfig?.alexisPercent ?? 30))}
            {money("darianPercent", "Darian %", toNumber(partnerConfig?.darianPercent ?? 30))}
            {money("dantePercent", "Dante %", toNumber(partnerConfig?.dantePercent ?? 30))}
            {money("companyPercent", "Empresa %", toNumber(partnerConfig?.companyPercent ?? 10))}
          </div>
          <div>
            <button className="vpa-btn acc">Guardar</button>
          </div>
        </form>
      </section>

      <section className="vpa-card stack">
        <div className="vpa-sech">
          <div className="vpa-g1">
            <h3>Paquetes de tokens de la IA</h3>
            <p>Precio, cuántos tokens trae y cuántos mensajes alcanza más o menos.</p>
          </div>
        </div>
        <div className="vpa-tw">
          <table className="vpa-tbl">
            <thead>
              <tr>
                <th>Paquete</th>
                <th>Precio</th>
                <th>Tokens</th>
                <th>Mensajes (aprox.)</th>
                <th>Activo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {Object.entries(TOKEN_DEFAULTS).map(([key, defaults]) => {
                const current = tokenPlans.find((plan) => plan.key === key);
                const formId = `token-${key}`;
                return (
                  <tr key={key}>
                    <td>
                      <b>{defaults.label}</b>
                      <form id={formId} action={upsertTokenPlanSettingAction}>
                        <input type="hidden" name="key" value={key} />
                      </form>
                    </td>
                    <td>
                      <input form={formId} className="vpa-inp" name="price" type="number" step="0.01" defaultValue={toNumber(current?.price ?? defaults.price)} aria-label={`Precio ${defaults.label}`} style={{ width: 130 }} />
                    </td>
                    <td>
                      <input form={formId} className="vpa-inp" name="tokenAmount" type="number" step="1" defaultValue={current?.tokenAmount ?? defaults.amount} aria-label={`Tokens ${defaults.label}`} style={{ width: 140 }} />
                    </td>
                    <td>
                      <input form={formId} className="vpa-inp" name="estimatedMessages" defaultValue={current?.estimatedMessages ?? ""} aria-label={`Mensajes ${defaults.label}`} style={{ width: 150 }} />
                    </td>
                    <td>
                      <input form={formId} type="checkbox" name="isActive" defaultChecked={current?.isActive ?? true} aria-label={`${defaults.label} activo`} />
                    </td>
                    <td className="r">
                      <button form={formId} className="vpa-btn line sm">
                        Guardar
                      </button>
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
