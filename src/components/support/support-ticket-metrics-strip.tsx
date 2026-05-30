"use client";

type SubtaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELED";

function calcProgress(subtasks: Array<{ status: SubtaskStatus }>) {
  const active = subtasks.filter((subtask) => subtask.status !== "CANCELED");
  if (!active.length) return 0;
  const done = active.filter((subtask) => subtask.status === "DONE").length;
  return Math.round((done / active.length) * 100);
}

function calcHours(worklogs: Array<{ minutes: number }>) {
  const totalMinutes = worklogs.reduce((acc, worklog) => acc + worklog.minutes, 0);
  return Math.round((totalMinutes / 60) * 10) / 10;
}

export function SupportTicketMetricsStrip({
  subtasks,
  worklogs,
  notesCount,
  layout = "grid",
}: {
  subtasks: Array<{ status: SubtaskStatus }>;
  worklogs: Array<{ minutes: number }>;
  notesCount: number;
  layout?: "grid" | "inline";
}) {
  const progress = calcProgress(subtasks);
  const hours = calcHours(worklogs);

  if (layout === "inline") {
    return (
      <span className="text-[11px] text-[var(--muted)]">
        {progress}% · {hours}h · {subtasks.length} subtareas · {notesCount} notas
      </span>
    );
  }

  return (
    <>
      <p className="text-xs text-[var(--muted)]">Progreso: <span className="font-semibold text-[var(--foreground)]">{progress}%</span></p>
      <p className="text-xs text-[var(--muted)]">Horas: <span className="font-semibold text-[var(--foreground)]">{hours}h</span></p>
      <p className="text-xs text-[var(--muted)]">Subtareas: <span className="font-semibold text-[var(--foreground)]">{subtasks.length}</span></p>
      <p className="text-xs text-[var(--muted)]">Notas: <span className="font-semibold text-[var(--foreground)]">{notesCount}</span></p>
    </>
  );
}
