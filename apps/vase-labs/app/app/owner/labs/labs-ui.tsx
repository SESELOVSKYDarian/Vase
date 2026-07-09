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
    <header className="hero-panel owner-labs-hero">
      <div className="hero-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {actions ? <div className="hero-actions">{actions}</div> : null}
      </div>
      <div className="signal-card owner-labs-signal" aria-hidden="true">
        <span className="signal-orbit" />
        <p>Centro IA</p>
        <strong>Labs</strong>
        <small>Canales, inbox, conocimiento y actividad del asistente.</small>
      </div>
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
    <section className={clsx("panel owner-labs-panel", className)} {...sectionProps}>
      {(title || eyebrow || description || actions) ? (
        <div className="section-heading owner-labs-section-heading">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="cta-row owner-section-actions">{actions}</div> : null}
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
    <article className="metric-card owner-metric-card">
      <div className="owner-metric-topline">
        <div>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        {Icon ? (
          <span className={clsx("owner-metric-icon", metricTone[tone])}>
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      {detail ? <p>{detail}</p> : null}
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
    <div className="owner-empty-state">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action ? <div className="cta-row">{action}</div> : null}
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
    <span className={clsx("status-pill", tone === "success" ? "is-ready" : "is-pending")}>
      {label}
    </span>
  );
}

export function LabsActionLink({ href, children }: PropsWithChildren<{ href: string }>) {
  return (
    <Link
      href={href as never}
      className="owner-action-link"
    >
      {children}
      <ArrowRight className="size-4" />
    </Link>
  );
}
