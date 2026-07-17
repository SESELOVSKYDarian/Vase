import { labsPrisma } from "./db";
import type { ParsedKnowledgeInput } from "./knowledge-source";

export type KnowledgeItemCreateData = {
  assistantId: string;
  title: string;
  sourceType: string;
  content: string;
  status: "QUEUED" | "READY";
};

export type KnowledgeItemRecord = Omit<KnowledgeItemCreateData, "status"> & {
  id: string;
  status: string;
};

export interface KnowledgeRepository {
  create(data: KnowledgeItemCreateData): Promise<KnowledgeItemRecord>;
}

export function mapKnowledgeInputToCreateData(
  assistantId: string,
  input: ParsedKnowledgeInput,
): KnowledgeItemCreateData {
  const base = { assistantId, title: input.title, sourceType: input.type };

  switch (input.type) {
    case "FAQ":
      return { ...base, content: `Pregunta: ${input.question}\nRespuesta: ${input.answer}`, status: "READY" };
    case "URL":
      return { ...base, content: input.url, status: "READY" };
    case "VASE_MANAGEMENT":
      return { ...base, content: "Catalogo conectado mediante Vase Management", status: "READY" };
    case "EXTERNAL_MANAGEMENT":
      return { ...base, content: "Catalogo conectado mediante sistema de gestion externo", status: "READY" };
    case "FILE":
      return { ...base, content: input.fileName, status: "QUEUED" };
  }
}

export async function createKnowledgeItem(
  repository: KnowledgeRepository,
  assistantId: string,
  input: ParsedKnowledgeInput,
) {
  return repository.create(mapKnowledgeInputToCreateData(assistantId, input));
}

export const prismaKnowledgeRepository: KnowledgeRepository = {
  create(data) {
    return labsPrisma.knowledgeItem.create({ data });
  },
};

export const knowledgeRepository = {
  create(assistantId: string, input: ParsedKnowledgeInput) {
    return createKnowledgeItem(prismaKnowledgeRepository, assistantId, input);
  },
};
