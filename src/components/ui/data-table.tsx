import type { PropsWithChildren, ReactNode } from "react";

type DataTableProps = PropsWithChildren<{
  caption?: string;
  actions?: ReactNode;
}>;

export function DataTable({ caption, actions, children }: DataTableProps) {
  return (
    <section className="vase-table-shell">
      {(caption || actions) && (
        <header className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {caption ? <p className="text-sm font-medium text-[var(--foreground)]">{caption}</p> : <span />}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export function DataTableGrid({ children }: PropsWithChildren) {
  return <table className="min-w-full divide-y divide-[var(--border-subtle)] text-sm">{children}</table>;
}

export function DataTableHead({ children }: PropsWithChildren) {
  return <thead className="bg-[var(--surface-strong)]/70 text-left text-xs uppercase tracking-[0.12em] text-[var(--muted)]">{children}</thead>;
}

export function DataTableBody({ children }: PropsWithChildren) {
  return <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface)]">{children}</tbody>;
}

export function DataTableRow({ children }: PropsWithChildren) {
  return <tr className="transition hover:bg-[var(--surface-strong)]/65">{children}</tr>;
}

export function DataTableHeaderCell({ children }: PropsWithChildren) {
  return <th scope="col" className="px-5 py-3 font-medium">{children}</th>;
}

export function DataTableCell({ children, subdued = false }: PropsWithChildren<{ subdued?: boolean }>) {
  return (
    <td className={`px-5 py-4 align-top ${subdued ? "text-[var(--muted)]" : "text-[var(--foreground)]"}`}>
      {children}
    </td>
  );
}
