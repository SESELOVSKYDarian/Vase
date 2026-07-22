import { labsPrisma, Prisma } from "./db";
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

export interface KnowledgeMutationOperations {
  findByAssistant(assistantId: string, knowledgeId: string): Promise<KnowledgeItemRecord | null>;
  updateTitle(assistantId: string, knowledgeId: string, title: string): Promise<number>;
  deleteByAssistant(assistantId: string, knowledgeId: string): Promise<number>;
  countByAssistantAndSourceType(assistantId: string, sourceType: string): Promise<number>;
  deleteCatalogProducts(globalTenantId: string): Promise<void>;
  deleteCatalogSyncEvents(globalTenantId: string): Promise<void>;
}

export interface KnowledgeTransactionOperations extends KnowledgeMutationOperations, KnowledgeRepository {
  lockAssistant(assistantId: string): Promise<{ globalTenantId: string } | null>;
}

export interface KnowledgeMutationRepository extends KnowledgeMutationOperations {
  transaction<T>(operation: (repository: KnowledgeTransactionOperations) => Promise<T>): Promise<T>;
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

export async function createLockedKnowledgeItem(
  repository: Pick<KnowledgeMutationRepository, "transaction">,
  assistantId: string,
  input: ParsedKnowledgeInput,
): Promise<KnowledgeItemRecord> {
  return repository.transaction(async (transaction) => {
    const assistant = await transaction.lockAssistant(assistantId);
    if (!assistant) throw knowledgeSourceNotFound();
    return createKnowledgeItem(transaction, assistantId, input);
  });
}

function knowledgeSourceNotFound(): Error {
  return new Error("KNOWLEDGE_SOURCE_NOT_FOUND");
}

export async function renameKnowledgeItem(
  repository: KnowledgeMutationOperations,
  assistantId: string,
  knowledgeId: string,
  title: string,
): Promise<KnowledgeItemRecord> {
  const item = await repository.findByAssistant(assistantId, knowledgeId);
  if (!item) throw knowledgeSourceNotFound();

  const updatedCount = await repository.updateTitle(assistantId, knowledgeId, title);
  if (updatedCount === 0) throw knowledgeSourceNotFound();
  return { ...item, title };
}

export async function deleteKnowledgeItem(
  repository: KnowledgeMutationRepository,
  assistantId: string,
  globalTenantId: string,
  knowledgeId: string,
): Promise<KnowledgeItemRecord> {
  return repository.transaction(async (transaction) => {
    const assistant = await transaction.lockAssistant(assistantId);
    if (!assistant || assistant.globalTenantId !== globalTenantId) {
      throw knowledgeSourceNotFound();
    }

    const item = await transaction.findByAssistant(assistantId, knowledgeId);
    if (!item) throw knowledgeSourceNotFound();

    const deletedCount = await transaction.deleteByAssistant(assistantId, knowledgeId);
    if (deletedCount === 0) throw knowledgeSourceNotFound();

    if (item.sourceType === "EXTERNAL_MANAGEMENT") {
      const remainingExternalSources = await transaction.countByAssistantAndSourceType(
        assistantId,
        "EXTERNAL_MANAGEMENT",
      );
      if (remainingExternalSources === 0) {
        await transaction.deleteCatalogProducts(globalTenantId);
        await transaction.deleteCatalogSyncEvents(globalTenantId);
      }
    }

    return item;
  });
}

type KnowledgeMutationDbClient = Pick<
  typeof labsPrisma,
  "$queryRaw" | "knowledgeItem" | "catalogProduct" | "catalogSyncEvent"
>;

function createPrismaKnowledgeMutationOperations(
  db: KnowledgeMutationDbClient,
): KnowledgeTransactionOperations {
  return {
    async lockAssistant(assistantId) {
      const assistants = await db.$queryRaw<Array<{ globalTenantId: string }>>(
        Prisma.sql`SELECT globalTenantId FROM Assistant WHERE id = ${assistantId} FOR UPDATE`,
      );
      return assistants[0] ?? null;
    },
    create(data) {
      return db.knowledgeItem.create({ data });
    },
    findByAssistant(assistantId, knowledgeId) {
      return db.knowledgeItem.findFirst({ where: { id: knowledgeId, assistantId } });
    },
    async updateTitle(assistantId, knowledgeId, title) {
      const result = await db.knowledgeItem.updateMany({
        where: { id: knowledgeId, assistantId },
        data: { title },
      });
      return result.count;
    },
    async deleteByAssistant(assistantId, knowledgeId) {
      const result = await db.knowledgeItem.deleteMany({ where: { id: knowledgeId, assistantId } });
      return result.count;
    },
    countByAssistantAndSourceType(assistantId, sourceType) {
      return db.knowledgeItem.count({ where: { assistantId, sourceType } });
    },
    async deleteCatalogProducts(globalTenantId) {
      await db.catalogProduct.deleteMany({ where: { globalTenantId } });
    },
    async deleteCatalogSyncEvents(globalTenantId) {
      await db.catalogSyncEvent.deleteMany({ where: { globalTenantId } });
    },
  };
}

export const prismaKnowledgeRepository: KnowledgeRepository = {
  create(data) {
    return labsPrisma.knowledgeItem.create({ data });
  },
};

const prismaKnowledgeMutationOperations = createPrismaKnowledgeMutationOperations(labsPrisma);

export const prismaKnowledgeMutationRepository: KnowledgeMutationRepository = {
  ...prismaKnowledgeMutationOperations,
  transaction(operation) {
    return labsPrisma.$transaction((transaction) => (
      operation(createPrismaKnowledgeMutationOperations(transaction))
    ));
  },
};

export const knowledgeRepository = {
  create(assistantId: string, input: ParsedKnowledgeInput) {
    return createLockedKnowledgeItem(prismaKnowledgeMutationRepository, assistantId, input);
  },
  rename(assistantId: string, knowledgeId: string, title: string) {
    return renameKnowledgeItem(prismaKnowledgeMutationRepository, assistantId, knowledgeId, title);
  },
  delete(assistantId: string, globalTenantId: string, knowledgeId: string) {
    return deleteKnowledgeItem(
      prismaKnowledgeMutationRepository,
      assistantId,
      globalTenantId,
      knowledgeId,
    );
  },
};
