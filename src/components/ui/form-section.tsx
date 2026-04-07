import type { PropsWithChildren, ReactNode } from "react";

type FormSectionProps = PropsWithChildren<{
  title: string;
  description?: string;
  aside?: ReactNode;
}>;

export function FormSection({ title, description, aside, children }: FormSectionProps) {
  return (
    <section className="surface-card flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="vase-kicker">Configurable</p>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          {description ? <p className="vase-copy">{description}</p> : null}
        </div>
        {aside ? <div className="flex flex-wrap items-center gap-2">{aside}</div> : null}
      </header>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

type FormFieldProps = PropsWithChildren<{
  label: string;
  hint?: string;
  htmlFor?: string;
}>;

export function FormField({ label, hint, htmlFor, children }: FormFieldProps) {
  return (
    <label htmlFor={htmlFor} className="grid gap-2">
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-6 text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}
