import type { Route } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { labsAdminTenantControlSchema } from "@vase/contracts";
import { AppShell } from "@/components/layout/app-shell";
import { LabsAdminWorkspace } from "@/components/admin/labs-admin-workspace";
import { ManagementControlCenter } from "@/components/admin/management-control-center";
import { FeatureSwitch, PriceEditor } from "@/components/admin/product-admin";
import {
  RestAdminWorkspace,
  type RestContractTenantView,
  type RestOperationsView,
  type RestPricingView,
} from "@/components/admin/rest-admin-workspace";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getAdminProduct } from "@/lib/admin/product-catalog";
import { updateFinancialSettingsAction, upsertTokenPlanSettingAction } from "@/app/(platform)/app/admin/actions";
import { listLabsAdminTenants } from "@/server/services/labs-admin";
import { getRestAdminOperations, listRestAdminData } from "@/server/services/rest-admin";
import { ensureProductFeatures } from "@/server/services/product-features";

export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value && "toNumber" in value) return (value as { toNumber: () => number }).toNumber();
  return Number(value) || 0;
}

const TOKEN_DEFAULTS: Record<string, { label: string; price: number; amount: number }> = {
  BASIC: { label: "Básico", price: 10000, amount: 500000 },
  MEDIUM: { label: "Medio", price: 20000, amount: 1200000 },
  PRO: { label: "Pro", price: 40000, amount: 3000000 },
};

