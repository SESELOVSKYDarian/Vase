import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Building2, CheckCircle2, Info, Lock, Sparkles, Store, TrendingUp, UserPlus, FlaskConical, TriangleAlert } from "lucide-react";
import { PanelCard } from "@/components/ui/panel-card";
import { ModuleCard } from "@/components/platform/module-card";
import type { PlatformModuleAccess } from "@/config/modules";

type RecentEvent = {
  id: string;
  title: string;
  description: string;
  occurredAt: Date;
  tone: "success" | "warning" | "danger";
};

type UnifiedDashboardData = {
  tenant: {
    id: string;
    name: string;
    onboardingProduct: "BUSINESS" | "LABS" | "BOTH";
  };
  modules: PlatformModuleAccess[];
  hero: {
    score: number;
    activeModules: number;
    totalModules: number;
  };
  commerce: {
    salesTodayAmount: number;
    salesDelta: number;
    pendingOrders: number;
    totalPages: number;
    activePages: number;
    totalDomains: number;
    connectedDomains: number;
  };
  labs: {
    leadsToday: number;
    knowledgeItems: number;
    totalChannels: number;
    connectedChannels: number;
    openConversations: number;
    trainingJobsReady: number;
  };
  support: {
    activeTickets: number;
    ticketsToday: number;
  };
  ecosystem: {
    enabledFeatureFlags: number;
    activeApiCredentials: number;
    activeWebhooks: number;
  };
  notifications: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    tone: "info" | "warning" | "danger";
    category: "platform" | "business" | "labs" | "billing";
    createdAt: Date;
  }>;
  recommendation: {
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
  };
  recentEvents: RecentEvent[];
};

