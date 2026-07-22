import { labsPrisma } from "./db";
import { withMysqlTenantLock } from "./mysql-tenant-lock";
import type { ParsedKnowledgeInput } from "./knowledge-source";

export type KnowledgeItemCreateData = {
  assistantId: string;
  title: string;
  sourceType: string;
  content: string;
  status: "PROCESSING" | "QUEUED" | "READY";
};

export type KnowledgeItemRecord = Omit<KnowledgeItemCreateData, "status"> & {
  id: string;
  status: string;
};

export interface KnowledgeRepository {
  create(data: KnowledgeItemCreateData): Promise<KnowledgeItemRecord>;
}

export interface KnowledgeMutationOperations {
  findAssistantTenant(assistantId: string): Promise<{ globalTenantId: string } | null>;
  withTenantLock<TResult>(globalTenantId: string, operation: () => Promise<TResult>): Promise<TResult>;
  findByAssistant(assistantId: string, knowledgeId: string): Promise<KnowledgeItemRecord | null>;
  updateTitle(assistantId: string, knowledgeId: string, title: string): Promise<number>;
  updateStatus(
    assistantId: string,
    knowledgeId: string,
    expectedStatus: string,
    status: string,
  ): Promise<number>;
  deleteByAssistant(assistantId: string, knowledgeId: string): Promise<number>;
  countByAssistantAndSourceType(assistantId: string, sourceType: string): Promise<number>;
  countByTenantAndSourceType(globalTenantId: string, sourceType: string): Promise<number>;
  deleteCatalogProducts(globalTenantId: string): Promise<void>;
  deleteCatalogSyncEvents(globalTenantId: string): Promise<void>;
}

export interface KnowledgeTransactionOperations extends KnowledgeMutationOperations, KnowledgeRepository {
}

export interface KnowledgeMutationRepository extends Pick<
  KnowledgeMutationOperations,
  "findAssistantTenant" | "findByAssistant" | "updateTitle"
> {
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
  repository: Pick<KnowledgeMutationRepository, "findAssistantTenant" | "transaction">,
  assistantId: string,
  input: ParsedKnowledgeInput,
): Promise<KnowledgeItemRecord> {
  const candidate = await repository.findAssistantTenant(assistantId);
  if (!candidate) throw knowledgeSourceNotFound();
  return repository.transaction((transaction) => (
    transaction.withTenantLock(candidate.globalTenantId, async () => {
      const assistant = await transaction.findAssistantTenant(assistantId);
      if (!assistant || assistant.globalTenantId !== candidate.globalTenantId) {
        throw knowledgeSourceNotFound();
      }
      return createKnowledgeItem(transaction, assistantId, input);
    })
  ));
}

function knowledgeSourceNotFound(): Error {
  return new Error("KNOWLEDGE_SOURCE_NOT_FOUND");
}

function assertAssistantTenant(
  assistant: { globalTenantId: string } | null,
  globalTenantId: string,
): asserts assistant is { globalTenantId: string } {
  if (!assistant || assistant.globalTenantId !== globalTenantId) {
    throw knowledgeSourceNotFound();
  }
}

async function cleanupCatalogWithoutExternalSource(
  repository: Pick<KnowledgeMutationOperations,
    "countByTenantAndSourceType" | "deleteCatalogProducts" | "deleteCatalogSyncEvents"
  >,
  globalTenantId: string,
) {
  if (await repository.countByTenantAndSourceType(globalTenantId, "EXTERNAL_MANAGEMENT") > 0) {
    return;
  }
  await repository.deleteCatalogProducts(globalTenantId);
  await repository.deleteCatalogSyncEvents(globalTenantId);
}

type ExternalKnowledgeInput = Extract<ParsedKnowledgeInput, { type: "EXTERNAL_MANAGEMENT" }>;

async function reserveExternalKnowledgeItem(
  repository: KnowledgeMutationRepository,
  assistantId: string,
  globalTenantId: string,
  input: ExternalKnowledgeInput,
): Promise<KnowledgeItemRecord> {
  const candidate = await repository.findAssistantTenant(assistantId);
  assertAssistantTenant(candidate, globalTenantId);

  return repository.transaction((transaction) => (
    transaction.withTenantLock(globalTenantId, async () => {
      const assistant = await transaction.findAssistantTenant(assistantId);
      assertAssistantTenant(assistant, globalTenantId);
      const existing = await transaction.countByAssistantAndSourceType(
        assistantId,
        "EXTERNAL_MANAGEMENT",
      );
      if (existing > 0) throw new Error("KNOWLEDGE_SOURCE_ALREADY_EXISTS");
      return transaction.create({
        ...mapKnowledgeInputToCreateData(assistantId, input),
        status: "PROCESSING",
      });
    })
  ));
}