/** Un producto: precios de sus planes, qué trae (características) y quiénes lo tienen. */
export default async function AdminProductPage({ params }: { params: Promise<{ product: string }> }) {
  let session;
  try {
    session = await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }
  const product = getAdminProduct((await params).product);
  if (!product) notFound();

  const features = await ensureProductFeatures(product);
  const [moduleRow, offCounts, clients, tokenPlans, financial] = await Promise.all([
    prisma.module.findUnique({
      where: { id: product.moduleId },
      select: {
        submodules: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, description: true, pricing: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1, select: { price: true, type: true } } },
        },
        pricing: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1, select: { price: true, type: true } },
      },
    }),
    prisma.tenantFeatureGrant.groupBy({
      by: ["featureId"],
      where: { enabled: false, featureId: { in: [...features.values()].map((feature) => feature.id) } },
      _count: { _all: true },
    }),
    prisma.tenantModule.findMany({
      where: { moduleId: product.moduleId, isActive: true },
      orderBy: { activatedAt: "desc" },
      take: 200,
      select: { commercialStatus: true, tenant: { select: { id: true, name: true, tenantSubmodules: { where: { isActive: true, submodule: { moduleId: product.moduleId } }, select: { submodule: { select: { name: true } } } } } } },
    }),
    product.id === "labs" ? prisma.tokenPlanSetting.findMany({ where: { tenantId: null }, orderBy: { key: "asc" } }) : Promise.resolve([]),
    product.id === "business" ? prisma.financialSettings.findFirst({ where: { tenantId: null }, orderBy: { updatedAt: "desc" } }) : Promise.resolve(null),
  ]);
  const offByFeature = new Map(offCounts.map((row) => [row.featureId, row._count._all]));

  let labsControls: ReturnType<typeof labsAdminTenantControlSchema.parse>[] = [];
  let rest: { versions: RestPricingView[]; contracts: RestContractTenantView[]; operations: RestOperationsView } | null = null;
  if (product.id === "labs") {
    labsControls = (await listLabsAdminTenants().catch(() => [])).map((control) => labsAdminTenantControlSchema.parse(control));
  }
  if (product.id === "rest") {
    const [commercial, operations] = await Promise.allSettled([listRestAdminData(), getRestAdminOperations()]);
    rest = {
      versions: (commercial.status === "fulfilled" ? commercial.value.versions : []) as RestPricingView[],
      contracts: (commercial.status === "fulfilled" ? commercial.value.contractTenants : []) as RestContractTenantView[],
      operations: operations.status === "fulfilled" ? operations.value : { health: "unavailable", tenants: [], edges: [] },
    };
  }

  const plans = moduleRow?.submodules ?? [];
  const showPlans = product.id === "business" || product.id === "labs";

  return (
    <AppShell title={product.name} subtitle={product.tagline} tenantLabel="Admin" currentUserName={session.user.name ?? undefined}>
      <Link href={"/modules" as Route} className="vpa-backl">
        ← Productos
      </Link>

      {showPlans ? (
        <section className="vpa-card stack">
          <div className="vpa-sech">
            <div className="vpa-g1">
              <h3>Planes y precios</h3>
              <p>El precio nuevo vale para los cobros que se generen desde ahora.</p>
            </div>
          </div>
          <div className="vpa-tw">
            <table className="vpa-tbl">
              <tbody>
                {plans.length ? (
                  plans.map((plan) => (
                    <tr key={plan.id}>
                      <td className="wrap">
                        <b>{plan.name}</b>
                        {plan.description ? <span className="sub">{plan.description}</span> : null}
                      </td>
                      <td className="r">
                        <PriceEditor
                          productId={product.id}
                          submoduleId={plan.id}
                          price={plan.pricing[0] ? toNumber(plan.pricing[0].price) : null}
                          type={plan.pricing[0]?.type ?? null}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td>
                      <b>Precio único</b>
                    </td>
                    <td className="r">
                      <PriceEditor productId={product.id} submoduleId={null} price={moduleRow?.pricing[0] ? toNumber(moduleRow.pricing[0].price) : null} type={moduleRow?.pricing[0]?.type ?? null} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {product.id === "business" ? (
        <form action={updateFinancialSettingsAction} className="vpa-card stack">
          <div className="vpa-sech">
            <div className="vpa-g1">
              <h3>Hosting, mantenimiento y soporte</h3>
              <p>Valores que se suman al plan de la tienda.</p>
            </div>
          </div>
          <div className="vpa-form">
            {(
              [
                ["hostingMonthlyPrice", "Hosting por mes", toNumber(financial?.hostingMonthlyPrice ?? 25000)],
                ["hostingYearlyPrice", "Hosting por año", toNumber(financial?.hostingYearlyPrice ?? 280000)],
                ["maintenanceMonthlyPrice", "Mantenimiento por mes", toNumber(financial?.maintenanceMonthlyPrice ?? 25000)],
                ["maxSupportTickets", "Tickets de soporte por mes", financial?.maxSupportTickets ?? 5],
              ] as Array<[string, string, number]>
            ).map(([name, label, value]) => (
              <label key={name} className="vpa-fld">
                <span>{label}</span>
                <input className="vpa-inp" name={name} type="number" step={name === "maxSupportTickets" ? "1" : "0.01"} defaultValue={value} />
              </label>
            ))}
            <input type="hidden" name="tokensDefaultToFund" value={financial?.tokensDefaultToFund === false ? "" : "on"} />
          </div>
          <div>
            <button className="vpa-btn acc">Guardar</button>
          </div>
        </form>
      ) : null}

      {product.id === "labs" ? (
        <section className="vpa-card stack">
          <div className="vpa-sech">
            <div className="vpa-g1">
              <h3>Paquetes de tokens</h3>
              <p>Lo que compra un cliente cuando se le termina la IA del mes.</p>
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
      ) : null}

      {product.id === "management" ? <ManagementControlCenter /> : null}
      {product.id === "rest" && rest ? (
        <RestAdminWorkspace initialVersions={rest.versions} initialContractTenants={rest.contracts} initialOperations={rest.operations} />
      ) : null}

      <section className="vpa-card stack">
        <div className="vpa-sech">
          <div className="vpa-g1">
            <h3>Qué trae</h3>
            <p>Apagá una característica acá para sacársela a todos. Para un solo cliente, andá a su ficha › Productos y plan › Ajustar.</p>
          </div>
        </div>
        <div className="vpa-tw">
          <table className="vpa-tbl">
            <tbody>
              {product.features.map((feature) => {
                const row = features.get(feature.key);
                const off = row ? (offByFeature.get(row.id) ?? 0) : 0;
                return (
                  <tr key={feature.key}>
                    <td className="wrap">
                      <b>{feature.name}</b>
                      <span className="sub">{feature.description}</span>
                    </td>
                    <td className="vpa-mut">{off ? `Apagada en ${off} ${off === 1 ? "cliente" : "clientes"}` : ""}</td>
                    <td className="r">
                      <FeatureSwitch productId={product.id} featureKey={feature.key} active={row?.isActive ?? true} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {product.id === "labs" ? (
        <section aria-label="Cupos por cuenta">
          <div className="vpa-secth">
            <h2>Canales por cuenta</h2>
            <p>Cuántos números o cuentas puede conectar cada cliente.</p>
          </div>
          <LabsAdminWorkspace initialControls={labsControls} />
        </section>
      ) : null}

      <section className="vpa-card" style={{ padding: "12px 20px" }}>
        <div className="vpa-sech" style={{ marginTop: 8 }}>
          <div className="vpa-g1">
            <h3>Clientes con {product.name.replace("Vase ", "")}</h3>
            <p>{clients.length ? `${clients.length} ${clients.length === 1 ? "cuenta" : "cuentas"}` : "Todavía nadie."}</p>
          </div>
        </div>
        {clients.length ? (
          <div className="vpa-tw">
            <table className="vpa-tbl">
              <tbody>
                {clients.map((client) => (
                  <tr key={client.tenant.id}>
                    <td className="wrap">
                      <Link href={`/clients/${client.tenant.id}?tab=productos` as Route} style={{ color: "inherit" }}>
                        <b>{client.tenant.name}</b>
                      </Link>
                    </td>
                    <td className="vpa-mut">{client.tenant.tenantSubmodules[0]?.submodule.name ?? "—"}</td>
                    <td className="r">
                      <span className={`vpa-tag ${client.commercialStatus === "TRIAL" ? "y" : "g"}`}>
                        <i />
                        {client.commercialStatus === "TRIAL" ? "En prueba" : "Activo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
