import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import {
  updateBusinessPlanSettingsAction,
  updateFinancialSettingsAction,
  updateLabsPlanSettingsAction,
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

  const [partnerConfig, financialSettings, businessPlan, labsPlan, tokenPlans] = await Promise.all([
    prisma.partnerConfig.findFirst({ where: { tenantId: null }, orderBy: { updatedAt: "desc" } }),
    prisma.financialSettings.findFirst({ where: { tenantId: null }, orderBy: { updatedAt: "desc" } }),
    prisma.businessPlanSetting.findFirst({ where: { tenantId: null }, orderBy: { updatedAt: "desc" } }),
    prisma.labsPlanSetting.findFirst({ where: { tenantId: null }, orderBy: { updatedAt: "desc" } }),
    prisma.tokenPlanSetting.findMany({ where: { tenantId: null }, orderBy: { key: "asc" } }),
  ]);

  return (
    <AppShell title="Ajustes financieros" subtitle="Configura precios, porcentajes de socios y reglas de distribución." tenantLabel="Admin Master">
      <section className="grid gap-6 xl:grid-cols-2">
        <PanelCard title="Porcentajes de socios" description="La suma debe ser 100%.">
          <form action={updatePartnerConfigAction} className="grid gap-3 md:grid-cols-2">
            <input name="alexisPercent" type="number" step="0.01" defaultValue={toNumber(partnerConfig?.alexisPercent ?? 30)} placeholder="Alexis %" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="darianPercent" type="number" step="0.01" defaultValue={toNumber(partnerConfig?.darianPercent ?? 30)} placeholder="Darian %" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="dantePercent" type="number" step="0.01" defaultValue={toNumber(partnerConfig?.dantePercent ?? 30)} placeholder="Dante %" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="companyPercent" type="number" step="0.01" defaultValue={toNumber(partnerConfig?.companyPercent ?? 10)} placeholder="Empresa %" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">Guardar porcentajes</button>
          </form>
        </PanelCard>

        <PanelCard title="Reglas generales" description="Hosting, mantenimiento, tokens y límite de tickets de soporte.">
          <form action={updateFinancialSettingsAction} className="grid gap-3 md:grid-cols-2">
            <input name="hostingMonthlyPrice" type="number" step="0.01" defaultValue={toNumber(financialSettings?.hostingMonthlyPrice ?? 25000)} placeholder="Hosting mensual" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="hostingYearlyPrice" type="number" step="0.01" defaultValue={toNumber(financialSettings?.hostingYearlyPrice ?? 280000)} placeholder="Hosting anual" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="maintenanceMonthlyPrice" type="number" step="0.01" defaultValue={toNumber(financialSettings?.maintenanceMonthlyPrice ?? 25000)} placeholder="Mantenimiento mensual" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="maxSupportTickets" type="number" step="1" defaultValue={financialSettings?.maxSupportTickets ?? 5} placeholder="Max tickets soporte" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <label className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm md:col-span-2">
              <input type="checkbox" name="tokensDefaultToFund" defaultChecked={financialSettings?.tokensDefaultToFund ?? true} />
              Tokens van al fondo empresa por defecto
            </label>
            <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">Guardar reglas</button>
          </form>
        </PanelCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <PanelCard title="Precios Vase Business" description="Plan base y plan personalizado.">
          <form action={updateBusinessPlanSettingsAction} className="grid gap-3 md:grid-cols-2">
            <input name="basePlanPrice" type="number" step="0.01" defaultValue={toNumber(businessPlan?.basePlanPrice ?? 1070000)} placeholder="Plan Base" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="customPlanPrice" type="number" step="0.01" defaultValue={toNumber(businessPlan?.customPlanPrice ?? 1800000)} placeholder="Plan Personalizado" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="includedHostingYearValue" type="number" step="0.01" defaultValue={toNumber(businessPlan?.includedHostingYearValue ?? 280000)} placeholder="Hosting incluido (valor)" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="customHostingYearPrice" type="number" step="0.01" defaultValue={toNumber(businessPlan?.customHostingYearPrice ?? 280000)} placeholder="Hosting anual personalizado" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="customInitialPercent" type="number" step="0.01" defaultValue={toNumber(businessPlan?.customInitialPercent ?? 50)} placeholder="% cuota inicial" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="customFinalPercent" type="number" step="0.01" defaultValue={toNumber(businessPlan?.customFinalPercent ?? 50)} placeholder="% cuota final" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">Guardar Business</button>
          </form>
        </PanelCard>

        <PanelCard title="Precios Vase Labs" description="Starter, Growth y Pro.">
          <form action={updateLabsPlanSettingsAction} className="grid gap-3 md:grid-cols-2">
            <input name="starterPrice" type="number" step="0.01" defaultValue={toNumber(labsPlan?.starterPrice ?? 120000)} placeholder="Starter" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="growthPrice" type="number" step="0.01" defaultValue={toNumber(labsPlan?.growthPrice ?? 170000)} placeholder="Growth" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <input name="proPrice" type="number" step="0.01" defaultValue={toNumber(labsPlan?.proPrice ?? 220000)} placeholder="Pro" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
            <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">Guardar Labs</button>
          </form>
        </PanelCard>
      </section>

      <PanelCard title="Tokens IA" description="Editar planes de tokens (precio, volumen y mensajes estimados).">
        <div className="grid gap-3">
          {["BASIC", "MEDIUM", "PRO"].map((key) => {
            const current = tokenPlans.find((plan) => plan.key === key);
            return (
              <form key={key} action={upsertTokenPlanSettingAction} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] p-3 md:grid-cols-5">
                <input type="hidden" name="key" value={key} />
                <p className="self-center text-sm font-semibold text-[var(--foreground)]">{key}</p>
                <input name="price" type="number" step="0.01" defaultValue={toNumber(current?.price ?? (key === "BASIC" ? 10000 : key === "MEDIUM" ? 20000 : 40000))} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
                <input name="tokenAmount" type="number" step="1" defaultValue={current?.tokenAmount ?? (key === "BASIC" ? 500000 : key === "MEDIUM" ? 1200000 : 3000000)} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
                <input name="estimatedMessages" defaultValue={current?.estimatedMessages ?? ""} placeholder="Mensajes estimados" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
                <label className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={current?.isActive ?? true} />
                  Activo
                </label>
                <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-xs font-semibold text-[var(--accent-contrast)] md:col-span-5">Guardar {key}</button>
              </form>
            );
          })}
        </div>
      </PanelCard>
    </AppShell>
  );
}

