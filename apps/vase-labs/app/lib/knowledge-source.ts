export const knowledgeSourceTypes = ["FILE", "URL", "FAQ", "VASE_MANAGEMENT", "EXTERNAL_MANAGEMENT"] as const;

export type KnowledgeSourceType = (typeof knowledgeSourceTypes)[number];

export type ParsedKnowledgeInput =
  | { type: "FILE"; title: string; fileName: string }
  | { type: "URL"; title: string; url: string }
  | { type: "FAQ"; title: string; question: string; answer: string }
  | { type: "VASE_MANAGEMENT"; title: string }
  | { type: "EXTERNAL_MANAGEMENT"; title: string };

const allowedExtensions = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"]);

export function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseKnowledgeInput(input: unknown): ParsedKnowledgeInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("KNOWLEDGE_INPUT_INVALID");
  }

  const record = input as Record<string, unknown>;
  const type = String(record.type || "") as KnowledgeSourceType;
  const title = String(record.title || "").trim();

  if (!knowledgeSourceTypes.includes(type) || !title) {
    throw new Error("KNOWLEDGE_INPUT_INVALID");
  }

  if (type === "FILE") {
    const fileName = String(record.fileName || "").trim();
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.has(extension)) {
      throw new Error("KNOWLEDGE_FILE_TYPE_UNSUPPORTED");
    }
    return { type, title, fileName };
  }

  if (type === "URL") {
    const url = String(record.url || "").trim();
    if (!isHttpUrl(url)) throw new Error("KNOWLEDGE_URL_INVALID");
    return { type, title, url };
  }

  if (type === "FAQ") {
    const question = String(record.question || "").trim();
    const answer = String(record.answer || "").trim();
    if (!question || !answer) {
      throw new Error("KNOWLEDGE_FAQ_INVALID");
    }
    return { type, title, question, answer };
  }

  return { type, title };
}

export function groupKnowledgeItems<T extends { sourceType: string }>(items: T[]) {
  const canonicalGroups: Array<{ type: KnowledgeSourceType | "OTROS"; items: T[] }> = knowledgeSourceTypes.flatMap((type) => {
    const groupedItems = items.filter((item) => item.sourceType === type);
    return groupedItems.length ? [{ type, items: groupedItems }] : [];
  });
  const legacyItems = items.filter((item) => !knowledgeSourceTypes.includes(item.sourceType as KnowledgeSourceType));
  return legacyItems.length ? [...canonicalGroups, { type: "OTROS" as const, items: legacyItems }] : canonicalGroups;
}
