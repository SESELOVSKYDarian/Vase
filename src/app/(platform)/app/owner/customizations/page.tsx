import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ClientCustomQuoteResponseForm } from "@/components/business/client-custom-quote-response-form";
import { StatusBadge } from "@/components/business/status-badge";
import { PanelCard } from "@/components/ui/panel-card";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import {
  formatMoneyFromCents,
  getQuoteStatusLabel,
  getQuoteStatusTone,
  getQuoteTemplateLabel,
} from "@/lib/business/custom-quotes";
import { getTenantCustomizationQuoteWorkspace } from "@/server/queries/custom-quotes";

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function OwnerCustomizationsPage() {
  let membership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const workspace = await getTenantCustomizationQuoteWorkspace(membership.tenantId);

  return (
    <AppShell
      title="Presupuestos y personalizaciones"
      subtitle="Sigue cada pedido premium, revisa el alcance comercial y acepta o rechaza presupuestos desde un flujo claro."
      tenantLabel={membership.tenant.name}
    >
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <PanelCard title="Pedidos" description="Solicitudes creadas por tu equipo.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {workspace.metrics.totalRequests}
          </p>
        </PanelCard>
        <PanelCard title="En revisión" description="Aún sin presupuesto final.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {workspace.metrics.pendingReview}
          </p>
        </PanelCard>
        <PanelCard title="Pendiente de tu decisión" description="Presupuestos enviados por Vase.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {workspace.metrics.pendingClient}
          </p>
        </PanelCard>
        <PanelCard title="Aceptados" description="Listos para pasar a producción.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {workspace.metrics.accepted}
          </p>
        </PanelCard>
      </section>

      <PanelCard
        eyebrow="Flujo comercial"
        title="Tus pedidos premium"
        description="Cada pedido mantiene contexto de negocio, presupuesto, extras por categoría, observaciones y registro de cambios."
      >
        <div className="grid gap-5">
          {workspace.requests.length === 0 ? (
            <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm leading-7 text-[var(--muted)]">
              Todavía no tienes pedidos premium. Cuando envíes una personalización avanzada desde
              Vase Business, este espacio mostrará el presupuesto y su evolución.
            </div>
          ) : (
            workspace.requests.map((request) => (
              <article
                key={request.id}
                className="grid gap-5 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]/75 p-5"
              >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                    Solicitud premium
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
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Colores deseados</p>
                  <p>{request.desiredColors ?? "Sin detalle"}</p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Estilo de marca</p>
                  <p>{request.brandStyle ?? "Sin detalle"}</p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Funciones deseadas</p>
                  <p>{request.desiredFeatures ?? "Sin detalle"}</p>
                </div>
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

                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] p-4">
                    <p className="font-semibold text-[var(--foreground)]">Resumen comercial</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {request.quote.clientSummary}
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

                  {request.quote.status === "PENDING_CLIENT" ? (
                    <ClientCustomQuoteResponseForm quoteId={request.quote.id} />
                  ) : (
                    <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                      Última respuesta del cliente:{" "}
                      {request.quote.clientResponseMessage ?? "Sin mensaje adicional"}.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                  Tu pedido está siendo revisado por el equipo Vase. Cuando el presupuesto esté
                  listo, aparecerá aquí con el desglose de extras, tiempos estimados y condiciones.
                </div>
              )}

              {request.quote?.revisions.length ? (
                <div className="grid gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                    Historial de cambios
                  </p>
                  {request.quote.revisions.map((revision) => (
                    <div key={revision.id} className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">{revision.revisionType}</p>
                        <p className="text-sm text-[var(--muted)]">{formatDate(revision.createdAt)}</p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{revision.summary}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              </article>
            ))
          )}
        </div>
      </PanelCard>
    </AppShell>
  );
}
