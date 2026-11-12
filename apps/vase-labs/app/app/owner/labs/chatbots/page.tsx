import { PanelSection, PanelSections } from "@vase/ui/panel";
import { MI_NEGOCIO_URL } from "../../../../lib/business-profile";
import { resolveAssistantContext } from "./assistant-data";
import { AssistantPromptCard } from "./assistant-prompt-card";

export const dynamic = "force-dynamic";

/** Asistente › Cómo habla: las instrucciones. Los datos del negocio los toma de Mi negocio. */
export default async function LabsAssistantPage() {
  const { assistant } = await resolveAssistantContext("/app/owner/labs/chatbots");
  const prompt = assistant.systemPrompt?.trim() ?? "";

  return (
    <PanelSections>
      <PanelSection title="Cómo responde" summary={prompt ? prompt.slice(0, 90) : "Todavía sin instrucciones"} defaultOpen>
        <AssistantPromptCard initialPrompt={assistant.systemPrompt} />
        <div className="vpa-from">
          <span>Horarios, contacto y sucursales los toma de Mi negocio. No hace falta repetirlos acá.</span>
          <a href={MI_NEGOCIO_URL} className="vpa-btn line sm">Ir a Mi negocio</a>
        </div>
      </PanelSection>
    </PanelSections>
  );
}
