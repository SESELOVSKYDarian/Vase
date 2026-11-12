import { PanelEmpty, PanelRow, PanelSection, PanelSections, PanelTag, type PanelTone } from "@vase/ui/panel";
import { labsPrisma } from "../../../../../lib/db";
import { resolveAssistantContext } from "../../chatbots/assistant-data";
import { TrainerPhoneManager } from "../../chatbots/trainer-phone-manager";
import { TrainerRevisionHistory } from "../../chatbots/trainer-revision-history";
import { ASSISTANT_TABS, LabsTabs } from "../../labs-tabs";

export const dynamic = "force-dynamic";

const AUDIO_STATE: Record<string, { label: string; tone: PanelTone }> = {
  COMPLETED: { label: "Listo", tone: "g" },
  FAILED: { label: "No se pudo leer", tone: "r" },
};
const PROPOSAL_STATE: Record<string, { label: string; tone: PanelTone }> = {
  CONFIRMED: { label: "Aplicado", tone: "g" },
  REJECTED: { label: "Descartado", tone: "n" },
};

/** Asistente › Entrenar por WhatsApp: quién le enseña, los audios que mandaron y los cambios que propuso. */
export default async function TrainerInboxPage() {
  const resolved = await resolveAssistantContext("/app/owner/labs/inbox/trainer");
  const tenant = resolved.context.globalTenantId;
  const [phones, revisions, jobs, proposals] = await Promise.all([
    labsPrisma.trainerPhone.findMany({ where: { globalTenantId: tenant }, orderBy: { createdAt: "desc" } }),
    labsPrisma.knowledgeRevision.findMany({
      where: { globalTenantId: tenant },
      orderBy: { revision: "desc" },
      take: 20,
      select: { id: true, revision: true, knowledgeItemId: true, createdAt: true, revertedAt: true },
    }),
    labsPrisma.trainerAudioJob.findMany({ where: { globalTenantId: tenant }, orderBy: { createdAt: "desc" }, take: 30 }),
    labsPrisma.knowledgeChangeProposal.findMany({ where: { globalTenantId: tenant }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const activePhones = phones.filter((phone) => phone.active).length;
  const pendingProposals = proposals.filter((proposal) => !PROPOSAL_STATE[proposal.status]).length;

  return (
    <div className="vpa-stack" style={{ gap: 18 }}>
      <LabsTabs tabs={ASSISTANT_TABS} />
      <PanelSections>
        <PanelSection
          title="Quién le enseña"
          summary={activePhones ? `${activePhones} ${activePhones === 1 ? "teléfono puede" : "teléfonos pueden"} enseñarle con audios o mensajes` : "Sumá un teléfono para enseñarle con audios o mensajes"}
          defaultOpen={!activePhones}
        >
          <TrainerPhoneManager phones={phones} />
          <TrainerRevisionHistory revisions={revisions} />
        </PanelSection>

        <PanelSection
          title="Cambios propuestos"
          summary={pendingProposals ? `${pendingProposals} esperando que los confirmes` : "Ningún cambio se aplica sin que lo confirmes"}
          badge={pendingProposals ? <PanelTag tone="y">{pendingProposals} por revisar</PanelTag> : undefined}
          defaultOpen={pendingProposals > 0}
        >
          {proposals.length ? (
            proposals.map((proposal) => {
              const state = PROPOSAL_STATE[proposal.status] ?? { label: "Por revisar", tone: "y" as PanelTone };
              return (
                <PanelRow key={proposal.id} title={proposal.sourceTranscript ?? "Instrucción recibida"}>
                  <PanelTag tone={state.tone}>{state.label}</PanelTag>
                </PanelRow>
              );
            })
          ) : (
            <PanelEmpty>Todavía no hay cambios propuestos.</PanelEmpty>
          )}
        </PanelSection>

        <PanelSection title="Audios que te mandaron" summary={jobs.length ? `${jobs.length} audios` : "Todavía no hay audios"}>
          {jobs.length ? (
            jobs.map((job) => {
              const state = AUDIO_STATE[job.status] ?? { label: "Pasando a texto", tone: "y" as PanelTone };
              return (
                <PanelRow key={job.id} title={job.transcript ?? "Esperando que se pase a texto…"} detail={job.error ? `No se pudo leer: ${job.error}` : undefined}>
                  <PanelTag tone={state.tone}>{state.label}</PanelTag>
                </PanelRow>
              );
            })
          ) : (
            <PanelEmpty>Cuando alguien le mande un audio por WhatsApp, aparece acá.</PanelEmpty>
          )}
        </PanelSection>
      </PanelSections>
    </div>
  );
}
