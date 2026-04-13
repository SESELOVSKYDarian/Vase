import type { Route } from "next";
import Link from "next/link";
import { LockKeyhole, MoveRight } from "lucide-react";
import { StatusBadge } from "@/components/business/status-badge";
import { type PlatformModuleAccess, MODULE_ICON_MAP } from "@/config/modules";

type ModuleCardProps = {
  module: PlatformModuleAccess;
};

export function ModuleCard({ module }: ModuleCardProps) {
  const primaryLabel = module.isActive ? "Entrar" : "Activar";
  const primaryHref = module.isActive ? module.route : module.activationRoute;
  const Icon = MODULE_ICON_MAP[module.key];
  const pricingLabel =
    module.currentPricing
      ? module.currentPricing.type === "monthly"
        ? `${module.currentPricing.currency} ${module.currentPricing.price?.toFixed(2)}/mes`
        : `${module.currentPricing.currency} ${module.currentPricing.price?.toFixed(2)} setup`
      : module.billing.type === "monthly" && module.billing.monthlyFrom != null
        ? `Desde ${module.billing.currency} ${module.billing.monthlyFrom}/mes`
      : module.billing.type === "one_time" && module.billing.setupFrom != null
        ? `${module.billing.currency} ${module.billing.setupFrom} setup`
      : module.billing.type === "custom"
        ? "Presupuesto personalizado"
        : "Incluido en plan";

  return (
    <article
      className={[
        "rounded-[28px] border p-6 transition-all duration-200",
        module.isActive
          ? "border-[var(--border-subtle)] bg-[var(--surface-strong)] shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          : "border-dashed border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--background)_82%,white)] opacity-90",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={module.isActive ? "success" : "neutral"} label={module.statusLabel} />
            {module.isRecommended ? <StatusBadge tone="premium" label="Recomendado" /> : null}
          </div>
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              {module.name}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--muted)]">
              {module.description}
            </p>
          </div>
        </div>

        <div
          className={[
            "grid size-12 shrink-0 place-items-center rounded-2xl",
            module.isActive
              ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
              : "bg-[var(--surface-strong)] text-[var(--muted)]",
          ].join(" ")}
        >
          {module.isActive ? <Icon className="size-5" /> : <LockKeyhole className="size-5" />}
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-[color:color-mix(in_srgb,var(--background)_76%,white)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">
            Resumen
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">
            {pricingLabel}
          </p>
        </div>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{module.summary}</p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
          Flag: {module.featureFlagKey}
        </p>
        <Link
          href={primaryHref as Route}
          className={[
            "inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-90",
            module.isActive
              ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)]"
              : "border border-[var(--border-subtle)] bg-[var(--surface-strong)] text-[var(--foreground)]",
          ].join(" ")}
        >
          {primaryLabel}
          <MoveRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
