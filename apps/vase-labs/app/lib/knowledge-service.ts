export interface KnowledgeRecord {
  id: string;
  title: string;
  sourceType: string;
  content: string;
  status: "READY" | "TRAINING" | "ERROR";
}

export interface KnowledgeRepository {
  listReadyKnowledge(assistantId: string): Promise<KnowledgeRecord[]>;
}

export function createKnowledgeService(repository: KnowledgeRepository) {
  return {
    async listReadyKnowledge(assistantId: string) {
      return repository.listReadyKnowledge(assistantId);
    },
    async buildContext(assistantId: string) {
      const items = await repository.listReadyKnowledge(assistantId);
      return items.map((item) => `# ${item.title}\n${item.content}`).join("\n\n");
    },
  };
}