async function discardExternalKnowledgeReservation(
  repository: KnowledgeMutationRepository,
  assistantId: string,
  globalTenantId: string,
  knowledgeId: string,
): Promise<void> {
  const candidate = await repository.findAssistantTenant(assistantId);
  assertAssistantTenant(candidate, globalTenantId);

  await repository.transaction((transaction) => (
    transaction.withTenantLock(globalTenantId, async () => {
      const assistant = await transaction.findAssistantTenant(assistantId);
      assertAssistantTenant(assistant, globalTenantId);
      const reservation = await transaction.findByAssistant(assistantId, knowledgeId);
      if (reservation?.sourceType === "EXTERNAL_MANAGEMENT" && reservation.status === "PROCESSING") {
        await transaction.deleteByAssistant(assistantId, knowledgeId);
      }
      await cleanupCatalogWithoutExternalSource(transaction, globalTenantId);
    })
  ));
}

async function finalizeExternalKnowledgeReservation(
  repository: KnowledgeMutationRepository,
  assistantId: string,
  globalTenantId: string,
  knowledgeId: string,
): Promise<KnowledgeItemRecord> {
  const candidate = await repository.findAssistantTenant(assistantId);
  assertAssistantTenant(candidate, globalTenantId);

  const finalized = await repository.transaction((transaction) => (
    transaction.withTenantLock(globalTenantId, async () => {
      const assistant = await transaction.findAssistantTenant(assistantId);
      assertAssistantTenant(assistant, globalTenantId);
      const reservation = await transaction.findByAssistant(assistantId, knowledgeId);
      if (reservation?.sourceType === "EXTERNAL_MANAGEMENT" && reservation.status === "PROCESSING") {
        const updated = await transaction.updateStatus(
          assistantId,
          knowledgeId,
          "PROCESSING",
          "READY",
        );
        if (updated === 1) return { ...reservation, status: "READY" };
      }

      await cleanupCatalogWithoutExternalSource(transaction, globalTenantId);
      return null;
    })
  ));
  if (!finalized) throw new Error("KNOWLEDGE_SOURCE_RESERVATION_LOST");
  return finalized;
}

export async function createExternalKnowledgeItem(
  repository: KnowledgeMutationRepository,
  assistantId: string,
  globalTenantId: string,
  input: ExternalKnowledgeInput,
  importSnapshot: (globalTenantId: string) => Promise<unknown>,
): Promise<KnowledgeItemRecord> {
  const reservation = await reserveExternalKnowledgeItem(
    repository,
    assistantId,
    globalTenantId,
    input,
  );
  try {
    await importSnapshot(globalTenantId);
  } catch (error) {
    await discardExternalKnowledgeReservation(
      repository,
      assistantId,
      globalTenantId,
      reservation.id,
    );
    throw error;
  }
  return finalizeExternalKnowledgeReservation(
    repository,
    assistantId,
    globalTenantId,
    reservation.id,
  );
}

export async function renameKnowledgeItem(
  repository: Pick<KnowledgeMutationOperations, "findByAssistant" | "updateTitle">,
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
  const candidate = await repository.findAssistantTenant(assistantId);
  if (!candidate || candidate.globalTenantId !== globalTenantId) {
    throw knowledgeSourceNotFound();
  }

  return repository.transaction((transaction) => (
    transaction.withTenantLock(candidate.globalTenantId, async () => {
      const assistant = await transaction.findAssistantTenant(assistantId);
      if (!assistant || assistant.globalTenantId !== candidate.globalTenantId) {
        throw knowledgeSourceNotFound();
      }

      const item = await transaction.findByAssistant(assistantId, knowledgeId);
      if (!item) throw knowledgeSourceNotFound();

      const deletedCount = await transaction.deleteByAssistant(assistantId, knowledgeId);
      if (deletedCount === 0) throw knowledgeSourceNotFound();

      if (item.sourceType === "EXTERNAL_MANAGEMENT") {
        const remainingExternalSources = await transaction.countByTenantAndSourceType(
          assistant.globalTenantId,
          "EXTERNAL_MANAGEMENT",
        );
        if (remainingExternalSources === 0) {
          await transaction.deleteCatalogProducts(assistant.globalTenantId);
          await transaction.deleteCatalogSyncEvents(assistant.globalTenantId);
        }
      }

      return item;
    })
  ));
}

type KnowledgeMutationDbClient = Pick<
  typeof labsPrisma,
  "$queryRawUnsafe" | "assistant" | "knowledgeItem" | "catalogProduct" | "catalogSyncEvent"
>;

function createPrismaKnowledgeMutationOperations(
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
    async updateTitle(assistantId, knowledgeId, title) {
      const result = await db.knowledgeItem.updateMany({
        where: { id: knowledgeId, assistantId },
        data: { title },
      });
      return result.count;
    },
    async updateStatus(assistantId, knowledgeId, expectedStatus, status) {
      const result = await db.knowledgeItem.updateMany({
        where: { id: knowledgeId, assistantId, status: expectedStatus },
        data: { status },
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
    importSnapshot: (globalTenantId: string) => Promise<unknown>,
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
