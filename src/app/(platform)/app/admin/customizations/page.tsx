import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminCustomizationQuoteForm } from "@/components/admin/admin-customization-quote-form";
import { AdminCustomizationReviewForm } from "@/components/business/admin-customization-review-form";
import { StatusBadge } from "@/components/business/status-badge";
import { PanelCard } from "@/components/ui/panel-card";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import {
  formatMoneyFromCents,
  getQuoteStatusLabel,
  getQuoteStatusTone,
  getQuoteTemplateLabel,
} from "@/lib/business/custom-quotes";
import { getAdminCustomizationQuoteWorkspace } from "@/server/queries/custom-quotes";

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminCustomizationsPage() {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const workspace = await getAdminCustomizationQuoteWorkspace();

  return (
    <AppShell
      title="Pipeline de presupuestos"
      subtitle="Convierte pedidos de personalización en presupuestos versionados, auditables y listos para aceptación del cliente."
      tenantLabel="Operación interna Vase"
    >
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <PanelCard title="Pedidos" description="Solicitudes visibles para el equipo.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {workspace.metrics.totalRequests}
          </p>
        </PanelCard>
        <PanelCard title="Sin presupuesto" description="Pedidos aún sin armado comercial.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {workspace.metrics.withoutQuote}
          </p>
        </PanelCard>
        <PanelCard title="Pendiente cliente" description="Presupuestos ya enviados.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {workspace.metrics.pendingClient}
          </p>
        </PanelCard>
        <PanelCard title="Aceptados" description="Listos para pasar a delivery.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {workspace.metrics.accepted}
          </p>
        </PanelCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <PanelCard
          eyebrow="Workflow"
          title="Revisión, estimación y decisión"
          description="Cada pedido conserva alcance, presupuesto, extras, tiempos estimados y el historial completo de cambios."
        >
          <div className="grid gap-5">
            {workspace.requests.map((request) => (
              <article
                key={request.id}
                className="grid gap-5 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]/75 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                      {request.tenant.accountName}
                    </p>
                    <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                      {request.pageScope}
                    </h2>
                    <p className="max-w-3xl text-sm leading-7 text-[var(--muted)]">
                      {request.businessDescription ?? request.businessObjective}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone="premium" label={request.status} />
                    {request.quote ? (
                      <StatusBadge
                        tone={getQuoteStatusTone(request.quote.status)}
                        label={getQuoteStatusLabel(request.quote.status)}
                      />
                    ) : (
                      <StatusBadge tone="warning" label="Sin presupuesto" />
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                    <p className="font-semibold text-[var(--foreground)]">Diseno</p>
                    <p>{request.brandStyle ?? "Sin detalle"}</p>
                  </div>
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                    <p className="font-semibold text-[var(--foreground)]">Funciones</p>
                    <p>{request.desiredFeatures ?? "Sin detalle"}</p>
                  </div>
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                    <p className="font-semibold text-[var(--foreground)]">Integraciones</p>
                    <p>{request.requiredIntegrations ?? "Sin integraciones adicionales"}</p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                  <AdminCustomizationReviewForm
                    requestId={request.id}
                    currentStatus={request.status}
                    quotedPriceLabel={request.quotedPriceLabel}
                    reviewNotes={request.reviewNotes}
                  />
                  <AdminCustomizationQuoteForm requestId={request.id} quote={request.quote} />
                </div>

                {request.quote ? (
                  <div className="grid gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">
                          {request.quote.quoteNumber} · {getQuoteTemplateLabel(request.quote.templateKey)}
                        </p>
                        <p className="text-sm leading-6 text-[var(--muted)]">
                          {formatMoneyFromCents(
                            request.quote.totalAmountCents,
                            request.quote.currency,
                          )}{" "}
                          · entrega estimada en {request.quote.estimatedDeliveryDays} días
                        </p>
                      </div>
                      <p className="text-sm text-[var(--muted)]">
                        Válido hasta {formatDate(request.quote.validUntil)}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm">
                        <thead>
                          <tr className="text-[var(--muted-soft)]">
                            <th className="px-4">Concepto</th>
                            <th className="px-4">Detalle</th>
                            <th className="px-4">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {request.quote.lineItems.map((line) => (
                            <tr key={line.id} className="bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] text-[var(--foreground)]">
                              <td className="rounded-l-3xl px-4 py-4 font-semibold">{line.label}</td>
                              <td className="px-4 py-4 text-[var(--muted)]">
                                {line.description ?? "Sin detalle adicional"}
                              </td>
                              <td className="rounded-r-3xl px-4 py-4">
                                {formatMoneyFromCents(
                                  line.totalAmountCents,
                                  request.quote!.currency,
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </PanelCard>

        <PanelCard
          eyebrow="Trazabilidad"
          title="Historial de cambios"
          description="Cada ajuste comercial o decisión del cliente queda versionado para auditoría y seguimiento."
        >
          <div className="grid gap-3">
            {workspace.recentRevisions.map((revision) => (
              <div key={revision.id} className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-[var(--foreground)]">{revision.revisionType}</p>
                  <p className="text-sm text-[var(--muted)]">{formatDate(revision.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{revision.summary}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {revision.quote.customPageRequest.tenant.accountName} ·{" "}
                  {revision.changedByUser?.email ?? "Sistema"}
                </p>
              </div>
            ))}
          </div>
        </PanelCard>
      </section>
    </AppShell>
  );
}
