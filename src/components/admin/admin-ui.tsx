import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, CircleDashed, Info, XCircle } from "lucide-react";
import { CrudModal } from "@/components/ui/crud-modal";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function AdminPageHeader({ eyebrow, title, description, actions }: AdminPageHeaderProps) {
  return (
    <header className="overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--surface-strong)_92%,transparent),color-mix(in_srgb,var(--accent-strong)_10%,var(--surface)))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? <p className="vase-kicker">{eyebrow}</p> : null}
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)] md:text-4xl">{title}</h1>
          {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

type AdminMetricCardProps = {
  label: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
};

const metricToneClasses = {
  neutral: "bg-[var(--surface)] text-[var(--foreground)]",
  success: "bg-[color-mix(in_srgb,var(--success)_12%,var(--surface))] text-[var(--success)]",
  warning: "bg-[color-mix(in_srgb,var(--warning)_14%,var(--surface))] text-[var(--warning)]",
  danger: "bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface))] text-[var(--danger)]",
  accent: "bg-[color-mix(in_srgb,var(--accent-strong)_12%,var(--surface))] text-[var(--accent-strong)]",
};

export function AdminMetricCard({ label, value, helper, icon, tone = "neutral" }: AdminMetricCardProps) {
  return (
    <article className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{value}</p>
        </div>
        {icon ? <span className={clsx("grid h-11 w-11 place-items-center rounded-2xl", metricToneClasses[tone])}>{icon}</span> : null}
      </div>
      {helper ? <p className="mt-4 text-sm leading-5 text-[var(--muted)]">{helper}</p> : null}
    </article>
  );
}

type AdminSectionProps = PropsWithChildren<{
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}>;

export function AdminSection({ title, description, actions, className, children }: AdminSectionProps) {
  return (
    <section className={clsx("rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

type AdminStatusPillProps = {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
  icon?: ReactNode;
};

const statusToneClasses = {
  neutral: "border-[var(--border-subtle)] bg-[var(--surface-strong)] text-[var(--muted)]",
  success: "border-[color-mix(in_srgb,var(--success)_26%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]",
  warning: "border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]",
  danger: "border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]",
  info: "border-[color-mix(in_srgb,var(--accent-strong)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent-strong)_10%,transparent)] text-[var(--accent-strong)]",
};

export function AdminStatusPill({ tone = "neutral", children, icon }: AdminStatusPillProps) {
  return (
    <span className={clsx("inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold", statusToneClasses[tone])}>
      {icon}
      {children}
    </span>
  );
}

export function AdminEmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-strong)] px-5 py-10 text-center">
      <CircleDashed className="h-8 w-8 text-[var(--muted-soft)]" />
      <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-[var(--muted)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function AdminToolbar({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("flex flex-col gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface)] p-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      {children}
    </div>
  );
}

export function AdminDataTable({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("overflow-hidden rounded-[26px] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(15,23,42,0.06)]", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function AdminModal(props: ComponentProps<typeof CrudModal>) {
  return <CrudModal {...props} />;
}

export function AdminDrawer({ open, title, description, onClose, children }: ComponentProps<typeof CrudModal>) {
  return (
    <CrudModal open={open} title={title} description={description} onClose={onClose} widthClassName="max-w-3xl">
      {children}
    </CrudModal>
  );
}

export const adminStatusIcons = {
  success: <CheckCircle2 className="h-3.5 w-3.5" />,
  warning: <AlertTriangle className="h-3.5 w-3.5" />,
  danger: <XCircle className="h-3.5 w-3.5" />,
  info: <Info className="h-3.5 w-3.5" />,
};
