import type { Route } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  MeetingsPanel,
  ProgressForm,
  PublishPanel,
  QuoteEditor,
  RequestStatusForm,
} from "@/components/admin/customization-detail";
import { REQUEST_STATUS } from "@/lib/admin/customization-status";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getQuoteStatusLabel } from "@/lib/business/custom-quotes";

const TABS = [
  { id: "pedido", label: "Pedido" },
  { id: "presupuesto", label: "Presupuesto" },
  { id: "avance", label: "Avance" },
  { id: "reuniones", label: "Reuniones" },
  { id: "publicar", label: "Publicar" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default async function AdminCustomizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const { requestId } = await params;
  const requested = (await searchParams).tab;
  const tab: TabId = TABS.find((item) => item.id === requested)?.id ?? "pedido";

  const request = await prisma.customPageRequest.findUnique({
    where: { id: requestId },
    include: {
      tenant: { select: { id: true, name: true, accountName: true } },
      storefrontPage: { select: { name: true, slug: true } },
      quote: { include: { lineItems: { orderBy: { sortOrder: "asc" } } } },
      milestones: { orderBy: { stage: "asc" } },
      meetings: { orderBy: { type: "asc" } },
    },
  });
  if (!request) notFound();

  const slots =
    tab === "reuniones"
      ? await prisma.meetingAvailabilitySlot.findMany({
          where: { tenantId: request.tenantId, isActive: true, endsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
          take: 20,
          select: { id: true, startsAt: true, endsAt: true, capacity: true, reservedCount: true },
        })
      : [];

  const quote = request.quote;
  const quoteStatus = quote?.status;
  const sent = Boolean(quoteStatus && quoteStatus !== "DRAFT");
  const accepted = quoteStatus === "ACCEPTED";
  const working = request.status === "IN_PROGRESS" || request.status === "DELIVERED";
  const delivered = request.status === "DELIVERED";
  const steps = [
    { label: "Pedido", done: true, tab: "pedido" as TabId },
    { label: "Presupuesto enviado", done: sent, tab: "presupuesto" as TabId },
    { label: "Aceptado", done: accepted || working, tab: "presupuesto" as TabId },
    { label: "En marcha", done: working, tab: "avance" as TabId },
    { label: "Entregado", done: delivered, tab: "publicar" as TabId },
  ];
  const currentStep = steps.findIndex((step) => !step.done);

  const next: { label: string; tab: TabId } | null = !quote
    ? { label: "Armar presupuesto", tab: "presupuesto" }
    : quoteStatus === "DRAFT"
      ? { label: "Enviar presupuesto", tab: "presupuesto" }
      : accepted && !working
        ? { label: "Cargar avance", tab: "avance" }
        : working && !delivered
          ? { label: "Publicar sitio", tab: "publicar" }
          : null;

  const base = `/customizations/${request.id}`;
  const tabHref = (id: TabId) => (id === "pedido" ? base : `${base}?tab=${id}`) as Route;
  const status = REQUEST_STATUS[request.status] ?? REQUEST_STATUS.SUBMITTED;
  const created = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(request.createdAt);

  const facts = [
    { label: "Qué quiere lograr", value: request.businessObjective },
    { label: "Sobre el negocio", value: request.businessDescription },
    { label: "Estilo", value: request.brandStyle },
    { label: "Colores", value: request.desiredColors },
    { label: "Funciones", value: request.desiredFeatures },
    { label: "Integraciones", value: request.requiredIntegrations },
    { label: "Referencias", value: request.visualReferences ?? request.designReferences },
    { label: "Notas del cliente", value: request.observations ?? request.notes },
  ].filter((fact) => fact.value && fact.value.trim());

  return (
    <AppShell title={request.pageScope} subtitle="Pedido a medida" tenantLabel="Admin">
      <Link href={"/customizations" as Route} className="vpa-backl">
        ← Pedidos
      </Link>

      <section className="adm-hero">
        <span className="ava" aria-hidden="true">
          {request.tenant.name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="vpa-g1">
          <b>{request.pageScope}</b>
          <span>
            <Link href={`/clients/${request.tenant.id}` as Route} style={{ color: "inherit" }}>
              {request.tenant.name}
            </Link>{" "}
            · pedido el {created}
            {quote ? ` · presupuesto ${getQuoteStatusLabel(quote.status).toLowerCase()}` : ""}
          </span>
        </div>
        <span className={`vpa-tag ${status.tone}`}>
          <i />
          {status.label}
        </span>
        {next ? (
          <Link href={tabHref(next.tab)} className="vpa-btn acc">
            {next.label} →
          </Link>
        ) : null}
      </section>

      <ol className="adm-steps" aria-label="En qué va el pedido">
        {steps.map((step, index) => (
          <li key={step.label} className={step.done ? "done" : index === currentStep ? "now" : undefined}>
            <Link href={tabHref(step.tab)}>
              <i aria-hidden="true">{step.done ? "✓" : index + 1}</i>
              <span>{step.label}</span>
            </Link>
          </li>
        ))}
      </ol>

      <nav className="vpa-seg" aria-label="Partes del pedido" style={{ alignSelf: "flex-start", maxWidth: "100%", overflowX: "auto" }}>
        {TABS.map((item) => (
          <Link key={item.id} href={tabHref(item.id)} className={tab === item.id ? "on" : undefined} aria-current={tab === item.id ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "pedido" ? (
        <div className="adm-split">
          <section className="vpa-card adm-panel">
            <header>
              <h3>Lo que pidió</h3>
              <p>{request.premiumRequested ? "Pidió trabajo a medida (con costo)." : "Cambio sin cargo."}</p>
            </header>
            {facts.length ? (
              <dl className="adm-read">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="vpa-empty">El cliente no dejó más detalle.</div>
            )}
          </section>
          <RequestStatusForm requestId={request.id} status={request.status} priceLabel={request.quotedPriceLabel} notes={request.reviewNotes} />
        </div>
      ) : null}

      {tab === "presupuesto" ? <QuoteEditor requestId={request.id} quote={quote} /> : null}

      {tab === "avance" ? (
        <ProgressForm
          requestId={request.id}
          tenantId={request.tenant.id}
          milestones={request.milestones.map((row) => ({ stage: row.stage, progressPercent: row.progressPercent, notes: row.notes }))}
        />
      ) : null}

      {tab === "reuniones" ? (
        <MeetingsPanel
          requestId={request.id}
          tenantId={request.tenant.id}
          meetings={request.meetings.map((row) => ({ type: row.type, status: row.status, meetingUrl: row.meetingUrl, isEnabledByAdmin: row.isEnabledByAdmin }))}
          slots={slots}
        />
      ) : null}

      {tab === "publicar" ? (
        <PublishPanel requestId={request.id} tenantId={request.tenant.id} pageScope={request.pageScope} published={request.storefrontPage} />
      ) : null}
    </AppShell>
  );
}
