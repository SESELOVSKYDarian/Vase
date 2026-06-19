import { KnowledgeWorkbench } from "@/components/labs/knowledge-workbench";
import { LabsPageHeader } from "@/components/labs/labs-ui";
import { getLabsOwnerPageData } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsChatbotsPage() {
  const { dashboard, labsEnabled } = await getLabsOwnerPageData();

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Base del asistente"
        title="Conocimiento"
        description="Administra FAQs, documentos y URLs que la IA usa para responder con precision."
      />

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <KnowledgeWorkbench faqs={dashboard.faqs} files={dashboard.files} urls={dashboard.urls} />
      )}
    </div>
  );
}
