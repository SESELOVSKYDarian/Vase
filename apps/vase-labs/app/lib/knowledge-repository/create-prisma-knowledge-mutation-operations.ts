// Parte de knowledge-repository.ts: createPrismaKnowledgeMutationOperations, prismaKnowledgeRepository, prismaKnowledgeMutationOperations, knowledgeTransactionOptions, prismaKnowledgeMutationRepository, knowledgeRepository.
import { labsPrisma } from "../db";
import { withMysqlTenantLock } from "../mysql-tenant-lock";
import { type ParsedKnowledgeInput } from "../knowledge-source";
import { ExternalCatalogImportResult, ExternalKnowledgeInput, KnowledgeMutationRepository, KnowledgeRepository, KnowledgeTransactionOperations, createLockedKnowledgeItem } from "./reserve-external-knowledge-item";
import { KnowledgeMutationDbClient, createExternalKnowledgeItem, deleteKnowledgeItem, renameKnowledgeItem } from "./finalize-external-knowledge-reservation";

export function createPrismaKnowledgeMutationOperations(
  db: KnowledgeMutationDbClient,
): KnowledgeTransactionOperations {
  return {
    findAssistantTenant(assistantId) {
      return db.assistant.findUnique({
        where: { id: assistantId },
        select: { globalTenantId: true },
      });
    },
    withTenantLock(globalTenantId, operation) {
      return withMysqlTenantLock(db, globalTenantId, operation);
    },
    create(data) {
      return db.knowledgeItem.create({ data });
    },
    findByAssistant(assistantId, knowledgeId) {
      return db.knowledgeItem.findFirst({ where: { id: knowledgeId, assistantId } });
    },
    findByAssistantAndSourceType(assistantId, sourceType) {
      return db.knowledgeItem.findFirst({
        where: { assistantId, sourceType },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
    },
    async updateTitle(assistantId, knowledgeId, title) {
      const result = await db.knowledgeItem.updateMany({
        where: { id: knowledgeId, assistantId },
        data: { title },
      });
      return result.count;
    },
    async updateStatus(assistantId, knowledgeId, expectedStatus, expectedUpdatedAt, status) {
      const result = await db.knowledgeItem.updateMany({
        where: { id: knowledgeId, assistantId, status: expectedStatus, updatedAt: expectedUpdatedAt },
        data: { status },
      });
      return result.count;
    },
    async refreshProcessingReservation(
      assistantId,
      knowledgeId,
      expectedUpdatedAt,
      data,
      updatedAt,
    ) {
      const result = await db.knowledgeItem.updateMany({
        where: {
          id: knowledgeId,
          assistantId,
          status: "PROCESSING",
          updatedAt: expectedUpdatedAt,
        },
        data: {
          title: data.title,
          content: data.content,
          status: "PROCESSING",
          updatedAt,
        },
      });
      return result.count;
    },
    async deleteProcessingReservation(assistantId, knowledgeId, expectedUpdatedAt) {
      const result = await db.knowledgeItem.deleteMany({
        where: {
          id: knowledgeId,
          assistantId,
          status: "PROCESSING",
          updatedAt: expectedUpdatedAt,
        },
      });
      return result.count;
    },
    async deleteByAssistant(assistantId, knowledgeId) {
      const result = await db.knowledgeItem.deleteMany({ where: { id: knowledgeId, assistantId } });
      return result.count;
    },
    countByTenantAndSourceType(globalTenantId, sourceType) {
      return db.knowledgeItem.count({
        where: { sourceType, assistant: { globalTenantId } },
      });
    },
    countReadyByTenantAndSourceType(globalTenantId, sourceType) {
      return db.knowledgeItem.count({
        where: { sourceType, status: "READY", assistant: { globalTenantId } },
      });
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
    latestCatalogSyncEvent(globalTenantId) {
      return db.catalogSyncEvent.findFirst({
        where: { globalTenantId },
        orderBy: [{ occurredAt: "desc" }, { processedAt: "desc" }],
        select: { eventId: true },
      });
    },
  };
}

export const prismaKnowledgeRepository: KnowledgeRepository = {
  create(data) {
    return labsPrisma.knowledgeItem.create({ data });
  },
};

export const prismaKnowledgeMutationOperations = createPrismaKnowledgeMutationOperations(labsPrisma);

export const knowledgeTransactionOptions = {
  maxWait: 10_000,
  timeout: 60_000,
  isolationLevel: "ReadCommitted",
} as const;

export const prismaKnowledgeMutationRepository: KnowledgeMutationRepository = {
  findAssistantTenant: prismaKnowledgeMutationOperations.findAssistantTenant,
  findByAssistant: prismaKnowledgeMutationOperations.findByAssistant,
  updateTitle: prismaKnowledgeMutationOperations.updateTitle,
  transaction(operation) {
    return labsPrisma.$transaction((transaction) => (
      operation(createPrismaKnowledgeMutationOperations(transaction))
    ), knowledgeTransactionOptions);
  },
};

export const knowledgeRepository = {
  create(assistantId: string, input: ParsedKnowledgeInput) {
    return createLockedKnowledgeItem(prismaKnowledgeMutationRepository, assistantId, input);
  },
  createExternal(
    assistantId: string,
    globalTenantId: string,
    input: ExternalKnowledgeInput,
    importSnapshot: (globalTenantId: string) => Promise<ExternalCatalogImportResult>,
  ) {
    return createExternalKnowledgeItem(
      prismaKnowledgeMutationRepository,
      assistantId,
      globalTenantId,
      input,
      importSnapshot,
    );
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
