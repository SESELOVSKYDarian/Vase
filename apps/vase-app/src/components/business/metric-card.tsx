type MetricCardProps = {
  label: string;
  value: string | number;
  note: string;
};

export function MetricCard({ label, value, note }: MetricCardProps) {
  return (
    <div className="surface-card rounded-[28px] p-6">
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
      <p className="mt-3 text-sm leading-7 text-[var(--muted-soft)]">{note}</p>
    </div>
  );
}
