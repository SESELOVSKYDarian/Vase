type StatusBadgeProps = {
  tone:
    | "neutral"
    | "success"
    | "warning"
    | "danger"
    | "premium"
    | "info";
  label: string;
};

const toneClasses: Record<StatusBadgeProps["tone"], string> = {
  neutral: "border-[var(--border-subtle)] bg-[var(--surface-strong)] text-[var(--muted)]",
  success: "border-[color-mix(in_srgb,var(--success)_22%,transparent)] bg-[var(--success-soft)] text-[var(--success)]",
  warning: "border-[color-mix(in_srgb,var(--warning)_22%,transparent)] bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "border-[color-mix(in_srgb,var(--danger)_22%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]",
  premium: "border-[color-mix(in_srgb,var(--premium)_22%,transparent)] bg-[var(--premium-soft)] text-[var(--premium)]",
  info: "border-[color-mix(in_srgb,var(--info)_22%,transparent)] bg-[var(--info-soft)] text-[var(--info)]",
};

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}
