import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../../lib/request-context";
import { LabsPageHeader, LabsSection, LabsStatusPill } from "../../labs-ui";

export const dynamic = "force-dynamic";

export default async function TrainerInboxPage() {
  const requestHeaders = await headers();
  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const [jobs, proposals] = await Promise.all([
      labsPrisma.trainerAudioJob.findMany({ where: { globalTenantId: resolved.context.globalTenantId }, orderBy: { createdAt: "desc" }, take: 30 }),
      labsPrisma.knowledgeChangeProposal.findMany({ where: { globalTenantId: resolved.context.globalTenantId }, orderBy: { createdAt: "desc" }, take: 30 }),
    ]);
    return <div className="space-y-6"><LabsPageHeader eyebrow="Inbox separado" title="Entrenador personal" description="Audios, instrucciones y propuestas del entrenador. Nunca se mezclan con clientes ni leads." />
      <LabsSection title="Audios" description="Los audios se transcriben con OpenAI y después generan una propuesta."><div className="space-y-2">{jobs.length ? jobs.map((job) => <article key={job.id} className="rounded-lg border border-[var(--border)] p-4"><div className="flex justify-between gap-3"><strong>Audio del entrenador</strong><LabsStatusPill label={job.status} tone={job.status === "COMPLETED" ? "success" : job.status === "FAILED" ? "danger" : "warning"} /></div><p className="mt-2 text-sm text-[var(--muted)]">{job.transcript ?? "Esperando transcripción…"}</p>{job.error ? <p className="mt-2 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--danger)]">Error: {job.error}</p> : null}</article>) : <p className="text-sm text-[var(--muted)]">Todavía no hay audios.</p>}</div></LabsSection>
      <LabsSection title="Propuestas" description="Todo cambio necesita confirmación explícita."><div className="space-y-2">{proposals.length ? proposals.map((proposal) => <article key={proposal.id} className="rounded-lg border border-[var(--border)] p-4"><div className="flex justify-between gap-3"><strong>{proposal.changeType}</strong><LabsStatusPill label={proposal.status} tone={proposal.status === "CONFIRMED" ? "success" : proposal.status === "REJECTED" ? "neutral" : "warning"} /></div><p className="mt-2 text-sm text-[var(--muted)]">{proposal.sourceTranscript ?? "Instrucción recibida"}</p></article>) : <p className="text-sm text-[var(--muted)]">Todavía no hay propuestas.</p>}</div></LabsSection>
    </div>;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Finbox%2Ftrainer");
    redirect("https://app.vase.ar/app");
  }
}
