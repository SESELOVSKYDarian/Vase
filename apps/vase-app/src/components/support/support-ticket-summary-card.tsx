"use client";

import { SupportTicketMetricsStrip } from "@/components/support/support-ticket-metrics-strip";

export function SupportTicketSummaryCard({
  customerLabel,
  statusLabel,
  priorityLabel,
  assigneeLabel,
  subtasks,
  worklogs,
  notesCount,
}: {
  customerLabel: string;
  statusLabel: string;
  priorityLabel: string;
  assigneeLabel: string;
  subtasks: Array<{ status: "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELED" }>;
  worklogs: Array<{ minutes: number }>;
  notesCount: number;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 md:grid-cols-4">
      <p className="text-xs text-[var(--muted)]">Cliente: <span className="font-semibold text-[var(--foreground)]">{customerLabel}</span></p>
      <p className="text-xs text-[var(--muted)]">Estado: <span className="font-semibold text-[var(--foreground)]">{statusLabel}</span></p>
      <p className="text-xs text-[var(--muted)]">Prioridad: <span className="font-semibold text-[var(--foreground)]">{priorityLabel}</span></p>
      <p className="text-xs text-[var(--muted)]">Asignado: <span className="font-semibold text-[var(--foreground)]">{assigneeLabel}</span></p>
      <SupportTicketMetricsStrip subtasks={subtasks} worklogs={worklogs} notesCount={notesCount} />
    </div>
  );
}
