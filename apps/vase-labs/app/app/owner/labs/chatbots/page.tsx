import { resolveAssistantContext } from "./assistant-data";
import { AssistantHow } from "./assistant-how";

export const dynamic = "force-dynamic";

/** Asistente › Cómo habla: tono, reglas y una prueba en vivo. Los datos del negocio los toma de Mi negocio. */
export default async function LabsAssistantPage() {
  const { assistant } = await resolveAssistantContext("/app/owner/labs/chatbots");
  return <AssistantHow initialPrompt={assistant.systemPrompt ?? null} assistantName={assistant.name ?? "Asistente"} />;
}
