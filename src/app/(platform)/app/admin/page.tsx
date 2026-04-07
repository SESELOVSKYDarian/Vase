import Link from "next/link";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminCustomizationQuoteForm } from "@/components/admin/admin-customization-quote-form";
import { AdminCustomizationReviewForm } from "@/components/business/admin-customization-review-form";
import { StatusBadge } from "@/components/business/status-badge";
import { AdminFeatureFlagToggleForm } from "@/components/admin/admin-feature-flag-toggle-form";
import { AdminSupportTemplateForm } from "@/components/admin/admin-support-template-form";
import { AdminSupportUserForm } from "@/components/admin/admin-support-user-form";
import { AdminTenantGovernanceForm } from "@/components/admin/admin-tenant-governance-form";
import { AdminUserGovernanceForm } from "@/components/admin/admin-user-governance-form";
import { PanelCard } from "@/components/ui/panel-card";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { getQuoteStatusLabel, getQuoteStatusTone } from "@/lib/business/custom-quotes";
import { getBillingLabel, getPlanLabel } from "@/lib/business/plans";
import {
  getSupportPriorityLabel,
  getSupportPriorityTone,
  getSupportStatusLabel,
  getSupportTicketTone,
} from "@/lib/support/tickets";
import { getPlatformAdminConsole, type AdminConsoleFilters } from "@/server/queries/admin";

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function tenantStatusTone(status: string) {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "SUSPENDED":
      return "danger";
    default:
      return "warning";
  }
}

