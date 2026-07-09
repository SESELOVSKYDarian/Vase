import type { ComponentPropsWithoutRef, ElementType, PropsWithChildren, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";

type LabsPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function LabsPageHeader({ eyebrow, title, description, actions }: LabsPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="vase-kicker">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
          {title}
        </h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

type LabsSectionProps = PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}> &
  ComponentPropsWithoutRef<"section">;

export function LabsSection({ title, eyebrow, description, actions, className, children, ...sectionProps }: LabsSectionProps) {
  return (
    <section className={clsx("labs-panel p-5", className)} {...sectionProps}>
      {(title || eyebrow || description || actions) ? (
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {eyebrow ? <p className="vase-kicker">{eyebrow}</p> : null}
            {title ? <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--foreground)]">{title}</h2> : null}
            {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

type LabsMetricCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ElementType;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

const metricTone = {
  neutral: "bg-[var(--surface)] text-[var(--foreground)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  info: "bg-[var(--info-soft)] text-[var(--info)]",
};

export function LabsMetricCard({ label, value, detail, icon: Icon, tone = "neutral" }: LabsMetricCardProps) {
  return (
    <article className="labs-panel min-h-[10.75rem] p-5">
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <p className="max-w-[9.5rem] text-[11px] font-semibold uppercase leading-5 tracking-[0.16em] text-[var(--muted-soft)]">
            {label}
          </p>
          {Icon ? (
            <span className={clsx("grid size-12 shrink-0 place-items-center rounded-2xl", metricTone[tone])}>
              <Icon className="size-5" />
            </span>
          ) : null}
        </div>
        <div>
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
          {detail ? <p className="mt-3 text-sm leading-5 text-[var(--muted)]">{detail}</p> : null}
        </div>
      </div>
    </article>
  );
}

export function LabsEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-5 text-sm">
      <p className="font-semibold text-[var(--foreground)]">{title}</p>
      {description ? <p className="mt-1 leading-6 text-[var(--muted)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LabsStatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]", metricTone[tone])}>
      {label}
    </span>
  );
}

export function LabsActionLink({ href, children }: PropsWithChildren<{ href: string }>) {
  return (
    <Link
      href={href as never}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent-strong)_88%,black)]"
    >
      {children}
      <ArrowRight className="size-4" />
    </Link>
  );
}
