export const knowledgeSourceTypes = ["FILE", "URL", "FAQ", "VASE_MANAGEMENT", "EXTERNAL_MANAGEMENT"] as const;

export type KnowledgeSourceType = (typeof knowledgeSourceTypes)[number];

const allowedExtensions = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"]);

export function parseKnowledgeInput(input: Record<string, unknown>) {
  const type = String(input.type || "") as KnowledgeSourceType;
  const title = String(input.title || "").trim();

  if (!knowledgeSourceTypes.includes(type) || !title) {
    throw new Error("KNOWLEDGE_INPUT_INVALID");
  }

  if (type === "FILE") {
    const fileName = String(input.fileName || "").trim();
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.has(extension)) {
      throw new Error("KNOWLEDGE_FILE_TYPE_UNSUPPORTED");
    }
    return { type, title, fileName };
  }

  if (type === "URL") {
    const url = String(input.url || "").trim();
    try {
      new URL(url);
    } catch {
      throw new Error("KNOWLEDGE_URL_INVALID");
    }
    return { type, title, url };
  }

  if (type === "FAQ") {
    const question = String(input.question || "").trim();
    const answer = String(input.answer || "").trim();
    if (!question || !answer) {
      throw new Error("KNOWLEDGE_FAQ_INVALID");
    }
    return { type, title, question, answer };
  }

  return { type, title };
}

export function groupKnowledgeItems<T extends { sourceType: string }>(items: T[]) {
  return knowledgeSourceTypes.flatMap((type) => {
    const groupedItems = items.filter((item) => item.sourceType === type);
    return groupedItems.length ? [{ type, items: groupedItems }] : [];
  });
}