function integrationTone(status: string) {
  switch (status) {
    case "ACTIVE":
    case "CONNECTED":
      return "success";
    case "FAILED":
    case "REVOKED":
    case "ERROR":
      return "danger";
    case "PAUSED":
    case "ROTATED":
    case "PENDING":
      return "warning";
    default:
      return "neutral";
  }
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const params = await searchParams;
  const filters: AdminConsoleFilters = {
    q: getStringParam(params.q),
    product: (getStringParam(params.product) as AdminConsoleFilters["product"]) ?? "ALL",
    tenantStatus:
      (getStringParam(params.tenantStatus) as AdminConsoleFilters["tenantStatus"]) ?? "ALL",
    billingStatus:
      (getStringParam(params.billingStatus) as AdminConsoleFilters["billingStatus"]) ?? "ALL",
    supportStatus:
      (getStringParam(params.supportStatus) as AdminConsoleFilters["supportStatus"]) ?? "ALL",
  };

  const dashboard = await getPlatformAdminConsole(filters);
  type AdminUser = (typeof dashboard.users)[number];
  type AdminTenant = (typeof dashboard.tenants)[number];
  type AdminPage = (typeof dashboard.temporaryPages)[number];
  type AdminRequest = (typeof dashboard.customRequests)[number];
  type AdminAuditLog = (typeof dashboard.auditLogs)[number];
  type AdminSupportTemplate = (typeof dashboard.supportTemplates)[number];
  type AdminSupportTicket = (typeof dashboard.supportTickets)[number];
  type AdminFlag = (typeof dashboard.featureFlags)[number];
  type AdminCredential = (typeof dashboard.integrationCredentials)[number];
  type AdminWebhook = (typeof dashboard.integrationWebhooks)[number];

  return (
    <AppShell
      title="Platform Admin"
      subtitle="Control plane enterprise para gobierno de usuarios, tenants, soporte, integraciones, billing, seguridad y operaciones internas de Vase."
      tenantLabel="Vision global de plataforma"
    >
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <PanelCard title="Usuarios" description="Base total de identidades.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {dashboard.metrics.totalUsers}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Roles de soporte: {dashboard.metrics.supportUsers}
          </p>
        </PanelCard>
        <PanelCard title="Tenants" description="Cuentas activas y en trial.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {dashboard.metrics.totalTenants}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Pagos activos: {dashboard.metrics.paidTenants}
          </p>
        </PanelCard>
        <PanelCard title="Soporte" description="Carga activa del equipo interno.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {dashboard.metrics.activeSupportTickets}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Agentes soporte: {dashboard.metrics.supportUsers}
          </p>
        </PanelCard>
        <PanelCard title="Temporales" description="Páginas ecommerce con lifecycle acotado.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {dashboard.metrics.temporaryPageCount}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            En riesgo: {dashboard.metrics.tempPagesAtRisk}
          </p>
        </PanelCard>
        <PanelCard title="Premium" description="Flags y upgrades activos.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {dashboard.metrics.premiumFlagsEnabled}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Credenciales API activas: {dashboard.metrics.activeCredentials}
          </p>
        </PanelCard>
      </section>

      <PanelCard
        eyebrow="Filtros"
        title="Consulta transversal"
        description="Filtra por texto, producto, estado del tenant, billing y estado de soporte para revisar la plataforma sin perder contexto."
      >
        <form action="/app/admin" className="grid gap-4 lg:grid-cols-[2fr_repeat(4,1fr)_auto]">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Buscar</span>
            <input
              name="q"
              defaultValue={dashboard.filters.q ?? ""}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
              placeholder="Tenant, usuario, ticket, log o integración"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Producto</span>
            <select
              name="product"
              defaultValue={dashboard.filters.product ?? "ALL"}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            >
              <option value="ALL">Todos</option>
              <option value="BUSINESS">Business</option>
              <option value="LABS">Labs</option>
              <option value="BOTH">Ambos</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Tenant</span>
            <select
              name="tenantStatus"
              defaultValue={dashboard.filters.tenantStatus ?? "ALL"}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activo</option>
              <option value="TRIAL">Trial</option>
              <option value="SUSPENDED">Suspendido</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Cobro</span>
            <select
              name="billingStatus"
              defaultValue={dashboard.filters.billingStatus ?? "ALL"}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            >
              <option value="ALL">Todos</option>
              <option value="TRIAL">Trial</option>
              <option value="ACTIVE">Activo</option>
              <option value="PAST_DUE">Pendiente</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Soporte</span>
            <select
              name="supportStatus"
              defaultValue={dashboard.filters.supportStatus ?? "ALL"}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            >
              <option value="ALL">Todos</option>
              <option value="QUEUED">En cola</option>
              <option value="ASSIGNED">Asignado</option>
              <option value="WAITING_CUSTOMER">Esperando cliente</option>
              <option value="WAITING_INTERNAL">Esperando interno</option>
              <option value="RESOLVED">Resuelto</option>
              <option value="RETURNED_TO_AI">Devuelto a IA</option>
              <option value="CLOSED">Cerrado</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="min-h-11 w-full rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              Aplicar
            </button>
          </div>
        </form>
      </PanelCard>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PanelCard
          eyebrow="Usuarios"
          title="Identidades internas y clientes"
          description="Gestiona rol de plataforma, bloqueo administrativo y membresías visibles por usuario."
        >
          <div className="grid gap-4">
            {dashboard.users.length === 0 ? (
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm leading-7 text-[var(--muted)]">
                No hay usuarios para los filtros actuales.
              </div>
            ) : (
              dashboard.users.map((user: AdminUser) => (
                <div key={user.id} className="grid gap-4 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]/75 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--foreground)]">{user.name}</h3>
                      <p className="text-sm leading-6 text-[var(--muted)]">{user.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone="info" label={user.platformRole} />
                      <StatusBadge tone="success" label="Habilitado" />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                      Verificado: {user.emailVerified ? "si" : "no"}
                    </div>
                    <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                      Ultimo acceso: {formatDate(user.lastLoginAt)}
                    </div>
                    <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                      Tenants: {user.memberships.length}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {user.memberships.length === 0 ? (
                      <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)] md:col-span-3">
                        Este usuario no tiene memberships activas.
                      </div>
                    ) : (
                      user.memberships.map((membership) => (
                        <div key={membership.id} className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                          <p className="font-semibold text-[var(--foreground)]">{membership.tenant.accountName}</p>
                          <p>{membership.role}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <AdminUserGovernanceForm
                    userId={user.id}
                    platformRole={user.platformRole}
                  />
                </div>
              ))
            )}
          </div>
        </PanelCard>

        <PanelCard
          eyebrow="Usuarios internos"
          title="Crear soporte o super admin"
          description="Provisiona acceso interno con password temporal y rol explícito de plataforma."
        >
          <AdminSupportUserForm />
        </PanelCard>
      </section>

      <PanelCard
        eyebrow="Tenants"
        title="Gobierno comercial y operativo de cuentas"
        description="Revisa qué producto tiene cada cuenta, si pagó, el estado del tenant y controla premium, dominios y temporales."
      >
        <div className="grid gap-5">
          {dashboard.tenants.length === 0 ? (
            <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm leading-7 text-[var(--muted)]">
              No hay tenants para los filtros aplicados.
            </div>
          ) : (
            dashboard.tenants.map((tenant: AdminTenant) => (
              <div key={tenant.id} className="grid gap-4 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]/75 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                      {tenant.accountName}
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{tenant.name}</h3>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      Producto: {tenant.onboardingProduct}. Rubro: {tenant.industry}.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={tenantStatusTone(tenant.status)} label={tenant.status} />
                    <StatusBadge
                      tone="info"
                      label={getBillingLabel(tenant.subscription?.billingStatus ?? "TRIAL")}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                    Plan: {getPlanLabel(tenant.subscription?.plan ?? "START")}
                  </div>
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                    Páginas: {tenant._count.storefrontPages}
                  </div>
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                    Personalizaciones: {tenant._count.customPageRequests}
                  </div>
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                    Tickets: {tenant._count.supportTickets}
                  </div>
                </div>

                <AdminTenantGovernanceForm
                  tenantId={tenant.id}
                  status={tenant.status}
                  plan={tenant.subscription?.plan ?? "START"}
                  billingStatus={tenant.subscription?.billingStatus ?? "TRIAL"}
                  premiumEnabled={tenant.subscription?.premiumEnabled ?? false}
                  customDomainEnabled={tenant.subscription?.customDomainEnabled ?? false}
                  temporaryPagesEnabled={tenant.subscription?.temporaryPagesEnabled ?? true}
                />
              </div>
            ))
          )}
        </div>
      </PanelCard>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PanelCard
          eyebrow="Temporales"
          title="Estado de páginas temporales"
          description="Control rápido sobre vencimientos, gracia y páginas en riesgo de removal."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm">
              <thead>
                <tr className="text-[var(--muted-soft)]">
                  <th className="px-4">Tenant</th>
                  <th className="px-4">Página</th>
                  <th className="px-4">Estado</th>
                  <th className="px-4">Ciclo</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.temporaryPages.map((page: AdminPage) => (
                  <tr key={page.id} className="bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] text-[var(--foreground)]">
                    <td className="rounded-l-3xl px-4 py-4">{page.tenant.accountName}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{page.name}</p>
                      <p className="text-xs text-[var(--muted)]">/{page.slug}</p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge tone="warning" label={page.status} />
                    </td>
                    <td className="rounded-r-3xl px-4 py-4 text-[var(--muted)]">
                      {page.lifecycle.label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelCard>

        <PanelCard
          eyebrow="Pedidos personalizados"
          title="Cotización y seguimiento"
          description="Admin puede revisar el pedido, generar presupuesto con extras, enviarlo al cliente y mantener trazabilidad completa."
          actions={
            <Link href="/app/admin/customizations" className="text-sm font-semibold text-[var(--accent)]">
              Abrir pipeline completo
            </Link>
          }
        >
          <div className="grid gap-4">
            {dashboard.customRequests.length === 0 ? (
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm leading-7 text-[var(--muted)]">
                No hay pedidos para los filtros aplicados.
              </div>
            ) : (
              dashboard.customRequests.map((request: AdminRequest) => (
                <div key={request.id} className="grid gap-4 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]/75 p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                      {request.tenant.accountName}
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{request.pageScope}</h3>
                    <p className="text-sm leading-7 text-[var(--muted)]">
                      {request.businessDescription ?? request.businessObjective}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {request.quote ? (
                      <>
                        <StatusBadge
                          tone={getQuoteStatusTone(request.quote.status)}
                          label={getQuoteStatusLabel(request.quote.status)}
                        />
                        <span className="text-sm text-[var(--muted)]">{request.quote.quoteNumber}</span>
                      </>
                    ) : (
                      <StatusBadge tone="warning" label="Sin presupuesto" />
                    )}
                  </div>
                  <AdminCustomizationReviewForm
                    requestId={request.id}
                    currentStatus={request.status}
                    quotedPriceLabel={request.quotedPriceLabel}
                    reviewNotes={request.reviewNotes}
                  />
                  <AdminCustomizationQuoteForm requestId={request.id} quote={request.quote} />
                </div>
              ))
            )}
          </div>
        </PanelCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PanelCard
          eyebrow="Tickets"
          title="Gestión global de soporte"
          description="Vista resumida de tickets abiertos, asignación y prioridad para escalar a miles de cuentas."
        >
          <div className="grid gap-3">
            {dashboard.supportTickets.length === 0 ? (
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm leading-7 text-[var(--muted)]">
                No hay tickets visibles para este filtro.
              </div>
            ) : (
              dashboard.supportTickets.map((ticket: AdminSupportTicket) => (
                <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--foreground)]">{ticket.subject}</p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {ticket.tenant.accountName} · {ticket.customerContact ?? "sin contacto"} ·{" "}
                      {ticket.assignedToUser?.name ?? "cola general"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      tone={getSupportPriorityTone(ticket.priority)}
                      label={getSupportPriorityLabel(ticket.priority)}
                    />
                    <StatusBadge
                      tone={getSupportTicketTone(ticket.status)}
                      label={getSupportStatusLabel(ticket.status)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </PanelCard>

        <PanelCard
          eyebrow="Respuestas base"
          title="Base de IA y soporte"
          description="Edita templates internos que aceleran el primer contacto y los handoffs recurrentes."
        >
          <div className="grid gap-4">
            {dashboard.supportTemplates.map((template: AdminSupportTemplate) => (
              <AdminSupportTemplateForm
                key={template.id}
                templateId={template.id}
                name={template.name}
                category={template.category}
                body={template.body}
                isActive={template.isActive}
              />
            ))}
          </div>
        </PanelCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PanelCard
          eyebrow="Premium"
          title="Funciones premium y flags"
          description="Activa o desactiva capacidades premium con visibilidad por tenant."
        >
          <div className="grid gap-3">
            {dashboard.featureFlags.length === 0 ? (
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm leading-7 text-[var(--muted)]">
                No hay flags premium visibles en este momento.
              </div>
            ) : (
              dashboard.featureFlags.map((flag: AdminFlag) => (
                <div key={flag.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{flag.key}</p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {flag.tenant?.accountName ?? "Global"} · {flag.description ?? "Sin descripción"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge tone={flag.enabled ? "success" : "neutral"} label={flag.enabled ? "Activo" : "Inactivo"} />
                    <AdminFeatureFlagToggleForm flagId={flag.id} enabled={flag.enabled} />
                  </div>
                </div>
              ))
            )}
          </div>
        </PanelCard>

        <PanelCard
          eyebrow="Integraciones"
          title="Estado global de APIs y webhooks"
          description="Controla credenciales, rotaciones, revocaciones, expiraciones y webhooks por tenant."
        >
          <div className="grid gap-3">
            {dashboard.integrationCredentials.map((credential: AdminCredential) => (
              <div key={credential.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{credential.name}</p>
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    {credential.tenant.accountName} · {credential.keyPrefix} · Último uso:{" "}
                    {formatDate(credential.lastUsedAt)}
                  </p>
                </div>
                <StatusBadge tone={integrationTone(credential.status)} label={credential.status} />
              </div>
            ))}
            {dashboard.integrationWebhooks.map((webhook: AdminWebhook) => (
              <div key={webhook.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] p-4">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{webhook.name}</p>
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    {webhook.tenant.accountName} · Último trigger: {formatDate(webhook.lastTriggeredAt)}
                  </p>
                </div>
                <StatusBadge tone={integrationTone(webhook.status)} label={webhook.status} />
              </div>
            ))}
          </div>
        </PanelCard>
      </section>

      <PanelCard
        eyebrow="Auditoría"
        title="Logs recientes"
        description="Toda acción sensible queda visible con actor, tenant, target y timestamp."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm">
            <thead>
              <tr className="text-[var(--muted-soft)]">
                <th className="px-4">Fecha</th>
                <th className="px-4">Acción</th>
                <th className="px-4">Actor</th>
                <th className="px-4">Tenant</th>
                <th className="px-4">Target</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.auditLogs.map((log: AdminAuditLog) => (
                <tr key={log.id} className="bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] text-[var(--foreground)]">
                  <td className="rounded-l-3xl px-4 py-4">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold">{log.action}</p>
                  </td>
                  <td className="px-4 py-4 text-[var(--muted)]">
                    {log.actorUser?.email ?? "Sistema"}
                  </td>
                  <td className="px-4 py-4 text-[var(--muted)]">
                    {log.tenant?.accountName ?? "Global"}
                  </td>
                  <td className="rounded-r-3xl px-4 py-4 text-[var(--muted)]">
                    {log.targetType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </AppShell>
  );
}
