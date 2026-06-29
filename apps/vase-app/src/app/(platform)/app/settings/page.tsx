import Link from "next/link";
import type { Route } from "next";
import { Building2, CreditCard, HelpCircle, Sparkles } from "lucide-react";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OpenSupportChatButton } from "@/components/support/open-support-chat-button";
import { DeleteAccountDanger } from "@/components/settings/delete-account-danger";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { updateTenantBusinessDataAction } from "@/app/(platform)/app/settings/actions";

export default async function SettingsPage() {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const dashboard = await getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole);
  if (!dashboard) forbidden();

  return (
    <AppShell
      title="Configuracion"
      subtitle="Controla datos del negocio, billing y soporte desde un hub visual y simple."
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      projectCreation={dashboard.projectCreation}
    >
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--background)] p-6 shadow-[0_14px_44px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-start gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <Building2 className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-soft)]">Datos del negocio</p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Identidad y datos administrativos</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Cambia la información base del tenant. Estos datos impactan en panel, facturación y comunicaciones.
              </p>
            </div>
          </div>

          <form action={updateTenantBusinessDataAction} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--foreground)]">Nombre comercial</span>
                <input
                  name="name"
                  defaultValue={membership.tenant.name}
                  className="min-h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--foreground)]">Nombre de cuenta</span>
                <input
                  name="accountName"
                  defaultValue={membership.tenant.accountName}
                  className="min-h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--foreground)]">Rubro</span>
                <input
                  name="industry"
                  defaultValue={membership.tenant.industry}
                  className="min-h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--foreground)]">Email de facturación</span>
                <input
                  name="billingEmail"
                  defaultValue={membership.tenant.billingEmail ?? ""}
                  className="min-h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm md:max-w-xs">
              <span className="font-medium text-[var(--foreground)]">Locale</span>
              <input
                name="locale"
                defaultValue={membership.tenant.locale}
                className="min-h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
              />
            </label>
            <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--accent-strong)] px-6 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-95">
              Guardar cambios
            </button>
          </form>
        </article>

        <aside className="grid gap-4 self-start">
          <article className="rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--background)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <CreditCard className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Billing</p>
                <p className="text-xs text-[var(--muted)]">Planes, vencimientos y facturas</p>
              </div>
            </div>
            <Link href={"/app/billing" as Route} className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]">
              Ir a billing
            </Link>
          </article>

          <article className="rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--background)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <HelpCircle className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Soporte</p>
                <p className="text-xs text-[var(--muted)]">Abre el chat para ayuda inmediata</p>
              </div>
            </div>
            <OpenSupportChatButton className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]" />
          </article>

          <article className="rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--background)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Tutoriales</p>
                <p className="text-xs text-[var(--muted)]">Wikis públicas y guías paso a paso</p>
              </div>
            </div>
            <Link href={"/developers/docs" as Route} className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]">
              Ver tutoriales
            </Link>
          </article>

          <DeleteAccountDanger />
        </aside>
      </section>
    </AppShell>
  );
}