type ModulesDashboardProps = {
  actorName?: string | null;
  dashboard: UnifiedDashboardData;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDelta(value: number) {
  if (value === 0) {
    return "Sin cambios vs ayer";
  }

  if (value > 0) {
    return `+${value}% vs ayer`;
  }

  return `${value}% vs ayer`;
}

function formatRelativeTime(value: Date) {
  const diffMs = value.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function getEventToneClasses(tone: RecentEvent["tone"]) {
  switch (tone) {
    case "success":
      return {
        icon: "text-[var(--accent-strong)]",
        Icon: CheckCircle2,
      };
    case "danger":
      return {
        icon: "text-[var(--danger)]",
        Icon: TriangleAlert,
      };
    default:
      return {
        icon: "text-[var(--warning)]",
        Icon: Info,
      };
  }
}

function clampRatio(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value * 100)))}%`;
}

export function ModulesDashboard({ actorName, dashboard }: ModulesDashboardProps) {
  const businessModule = dashboard.modules.find((module) => module.key === "business") ?? null;
  const labsModule = dashboard.modules.find((module) => module.key === "labs") ?? null;
  const greetingName = actorName || dashboard.tenant.name;

  const businessProgress =
    dashboard.commerce.totalPages > 0
      ? dashboard.commerce.activePages / dashboard.commerce.totalPages
      : businessModule?.isActive
        ? 1
        : 0;
  const labsProgress =
    dashboard.labs.totalChannels > 0
      ? dashboard.labs.connectedChannels / dashboard.labs.totalChannels
      : dashboard.labs.knowledgeItems > 0
        ? 1
        : 0;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--surface-strong)_74%,transparent)] p-10">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h3 className="font-[family-name:var(--font-newsreader)] text-4xl font-semibold tracking-tight text-[var(--foreground)]">
              Hola, {greetingName}
            </h3>
            <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
              Tu panel central ya esta leyendo datos reales de Business, Labs, soporte e integraciones del tenant.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end">
            <div className="font-[family-name:var(--font-newsreader)] text-5xl font-semibold tracking-tight text-[var(--accent-strong)]">
              {dashboard.hero.score}%
            </div>
            <div className="mt-1 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Salud operativa
              <CheckCircle2 className="size-4" />
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted-soft)]">
              {dashboard.hero.activeModules}/{dashboard.hero.totalModules} modulos activos
            </p>
          </div>
        </div>
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent-soft)] blur-[90px]" />
      </section>

      <section className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="space-y-8 md:col-span-4">
          <div className="flex h-[280px] flex-col justify-between rounded-[28px] border border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--surface-strong)_74%,transparent)] p-8">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Ventas de hoy</span>
              <TrendingUp className="size-5 text-[var(--accent-strong)]/40" />
            </div>
            <div className="space-y-1">
              <div className="font-[family-name:var(--font-newsreader)] text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                {formatMoney(dashboard.commerce.salesTodayAmount)}
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent-strong)]">
                <ArrowRight className="size-4 -rotate-45" />
                {formatDelta(dashboard.commerce.salesDelta)}
              </div>
              <p className="pt-2 text-sm text-[var(--muted)]">
                Pedidos pendientes: {dashboard.commerce.pendingOrders}
              </p>
            </div>
          </div>

          <div className="flex h-[280px] flex-col justify-between rounded-[28px] border border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--background)_82%,white)] p-8">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Leads generados</span>
              <UserPlus className="size-5 text-[var(--info)]/40" />
            </div>
            <div className="space-y-1">
              <div className="font-[family-name:var(--font-newsreader)] text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                {dashboard.labs.leadsToday}
              </div>
              <div className="text-sm text-[var(--muted)]">
                Conversaciones nuevas, tickets y solicitudes creadas hoy.
              </div>
              <p className="pt-2 text-sm text-[var(--muted)]">
                Soporte activo: {dashboard.support.activeTickets} tickets
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:col-span-8 md:grid-cols-2">
          <div
            className={[
              "flex flex-col justify-between rounded-[28px] border p-8",
              businessModule?.isActive
                ? "vase-glass-panel border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--surface-strong)_64%,transparent)]"
                : "border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--background)_82%,white)]",
            ].join(" ")}
          >
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[color:color-mix(in_srgb,var(--background)_86%,white)]">
                <Store className={`size-5 ${businessModule?.isActive ? "text-[var(--accent-strong)]" : "text-[var(--muted-soft)]"}`} />
              </div>
              <div>
                <h3 className={businessModule?.isActive ? "font-semibold text-[var(--foreground)]" : "font-semibold text-[var(--muted)]"}>
                  Tienda Online
                </h3>
                <span className={`text-xs font-bold uppercase tracking-[0.18em] ${businessModule?.isActive ? "text-[var(--accent-strong)]" : "text-[var(--muted-soft)]"}`}>
                  {businessModule?.isActive ? "Activa" : "No contratada"}
                </span>
              </div>
            </div>

            <div className="mt-8 border-t border-[var(--border-subtle)] pt-8">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Paginas activas</span>
                <span className="font-bold text-[var(--foreground)]">
                  {dashboard.commerce.activePages}/{Math.max(dashboard.commerce.totalPages, 1)}
                </span>
              </div>
              <div className="mt-2 h-1 w-full rounded-full bg-[color:color-mix(in_srgb,var(--surface-strong)_70%,transparent)]">
                <div className="h-full rounded-full bg-[var(--accent-strong)]" style={{ width: clampRatio(businessProgress) }} />
              </div>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Dominios conectados: {dashboard.commerce.connectedDomains}/{dashboard.commerce.totalDomains}
              </p>
              <div className="mt-5">
                <Link
                  href={(businessModule?.isActive ? businessModule.route : businessModule?.activationRoute ?? "/precios") as Route}
                  className="inline-flex min-h-11 items-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
                >
                  {businessModule?.isActive ? "Abrir Vase Business" : "Ver planes de Business"}
                </Link>
              </div>
            </div>
          </div>

          <div
            className={[
              "flex flex-col justify-between rounded-[28px] border p-8",
              labsModule?.isActive
                ? "vase-glass-panel border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--surface-strong)_64%,transparent)]"
                : "border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--background)_82%,white)]",
            ].join(" ")}
          >
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[color:color-mix(in_srgb,var(--background)_86%,white)]">
                <FlaskConical className={`size-5 ${labsModule?.isActive ? "text-[var(--accent-strong)]" : "text-[var(--muted-soft)]"}`} />
              </div>
              <div>
                <h3 className={labsModule?.isActive ? "font-semibold text-[var(--foreground)]" : "font-semibold text-[var(--muted)]"}>
                  Chatbot AI
                </h3>
                <span className={`text-xs font-bold uppercase tracking-[0.18em] ${labsModule?.isActive ? "text-[var(--accent-strong)]" : "text-[var(--muted-soft)]"}`}>
                  {labsModule?.isActive ? "Activa" : "No contratada"}
                </span>
              </div>
            </div>

            <div className="mt-8 border-t border-[var(--border-subtle)] pt-8">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Canales conectados</span>
                <span className="font-bold text-[var(--foreground)]">
                  {dashboard.labs.connectedChannels}/{Math.max(dashboard.labs.totalChannels, 1)}
                </span>
              </div>
              <div className="mt-2 h-1 w-full rounded-full bg-[color:color-mix(in_srgb,var(--surface-strong)_70%,transparent)]">
                <div className="h-full rounded-full bg-[var(--accent-strong)]" style={{ width: clampRatio(labsProgress) }} />
              </div>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Conversaciones abiertas: {dashboard.labs.openConversations}. Base de conocimiento: {dashboard.labs.knowledgeItems}.
              </p>
              <div className="mt-5">
                <Link
                  href={(labsModule?.isActive ? labsModule.route : labsModule?.activationRoute ?? "/precios") as Route}
                  className="inline-flex min-h-11 items-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
                >
                  {labsModule?.isActive ? "Abrir Vase Labs" : "Ver planes de Labs"}
                </Link>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--background)_70%,white)] md:col-span-2">
            <div className="grid min-h-[240px] gap-0 md:grid-cols-2">
              <div className="relative z-10 space-y-4 p-8">
                <h3 className="font-[family-name:var(--font-newsreader)] text-3xl font-semibold italic text-[var(--foreground)]">
                  Maximiza tu rendimiento
                </h3>
                <p className="text-sm leading-7 text-[var(--muted)]">
                  {dashboard.recommendation.description}
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    href={dashboard.recommendation.ctaHref as Route}
                    className="rounded-full bg-[#18c37e] px-6 py-2 text-sm font-bold text-[#004a2c] transition-opacity hover:opacity-90"
                  >
                    {dashboard.recommendation.ctaLabel}
                  </Link>
                  {businessModule ? (
                    <Link
                      href={(businessModule.isActive ? businessModule.route : businessModule.activationRoute) as Route}
                      className="rounded-full border border-[var(--border-subtle)] px-6 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)]"
                    >
                      {businessModule.isActive ? "Abrir Business" : "Ver planes de Business"}
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="relative hidden md:block">
                <div className="absolute inset-0 bg-gradient-to-r from-[color:color-mix(in_srgb,var(--background)_65%,transparent)] via-transparent to-[var(--accent-soft)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="flex items-center gap-3 px-2 font-[family-name:var(--font-newsreader)] text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Ecosistema de conexiones
          <Info className="size-4 text-[var(--muted-soft)]" />
        </h2>
        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--surface-strong)_74%,transparent)] p-10">
          <div className="mb-8 flex flex-wrap gap-4">
            <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              {dashboard.commerce.connectedDomains} dominios conectados
            </div>
            <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              {dashboard.labs.connectedChannels} canales IA
            </div>
            <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              {dashboard.ecosystem.enabledFeatureFlags} feature flags activas
            </div>
            <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              {dashboard.ecosystem.activeApiCredentials + dashboard.ecosystem.activeWebhooks} conexiones API
            </div>
          </div>

          <div className="flex flex-col items-center gap-10 lg:flex-row lg:justify-center lg:gap-16">
            <div className="z-10 flex flex-col items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-[var(--accent-strong)] bg-[var(--accent-soft)]">
                <Building2 className="size-8 text-[var(--accent-strong)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[var(--foreground)]">Vase Business</p>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  {businessModule?.isActive ? "Activo" : "Pendiente"}
                </span>
              </div>
            </div>

            <div className="relative h-px w-full max-w-32 bg-gradient-to-r from-[var(--accent-strong)] to-[var(--accent-strong)]/20 lg:max-w-48">
              <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-bold text-[var(--accent-strong)]">
                <Sparkles className="size-3" />
                sync
              </div>
            </div>

            <div className="z-10 flex flex-col items-center gap-4">
              <div className="grid h-24 w-24 place-items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-2xl">
                <span className="font-[family-name:var(--font-newsreader)] text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                  V
                </span>
              </div>
              <p className="text-base font-black text-[var(--foreground)]">Unified Core</p>
            </div>

            <div className="relative h-px w-full max-w-32 bg-gradient-to-r from-[var(--accent-strong)]/20 to-[var(--border-strong)] lg:max-w-48">
              <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-bold text-[var(--muted-soft)]">
                <Info className="size-3" />
                live
              </div>
            </div>

            <div className="z-10 flex flex-col items-center gap-4 opacity-90">
              <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-[var(--border-strong)] bg-[color:color-mix(in_srgb,var(--surface-strong)_75%,transparent)]">
                <FlaskConical className="size-8 text-[var(--muted-soft)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[var(--foreground)]">Vase Labs</p>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                  {labsModule?.isActive ? "Activo" : "Pendiente"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--surface-strong)_74%,transparent)] p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Lock className="size-8 text-[var(--muted-soft)]" />
              <h3 className="font-[family-name:var(--font-newsreader)] text-xl font-semibold text-[var(--foreground)]">
                Estado operativo del tenant
              </h3>
            </div>
            <p className="text-[var(--muted)]">
              Paginas activas: {dashboard.commerce.activePages}. Knowledge items: {dashboard.labs.knowledgeItems}. Jobs listos: {dashboard.labs.trainingJobsReady}.
            </p>
            <div className="h-4 w-full overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--surface-strong)_70%,transparent)] opacity-60">
              <div className="h-full bg-[var(--accent-strong)]" style={{ width: `${dashboard.hero.score}%` }} />
            </div>
            <Link
              href={dashboard.recommendation.ctaHref as Route}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--border-strong)] text-sm font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)]"
            >
              {dashboard.recommendation.title}
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--background)_82%,white)] p-8">
          <h3 className="font-[family-name:var(--font-newsreader)] text-lg font-semibold text-[var(--foreground)]">
            Eventos recientes del sistema
          </h3>
          <div className="mt-6 space-y-4">
            {dashboard.recentEvents.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Todavia no hay actividad reciente registrada en este tenant.</p>
            ) : (
              dashboard.recentEvents.map((event) => {
                const { Icon, icon } = getEventToneClasses(event.tone);

                return (
                  <div key={event.id} className="flex items-start gap-4 border-b border-[var(--border-subtle)] pb-4 last:border-b-0 last:pb-0">
                    <Icon className={`mt-1 size-5 ${icon}`} />
                    <div>
                      <p className="text-sm font-bold text-[var(--foreground)]">{event.title}</p>
                      <p className="text-sm text-[var(--muted)]">{event.description}</p>
                      <p className="mt-1 text-xs text-[var(--muted-soft)]">{formatRelativeTime(event.occurredAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <PanelCard
        eyebrow="Resumen general"
        title="Tus productos activos dentro de Vase"
        description="Accede a Vase Business y Vase Labs desde un unico panel. Cada tarjeta refleja el estado real del tenant y prepara la base para sumar mas modulos."
      >
        <div className="grid gap-6 xl:grid-cols-2">
          {dashboard.modules.map((module) => (
            <ModuleCard key={module.key} module={module} />
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
