import type { Route } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PayNow, type PayCard } from "@/components/panel/pay-now";
import { PANEL_PRODUCTS, formatArs, panelProductPriceLabel } from "@/components/panel/products";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import {
  isMercadoPagoConfigured,
  listSavedCards,
  mercadoPagoPublicKey,
  settleMercadoPagoPayment,
} from "@/server/services/mercadopago";

function formatDate(value: Date | null | undefined) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(value);
}

function daysUntil(value: Date) {
  return Math.ceil((value.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function dueLabel(value: Date | null) {
  if (!value) return "Sin fecha de vencimiento";
  const days = daysUntil(value);
  if (days < 0) return days === -1 ? "Venció ayer" : `Venció hace ${Math.abs(days)} días`;
  if (days === 0) return "Vence hoy";
  return days === 1 ? "Falta 1 día" : `Faltan ${days} días`;
}

function paymentState(payment: { paidAt: Date | null; status: string; dueAt: Date | null }) {
  if (payment.paidAt) return { label: "Pagada", cls: "g" };
  if (payment.status === "CANCELED") return { label: "Cancelada", cls: "" };
  if (payment.status === "PAST_DUE" || (payment.dueAt && payment.dueAt.getTime() < Date.now())) {
    return { label: "Vencida", cls: "r" };
  }
  return { label: "Por pagar", cls: "y" };
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; status?: string }>;
}) {
  let membership;
  let session;

  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  // Al volver de Mercado Pago se confirma el pago sin esperar el aviso.
  const returned = await searchParams;
  if (returned.payment_id && isMercadoPagoConfigured()) {
    await settleMercadoPagoPayment(returned.payment_id).catch(() => null);
  }

  const paymentsEnabled = isMercadoPagoConfigured();
  const [dashboard, subscription, invoices, activeSubmodules, billingProfile] = await Promise.all([
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
    prisma.tenantSubscription.findUnique({ where: { tenantId: membership.tenantId } }),
    prisma.clientPayment.findMany({
      where: { tenantId: membership.tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, concept: true, status: true, totalAmount: true, paidAmount: true, dueAt: true, paidAt: true, createdAt: true },
    }),
    prisma.tenantSubmodule.findMany({
      where: { tenantId: membership.tenantId, isActive: true },
      select: { submodule: { select: { moduleId: true, name: true } } },
    }),
    prisma.tenantBillingProfile.findUnique({
      where: { tenantId: membership.tenantId },
      select: { mercadoPagoCustomerId: true, defaultCardId: true },
    }),
  ]);

  if (!dashboard) forbidden();

  const activeModules = dashboard.modules.filter((module) => module.isActive);
  const unpaid = invoices
    .filter((invoice) => !invoice.paidAt && invoice.status !== "CANCELED")
    .sort((left, right) => (left.dueAt?.getTime() ?? Infinity) - (right.dueAt?.getTime() ?? Infinity));
  const next = unpaid[0] ?? null;
  const nextAmount = next ? Number(next.totalAmount) - Number(next.paidAmount) : 0;
  const savedCards = paymentsEnabled ? await listSavedCards(billingProfile?.mercadoPagoCustomerId) : [];
  const payCards: PayCard[] = savedCards.map((card) => ({ ...card, isDefault: card.id === billingProfile?.defaultCardId }));
  const transferAlias = process.env.VASE_TRANSFER_ALIAS?.trim() || null;
  const planOf = (moduleId: string) =>
    activeSubmodules.find((row) => row.submodule.moduleId === moduleId)?.submodule.name ?? null;

  return (
    <AppShell
      title="Plan y pagos"
      subtitle="Cuánto pagás, cuándo y qué incluye"
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
    >
      <div className="vpa-stack">
        {returned.payment_id ? (
          <div className="vpa-notice" role="status">
            {returned.status === "approved" ? "Recibimos tu pago. Gracias." : "Tu pago está en proceso. Te avisamos cuando se acredite."}
          </div>
        ) : null}
        <section className="vpa-payhero" aria-label="Tu próximo pago">
          <div>
            <div className="vpa-lab">Tu próximo pago</div>
            {next ? (
              <>
                <div className="vpa-huge">{formatArs(nextAmount)}</div>
                <div className="vpa-payline">
                  <b>{next.concept}</b>
                  <span>
                    {next.dueAt ? `Vence el ${formatDate(next.dueAt)} · ` : ""}
                    {dueLabel(next.dueAt)}
                  </span>
                </div>
                <div className="vpa-acts">
                  {paymentsEnabled ? (
                    <PayNow
                      paymentId={next.id}
                      amountLabel={formatArs(nextAmount)}
                      concept={next.concept}
                      cards={payCards}
                      publicKey={mercadoPagoPublicKey()}
                      transferAlias={transferAlias}
                    />
                  ) : (
                    <Link href={"/app/help" as Route} className="vpa-btn acc lg">
                      Coordinar el pago con Vase
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="vpa-huge">Al día</div>
                <div className="vpa-payline">
                  <b>No tenés pagos pendientes</b>
                  <span>Te avisamos cuando se acerque un vencimiento.</span>
                </div>
              </>
            )}
          </div>
          <div className="vpa-paysum">
            <div className="vpa-lab" style={{ marginBottom: 0 }}>
              Qué tenés contratado
            </div>
            {activeModules.length === 0 ? <span className="vpa-mut">Todavía no tenés productos activos.</span> : null}
            {activeModules.map((module) => {
              const product = PANEL_PRODUCTS[module.key];
              return (
                <div className="vpa-psr" key={module.key}>
                  <span className="vpa-mono" style={{ width: 40, height: 40, fontSize: 16, background: product.artBg, color: product.artFg }} aria-hidden="true">
                    {product.mark}
                  </span>
                  <div className="vpa-g1">
                    <b>{product.name}</b>
                    <span>{planOf(module.id) ? `Plan ${planOf(module.id)}` : "Activo"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {activeModules.length > 0 ? (
          <section aria-label="Lo que tenés contratado">
            <div className="vpa-secth">
              <h2>Tus productos</h2>
              <p>Qué incluye cada uno y hasta cuándo.</p>
            </div>
            <div className="vpa-cplans">
              {activeModules.map((module) => {
                const product = PANEL_PRODUCTS[module.key];
                const plan = planOf(module.id);
                return (
                  <article className="vpa-cplan" key={module.key}>
                    <div className="vpa-cph">
                      <span className="vpa-mono" style={{ width: 52, height: 52, fontSize: 22, background: product.artBg, color: product.artFg }} aria-hidden="true">
                        {product.mark}
                      </span>
                      <div className="vpa-g1">
                        <b>{product.name}</b>
                        <span className="t">{plan ? `Plan ${plan}` : "Activo"}</span>
                      </div>
                      <span className="vpa-tag g">
                        <i />
                        Activo
                      </span>
                    </div>
                    <ul className="vpa-ck">
                      {product.points.map((point) => (
                        <li key={point}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m5 12.5 4.5 4.5L19 7.5" />
                          </svg>
                          {point}
                        </li>
                      ))}
                    </ul>
                    <div className="vpa-facts">
                      <div>
                        <div className="vpa-lab">Cómo se paga</div>
                        <b>{panelProductPriceLabel(module.billing)}</b>
                      </div>
                      <div>
                        <div className="vpa-lab">Hasta</div>
                        <b>{module.key === "business" ? formatDate(subscription?.currentPeriodEndsAt ?? null) : "Se renueva"}</b>
                      </div>
                    </div>
                    <Link href={"/app/products" as Route} className="vpa-btn line wide">
                      Ver planes
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section aria-label="Comprobantes">
          <div className="vpa-secth">
            <h2>Comprobantes</h2>
            <p>Todo lo que te facturamos.</p>
          </div>
          {invoices.length === 0 ? (
            <div className="vpa-empty">Todavía no hay comprobantes.</div>
          ) : (
            <div className="vpa-card" style={{ padding: "12px 20px" }}>
              <div className="vpa-tw">
                <table className="vpa-tbl">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto</th>
                      <th>Importe</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => {
                      const state = paymentState(invoice);
                      return (
                        <tr key={invoice.id}>
                          <td className="vpa-mut">{formatDate(invoice.createdAt)}</td>
                          <td>
                            <b>{invoice.concept}</b>
                          </td>
                          <td>{formatArs(Number(invoice.totalAmount))}</td>
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
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
