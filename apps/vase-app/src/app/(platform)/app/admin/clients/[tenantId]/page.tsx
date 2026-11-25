import type { Route } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ChargeButton, ClientNotes, ClientProductCard, type ProductCardData } from "@/components/admin/client-ficha";
import { ClientAccessControls } from "@/components/admin/client-access-controls";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { amountDue } from "@/lib/billing/mercadopago-rules";
import { prisma } from "@/lib/db/prisma";
import { ADMIN_PRODUCTS } from "@/lib/admin/product-catalog";
import { ADMIN_BILLING_STATUS, ADMIN_TICKET_STATUS, adminDate, adminMoney, invoiceState } from "@/lib/admin/labels";
import { resolveWorkspaceUrl } from "@/lib/security/workspace-host-routing";
import { getDisabledFeatureKeys } from "@/server/services/product-features";
import { isTrialLocked } from "@/server/services/trial/trial-rules";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "productos", label: "Productos y plan" },
  { id: "cobros", label: "Cobros" },
  { id: "soporte", label: "Soporte" },
  { id: "notas", label: "Notas" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const OPEN_TICKETS = ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"] as const;

function priceLabel(pricing: { price: unknown; currency: string; type: string } | undefined) {
  if (!pricing) return null;
  const amount = Number(pricing.price);
  const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: pricing.currency || "ARS", maximumFractionDigits: 0 }).format(amount);
  return pricing.type === "MONTHLY" ? `${money} / mes` : pricing.type === "YEARLY" ? `${money} / año` : money;
}

