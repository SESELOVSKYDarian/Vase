import Link from "next/link";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { StatusBadge } from "@/components/business/status-badge";
import { IntegrationCredentialForm } from "@/components/business/integration-credential-form";
import { IntegrationCredentialRowActions } from "@/components/business/integration-credential-row-actions";
import { IntegrationWebhookForm } from "@/components/business/integration-webhook-form";
import { IntegrationWebhookRowActions } from "@/components/business/integration-webhook-row-actions";
import { webhookEventCatalog } from "@/config/integrations";
import { prisma } from "@/lib/db/prisma";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { summarizeScopes, getOwnerIntegrationDashboard } from "@/server/queries/integrations";

function formatDate(value: Date | null) {
  if (!value) {
    return "Sin actividad";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function OwnerIntegrationsApiPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  let membership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const { site } = await searchParams;
  const [dashboard, selectedSite] = await Promise.all([
    getOwnerIntegrationDashboard(membership.tenantId),
    site
      ? prisma.storefrontPage.findFirst({
          where: {
            id: site,
            tenantId: membership.tenantId,
          },
          include: {
            domainConnections: {
              orderBy: { createdAt: "desc" },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  return (
    <AppShell
      title="Integraciones API"
      subtitle="Gestiona credenciales, webhooks, limites y documentacion privada para conectar Vase Business con tus sistemas de gestion."
      tenantLabel={membership.tenant.name}
    >
      <PanelCard
        eyebrow="Developer Portal"
        title="Gestion privada de integraciones"
        description="Esta vista organiza credenciales seguras por tenant, limites de consumo, logs de uso y webhooks con foco en seguridad fuerte y operacion no tecnica."
        actions={
          <Link href="/developers/api" className="text-sm font-semibold text-[var(--accent)]">
            Ver portal publico
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
            <p className="text-sm text-[var(--muted)]">Credenciales</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {dashboard.credentials.length}
            </p>
          </div>
          <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
            <p className="text-sm text-[var(--muted)]">Webhooks</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {dashboard.webhooks.length}
            </p>
          </div>
          <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
            <p className="text-sm text-[var(--muted)]">Ultimos requests</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {dashboard.usageLogs.length}
            </p>
          </div>
        </div>
      </PanelCard>

      {selectedSite ? (
        <PanelCard
          eyebrow="Contexto de sitio"
          title={`Integraciones para ${selectedSite.name}`}
          description="Estas credenciales y webhooks se estan configurando desde el contexto de un sitio concreto. Usa nombres y destinos pensados para esa web y su sistema de gestion."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
              <p className="text-sm text-[var(--muted)]">Slug del sitio</p>
              <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">/{selectedSite.slug}</p>
            </div>
            <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
              <p className="text-sm text-[var(--muted)]">Dominios asociados</p>
              <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                {selectedSite.domainConnections.length}
              </p>
            </div>
            <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
              <p className="text-sm text-[var(--muted)]">Editor del sitio</p>
              <Link
                href={`/app/owner/pages/${selectedSite.id}`}
                className="mt-2 inline-flex text-sm font-semibold text-[var(--accent)]"
              >
                Volver a la administración
              </Link>
            </div>
          </div>
        </PanelCard>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <PanelCard
          eyebrow="API keys"
          title="Credenciales seguras por cuenta"
          description="Cada integracion debe tener su propia API key, con scopes y limites por minuto. La clave completa se muestra una sola vez."
        >
          <IntegrationCredentialForm />
        </PanelCard>

        <PanelCard
          eyebrow="Webhooks"
          title="Suscripciones salientes"
          description="Configura destinos para eventos de pedidos, catalogo y clientes. Vase firma los envios con un secreto por webhook."
        >
          <IntegrationWebhookForm />
        </PanelCard>
      </section>

      <PanelCard
        eyebrow="Credenciales activas"
        title="Estado de API keys"
        description="Rotacion, revocacion y alcance visible para cada integracion del tenant."
      >
        <div className="grid gap-4">
          {dashboard.credentials.length === 0 ? (
            <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm leading-7 text-[var(--muted)]">
              Aun no hay credenciales registradas.
            </div>
          ) : (
            dashboard.credentials.map((credential) => (
              <div
                key={credential.id}
                className="grid gap-4 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5 lg:grid-cols-[1.1fr_0.9fr]"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-[var(--foreground)]">{credential.name}</p>
                    <StatusBadge
                      tone={credential.status === "ACTIVE" ? "success" : "neutral"}
                      label={credential.status}
                    />
                  </div>
                  <p className="font-mono text-xs text-[var(--muted)]">{credential.keyPrefix}</p>
                  <p className="text-sm leading-7 text-[var(--muted)]">
                    Scopes: {summarizeScopes(credential.scopes).join(", ")}
                  </p>
                  <p className="text-sm leading-7 text-[var(--muted)]">
                    Limite: {credential.requestsPerMinute} req/min. Ultimo uso:{" "}
                    {formatDate(credential.lastUsedAt)}.
                  </p>
                </div>
                <IntegrationCredentialRowActions credentialId={credential.id} />
              </div>
            ))
          )}
        </div>
      </PanelCard>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <PanelCard
          eyebrow="Uso"
          title="Logs de consumo recientes"
          description="Trazabilidad rapida de requests entrantes por tenant, credencial, scope y status."
        >
          <div className="grid gap-3">
            {dashboard.usageLogs.length === 0 ? (
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm leading-7 text-[var(--muted)]">
                Aun no hay requests de integracion registrados.
              </div>
            ) : (
              dashboard.usageLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4"
                >
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">
                      {log.method} {log.route}
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      Scope: {log.scope}. Status: {log.statusCode}. Latencia: {log.latencyMs} ms.
                    </p>
                  </div>
                  <p className="text-xs text-[var(--muted-soft)]">{formatDate(log.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </PanelCard>

        <PanelCard
          eyebrow="Webhook status"
          title="Destinos registrados"
          description="Control simple sobre el estado operativo de cada suscripcion saliente."
        >
          <div className="grid gap-4">
            {dashboard.webhooks.length === 0 ? (
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm leading-7 text-[var(--muted)]">
                Todavia no hay webhooks configurados.
              </div>
            ) : (
              dashboard.webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="grid gap-4 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5 lg:grid-cols-[1.1fr_0.9fr]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-semibold text-[var(--foreground)]">{webhook.name}</p>
                      <StatusBadge
                        tone={webhook.status === "ACTIVE" ? "success" : "warning"}
                        label={webhook.status}
                      />
                    </div>
                    <p className="text-sm leading-7 text-[var(--muted)]">{webhook.url}</p>
                    <p className="text-sm leading-7 text-[var(--muted)]">
                      Eventos: {Array.isArray(webhook.eventTypes) ? webhook.eventTypes.join(", ") : "Sin eventos"}.
                    </p>
                  </div>
                  <IntegrationWebhookRowActions webhookId={webhook.id} />
                </div>
              ))
            )}
          </div>
        </PanelCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <PanelCard
          eyebrow="Referencia privada"
          title="Endpoints y scopes"
          description="Resumen rapido del diseño REST versionado para equipos que conectan sistemas de gestion."
        >
          <div className="grid gap-3">
            {dashboard.endpointCatalog.map((endpoint) => (
              <div key={endpoint.path} className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                <p className="font-semibold text-[var(--foreground)]">
                  {endpoint.method} <span className="font-mono text-sm">{endpoint.path}</span>
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{endpoint.summary}</p>
                <p className="mt-2 text-xs text-[var(--muted-soft)]">Scope requerido: {endpoint.scope}</p>
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard
          eyebrow="Eventos"
          title="Catalogo de webhooks"
          description="Eventos orientados a operaciones comerciales y sincronizacion de datos."
        >
          <div className="grid gap-3">
            {webhookEventCatalog.map((event) => (
              <div key={event.key} className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                <p className="font-semibold text-[var(--foreground)]">{event.key}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{event.description}</p>
              </div>
            ))}
          </div>
        </PanelCard>
      </section>
    </AppShell>
  );
}
