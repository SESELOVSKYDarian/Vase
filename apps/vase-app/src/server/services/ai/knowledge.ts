import { listReadyKnowledgeItems } from "@/server/queries/ai";

export async function buildTenantKnowledgeContext(tenantId: string, workspaceId: string) {
  const items = await listReadyKnowledgeItems(tenantId, workspaceId);

  const knowledgeLines = items.flatMap((item) => {
    if (item.type === "FAQ") {
      return [`FAQ: ${item.faqQuestion || item.title}`, `Respuesta: ${item.faqAnswer || item.contentSnippet || ""}`];
    }

    if (item.type === "URL") {
      return [`Fuente URL: ${item.sourceUrl || item.title}`, item.contentSnippet || ""];
    }

    return [`Archivo: ${item.fileName || item.title}`, item.contentSnippet || ""];
  });

  return {
    items,
    text: knowledgeLines.filter(Boolean).join("\n\n"),
  };
}