/** Ficha del cliente: resumen, productos con su plan y características, cobros, tickets y notas. */
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
      industry: true,
      status: true,
      billingEmail: true,
      createdAt: true,
      subscription: { select: { billingStatus: true, currentPeriodEndsAt: true, trialEndsAt: true, isTestAccount: true } },
      memberships: {
        where: { status: "ACTIVE" },
        select: { role: true, user: { select: { name: true, email: true, lastLoginAt: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!tenant) notFound();

  const now = new Date();
  const [invoices, tenantModules, tenantSubmodules, modules, tickets, notes, info, autoDebit, disabled] = await Promise.all([
    prisma.clientPayment.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, concept: true, totalAmount: true, paidAmount: true, dueAt: true, paidAt: true, status: true, method: true, createdAt: true },
    }),
    prisma.tenantModule.findMany({ where: { tenantId }, select: { moduleId: true, isActive: true, commercialStatus: true, trialEndsAt: true } }),
    prisma.tenantSubmodule.findMany({ where: { tenantId, isActive: true }, select: { submoduleId: true } }),
    prisma.module.findMany({
      where: { id: { in: ADMIN_PRODUCTS.map((product) => product.moduleId) } },
      select: {
        id: true,
        submodules: {
          where: { isActive: true },
          select: { id: true, name: true, pricing: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1, select: { price: true, currency: true, type: true } } },
        },
        pricing: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1, select: { price: true, currency: true, type: true } },
        features: { where: { submoduleId: null }, select: { key: true, isActive: true } },
      },
    }),
    prisma.supportTicket.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, subject: true, status: true, priority: true, createdAt: true, labsConversationId: true },
    }),
    prisma.tenantAdminNote.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.tenantBusinessInfo.findUnique({ where: { tenantId }, select: { phone: true, whatsapp: true, email: true } }),
    prisma.billingAutoDebit.findUnique({ where: { tenantId }, select: { status: true } }),
    getDisabledFeatureKeys(tenantId),
  ]);
  const noteAuthors = await prisma.user.findMany({
    where: { id: { in: notes.map((note) => note.authorUserId).filter((id): id is string => Boolean(id)) } },
    select: { id: true, name: true },
  });

  const owner = tenant.memberships.find((membership) => membership.role === "OWNER")?.user ?? tenant.memberships[0]?.user ?? null;
  const unpaid = invoices.filter((invoice) => !invoice.paidAt && invoice.status !== "CANCELED");
  const owes = unpaid.reduce((sum, invoice) => sum + amountDue(Number(invoice.totalAmount), Number(invoice.paidAmount)), 0);
  const overdue = unpaid.some((invoice) => invoice.dueAt && invoice.dueAt < now);
  const paidTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0);
  const openTickets = tickets.filter((ticket) => (OPEN_TICKETS as readonly string[]).includes(ticket.status)).length;
  const pendingNotes = notes.filter((note) => !note.done).length;
  const billing = tenant.subscription?.billingStatus ?? "TRIAL";
  // Etiqueta del estado: suspendida, cuenta de prueba interna, prueba vencida, con deuda o el estado del plan.
  const state = tenant.status === "SUSPENDED"
    ? { label: "Suspendida", cls: "r" }
    : tenant.subscription?.isTestAccount
      ? { label: "Cuenta de prueba", cls: "" }
      : isTrialLocked(tenant.subscription)
        ? { label: "Prueba vencida", cls: "r" }
        : overdue ? ADMIN_BILLING_STATUS.PAST_DUE : (ADMIN_BILLING_STATUS[billing] ?? ADMIN_BILLING_STATUS.TRIAL);
  const activePlans = new Set(tenantSubmodules.map((row) => row.submoduleId));

  const products: ProductCardData[] = ADMIN_PRODUCTS.map((product) => {
    const moduleRow = modules.find((row) => row.id === product.moduleId);
    const link = tenantModules.find((row) => row.moduleId === product.moduleId);
    const plans = (moduleRow?.submodules ?? []).map((plan) => ({ id: plan.id, name: plan.name, price: priceLabel(plan.pricing[0]) }));
    const globallyOff = new Set((moduleRow?.features ?? []).filter((feature) => !feature.isActive).map((feature) => feature.key));
    const off = new Set(disabled[product.moduleId] ?? []);
    const planId = plans.find((plan) => activePlans.has(plan.id))?.id ?? null;
    return {
      moduleId: product.moduleId,
      name: product.name,
      tagline: product.tagline,
      active: Boolean(link?.isActive),
      status: link?.commercialStatus ?? null,
      trialEndsAt: link?.trialEndsAt?.toISOString() ?? null,
      planId,
      plans: plans.length ? plans : [],
      features: product.features.map((feature) => ({
        key: feature.key,
        name: feature.name,
        description: feature.description,
        enabled: !off.has(feature.key),
        globallyOff: globallyOff.has(feature.key),
      })),
    };
  }).map((product) => {
    if (product.plans.length) return product;
    const base = modules.find((row) => row.id === product.moduleId)?.pricing[0];
    return { ...product, plans: [], planId: null, ...(base ? { tagline: `${product.tagline} · ${priceLabel(base)}` } : {}) };
  });
  const activeProducts = products.filter((product) => product.active);

  const tabHref = (id: TabId) => (id === "resumen" ? `/clients/${tenantId}` : `/clients/${tenantId}?tab=${id}`) as Route;
  const phone = info?.whatsapp || info?.phone || null;
  const badge = (id: TabId) => (id === "soporte" && openTickets ? openTickets : id === "notas" && pendingNotes ? pendingNotes : 0);

  return (
    <AppShell title={tenant.name} subtitle="Ficha del cliente" tenantLabel="Admin">
      <Link href={"/clients" as Route} className="vpa-backl">
        ← Clientes
      </Link>

      <section className="adm-hero">
        <span className="ava" aria-hidden="true">
          {tenant.name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="vpa-g1">
          <b>{tenant.name}</b>
          <span>
            {tenant.industry || "Sin rubro"} · cliente desde {adminDate(tenant.createdAt)}
          </span>
        </div>
        <span className={`vpa-tag ${state.cls}`}>
          <i />
          {state.label}
        </span>
        <ClientAccessControls
          tenantId={tenant.id}
          canActivate={billing === "TRIAL"}
          isTestAccount={Boolean(tenant.subscription?.isTestAccount)}
        />
        <ChargeButton tenantId={tenant.id} tenantName={tenant.name} />
      </section>

      <nav className="vpa-seg" aria-label="Ficha del cliente" style={{ alignSelf: "flex-start", maxWidth: "100%", overflowX: "auto" }}>
        {TABS.map((item) => (
          <Link key={item.id} href={tabHref(item.id)} className={tab === item.id ? "on" : undefined} aria-current={tab === item.id ? "page" : undefined}>
            {item.label}
            {badge(item.id) ? <span className="vpa-tag r" style={{ height: 18, padding: "0 6px", marginLeft: 4 }}>{badge(item.id)}</span> : null}
          </Link>
        ))}
      </nav>

      {tab === "resumen" ? (
        <div className="vpa-stack">
          <div className="adm-facts">
            <div className={`adm-fact${owes > 0 ? " warn" : ""}`}>
              <small>Debe</small>
              <b>{owes > 0 ? adminMoney(owes) : "Nada"}</b>
              <em>{overdue ? "Tiene cobros vencidos" : autoDebit?.status === "authorized" ? "Paga solo con Mercado Pago" : "Al día"}</em>
            </div>
            <div className="adm-fact">
              <small>Pagó en total</small>
              <b>{adminMoney(paidTotal)}</b>
              <em>{invoices.filter((invoice) => invoice.paidAt).length} pagos</em>
            </div>
            <div className="adm-fact">
              <small>Productos</small>
              <b>{activeProducts.length ? activeProducts.map((product) => product.name.replace("Vase ", "")).join(", ") : "Ninguno"}</b>
              <em>{tenant.subscription?.currentPeriodEndsAt ? `Hasta el ${adminDate(tenant.subscription.currentPeriodEndsAt)}` : " "}</em>
            </div>
            <div className="adm-fact">
              <small>Soporte</small>
              <b>{openTickets ? `${openTickets} abierto${openTickets === 1 ? "" : "s"}` : "Sin pedidos"}</b>
              <em>{pendingNotes ? `${pendingNotes} nota${pendingNotes === 1 ? "" : "s"} pendiente${pendingNotes === 1 ? "" : "s"}` : " "}</em>
            </div>
          </div>

          <section className="vpa-card stack">
            <div className="vpa-sech">
              <div className="vpa-g1">
                <h3>Contacto</h3>
              </div>
            </div>
            <div className="adm-facts">
              <div className="adm-fact">
                <small>Dueño</small>
                <b>{owner?.name ?? "—"}</b>
                <em>{owner?.email ?? ""}</em>
              </div>
              <div className="adm-fact">
                <small>Correo de facturación</small>
                <b>{tenant.billingEmail ?? info?.email ?? "—"}</b>
              </div>
              <div className="adm-fact">
                <small>Teléfono / WhatsApp</small>
                <b>{phone ?? "—"}</b>
                {phone ? (
                  <em>
                    <a href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ color: "var(--acc-tx)" }}>
                      Abrir WhatsApp
                    </a>
                  </em>
                ) : null}
              </div>
              <div className="adm-fact">
                <small>Último ingreso</small>
                <b>{owner?.lastLoginAt ? adminDate(owner.lastLoginAt) : "Nunca"}</b>
                <em>{tenant.memberships.length} {tenant.memberships.length === 1 ? "persona" : "personas"} en la cuenta</em>
              </div>
            </div>
          </section>

          {tenant.memberships.length > 1 ? (
            <section className="vpa-card" style={{ padding: "12px 20px" }}>
              <div className="vpa-tw">
                <table className="vpa-tbl">
                  <tbody>
                    {tenant.memberships.map((membership) => (
                      <tr key={membership.user.email}>
                        <td className="wrap">
                          <b>{membership.user.name}</b>
                          <span className="sub">{membership.user.email}</span>
                        </td>
                        <td className="vpa-mut">{membership.role === "OWNER" ? "Dueño" : membership.role === "MANAGER" ? "Encargado" : "Equipo"}</td>
                        <td className="r vpa-mut">{membership.user.lastLoginAt ? `Entró el ${adminDate(membership.user.lastLoginAt)}` : "Nunca entró"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "productos" ? (
        <div className="adm-prods">
          {products.map((product) => (
            <ClientProductCard key={product.moduleId} tenantId={tenant.id} product={product} />
          ))}
        </div>
      ) : null}

      {tab === "cobros" ? (
        <section className="vpa-card" style={{ padding: "12px 20px" }}>
          <div className="vpa-sech" style={{ marginTop: 8 }}>
            <div className="vpa-g1">
              <h3>Cobros</h3>
              <p>{owes > 0 ? `Debe ${adminMoney(owes)}` : "No debe nada."}</p>
            </div>
            <ChargeButton tenantId={tenant.id} tenantName={tenant.name} />
          </div>
          {invoices.length === 0 ? (
            <div className="vpa-empty" style={{ marginBottom: 8 }}>Todavía no tiene cobros.</div>
          ) : (
            <div className="vpa-tw">
              <table className="vpa-tbl">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Vence</th>
                    <th className="r">Monto</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const invoiceTag = invoiceState(invoice, now.getTime());
                    return (
                      <tr key={invoice.id}>
                        <td className="wrap">
                          <b>{invoice.concept}</b>
                          <span className="sub">{invoice.paidAt ? `Pagado el ${adminDate(invoice.paidAt)}${invoice.method ? ` · ${invoice.method}` : ""}` : `Creado el ${adminDate(invoice.createdAt)}`}</span>
                        </td>
                        <td className="vpa-mut">{adminDate(invoice.dueAt)}</td>
                        <td className="r">{adminMoney(Number(invoice.totalAmount))}</td>
                        <td>
                          <span className={`vpa-tag ${invoiceTag.cls}`}>
                            <i />
                            {invoiceTag.label}
                          </span>
                        </td>
                        <td className="r">
                          {Number(invoice.paidAmount) > 0 ? (
                            <a className="vpa-btn line sm" href={`/api/admin/billing-receipts/${invoice.id}`} title="Comprobante">
                              <Download size={14} aria-hidden="true" />
                            </a>
                          ) : null}
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
            <div className="vpa-g1">
              <h3>Pedidos de soporte</h3>
              <p>{openTickets ? `${openTickets} sin terminar` : "No tiene pedidos abiertos."}</p>
            </div>
            <a href={resolveWorkspaceUrl("/?ver=tickets")} className="vpa-btn line sm">
              <ExternalLink size={14} aria-hidden="true" />
              Abrir Workspace
            </a>
          </div>
          {tickets.length === 0 ? (
            <div className="vpa-empty" style={{ marginBottom: 8 }}>No tiene tickets.</div>
          ) : (
            <div className="vpa-tw">
              <table className="vpa-tbl">
                <tbody>
                  {tickets.map((ticket) => {
                    const ticketTag = ADMIN_TICKET_STATUS[ticket.status] ?? { label: ticket.status, cls: "" };
                    return (
                      <tr key={ticket.id}>
                        <td className="wrap">
                          <a href={resolveWorkspaceUrl(`/i/T-${ticket.id}`)} style={{ color: "inherit" }}>
                            <b>{ticket.subject}</b>
                          </a>
                          <span className="sub">
                            {adminDate(ticket.createdAt)}
                            {ticket.labsConversationId ? " · por WhatsApp" : ""}
                          </span>
                        </td>
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

      {tab === "notas" ? (
        <ClientNotes
          tenantId={tenant.id}
          notes={notes.map((note) => ({
            id: note.id,
            body: note.body,
            done: note.done,
            author: noteAuthors.find((author) => author.id === note.authorUserId)?.name ?? "Equipo",
            at: note.createdAt.toISOString(),
          }))}
        />
      ) : null}
    </AppShell>
  );
}
