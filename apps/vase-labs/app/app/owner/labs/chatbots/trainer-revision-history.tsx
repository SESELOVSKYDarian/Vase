"use client";

import { History, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Revision = {
  id: string;
  revision: number;
  knowledgeItemId: string | null;
  createdAt: Date;
  revertedAt: Date | null;
};

export function TrainerRevisionHistory({ revisions }: { revisions: Revision[] }) {
  const router = useRouter();
  const [revertingId, setRevertingId] = useState<string>();
  const [error, setError] = useState("");

  async function revert(revisionId: string) {
    if (revertingId) return;
    setRevertingId(revisionId);
    setError("");
    try {
      const response = await fetch(`/api/labs/knowledge/trainer/revisions/${encodeURIComponent(revisionId)}/revert`, { method: "POST" });
      if (!response.ok) throw new Error("revert");
      router.refresh();
    } catch {
      setError("No pudimos revertir el cambio. Intentá nuevamente.");
    } finally {
      setRevertingId(undefined);
    }
  }

  return <section className="labs-section space-y-3" aria-labelledby="trainer-history-title">
    <div><p className="labs-modal-kicker">Entrenador personal</p><h2 id="trainer-history-title" className="text-base font-semibold">Historial de cambios</h2></div>
    {error ? <p role="alert" className="labs-modal-error">{error}</p> : null}
    {revisions.length === 0 ? <p className="text-sm text-[var(--muted)]">Todavía no hay cambios confirmados.</p> : <ul className="space-y-2">{revisions.map((revision) => <li key={revision.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3 text-sm">
      <span className="flex items-center gap-2"><History size={16} aria-hidden="true" />Revisión {revision.revision}{revision.revertedAt ? " · revertida" : ""}</span>
      {!revision.revertedAt ? <button type="button" className="labs-button-secondary" disabled={Boolean(revertingId)} onClick={() => void revert(revision.id)}><RotateCcw size={15} aria-hidden="true" />{revertingId === revision.id ? "Revirtiendo…" : "Revertir cambio"}</button> : null}
    </li>)}</ul>}
  </section>;
}
