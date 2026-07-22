import { labsPrisma } from "./db";
import { withMysqlTenantLock } from "./mysql-tenant-lock";
import type { ParsedKnowledgeInput } from "./knowledge-source";

export type KnowledgeItemCreateData = {
  assistantId: string;
  title: string;
  sourceType: string;
  content: string;
  status: "PROCESSING" | "QUEUED" | "READY";
  updatedAt?: Date;
};

export type KnowledgeItemRecord = Omit<KnowledgeItemCreateData, "status" | "updatedAt"> & {
  id: string;
  status: string;
  updatedAt: Date;
};

export interface KnowledgeRepository {
  create(data: KnowledgeItemCreateData): Promise<KnowledgeItemRecord>;
}

export interface KnowledgeMutationOperations {
  findAssistantTenant(assistantId: string): Promise<{ globalTenantId: string } | null>;
  withTenantLock<TResult>(globalTenantId: string, operation: () => Promise<TResult>): Promise<TResult>;
  findByAssistant(assistantId: string, knowledgeId: string): Promise<KnowledgeItemRecord | null>;
  findByAssistantAndSourceType(
    assistantId: string,
    sourceType: string,
  ): Promise<KnowledgeItemRecord | null>;
  updateTitle(assistantId: string, knowledgeId: string, title: string): Promise<number>;
  updateStatus(
    assistantId: string,
    knowledgeId: string,
    expectedStatus: string,
    expectedUpdatedAt: Date,
    status: string,
  ): Promise<number>;
  refreshProcessingReservation(
    assistantId: string,
    knowledgeId: string,
    expectedUpdatedAt: Date,
    data: KnowledgeItemCreateData,
    updatedAt: Date,
  ): Promise<number>;
  deleteProcessingReservation(
    assistantId: string,
    knowledgeId: string,
    expectedUpdatedAt: Date,
  ): Promise<number>;
  deleteByAssistant(assistantId: string, knowledgeId: string): Promise<number>;
  countByAssistantAndSourceType(assistantId: string, sourceType: string): Promise<number>;
  countByTenantAndSourceType(globalTenantId: string, sourceType: string): Promise<number>;
  countReadyByTenantAndSourceType(globalTenantId: string, sourceType: string): Promise<number>;
  deleteCatalogProducts(globalTenantId: string): Promise<void>;
  deleteCatalogSyncEvents(globalTenantId: string): Promise<void>;
  latestCatalogSyncEvent(globalTenantId: string): Promise<{ eventId: string } | null>;
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

export type ExternalCatalogImportResult = { eventId: string; processed: boolean };

async function compensateImportedCatalogIfCurrent(
  repository: Pick<KnowledgeMutationOperations,
    "countReadyByTenantAndSourceType" | "deleteCatalogProducts" | "deleteCatalogSyncEvents"
    | "latestCatalogSyncEvent"
  >,
  globalTenantId: string,
  importResult: ExternalCatalogImportResult,
) {
  if (!importResult.processed) return;
  if (await repository.countReadyByTenantAndSourceType(globalTenantId, "EXTERNAL_MANAGEMENT") > 0) {
    return;
  }
  const latestEvent = await repository.latestCatalogSyncEvent(globalTenantId);
  if (latestEvent?.eventId !== importResult.eventId) return;
  await repository.deleteCatalogProducts(globalTenantId);
  await repository.deleteCatalogSyncEvents(globalTenantId);
}

type ExternalKnowledgeInput = Extract<ParsedKnowledgeInput, { type: "EXTERNAL_MANAGEMENT" }>;
type ExternalKnowledgeCreationOptions = {
  now?: () => Date;
  leaseMs?: number;
};

const externalReservationLeaseMs = 5 * 60_000;

async function reserveExternalKnowledgeItem(
  repository: KnowledgeMutationRepository,
  assistantId: string,
  globalTenantId: string,
  input: ExternalKnowledgeInput,
  now: Date,
  leaseMs: number,
): Promise<KnowledgeItemRecord> {
  const candidate = await repository.findAssistantTenant(assistantId);
  assertAssistantTenant(candidate, globalTenantId);

  return repository.transaction((transaction) => (
    transaction.withTenantLock(globalTenantId, async () => {
      const assistant = await transaction.findAssistantTenant(assistantId);
      assertAssistantTenant(assistant, globalTenantId);
      const existing = await transaction.findByAssistantAndSourceType(
        assistantId,
        "EXTERNAL_MANAGEMENT",
      );
      if (existing) {
        const leaseIsFresh = existing.status !== "PROCESSING"
          || !(existing.updatedAt instanceof Date)
          || existing.updatedAt.getTime() > now.getTime() - leaseMs;
        if (leaseIsFresh) throw new Error("KNOWLEDGE_SOURCE_ALREADY_EXISTS");
        const refreshedData = {
          ...mapKnowledgeInputToCreateData(assistantId, input),
          status: "PROCESSING" as const,
          updatedAt: now,
        };
        const refreshed = await transaction.refreshProcessingReservation(
          assistantId,
          existing.id,
          existing.updatedAt,
          refreshedData,
          now,
        );
        if (refreshed !== 1) throw new Error("KNOWLEDGE_SOURCE_ALREADY_EXISTS");
        return { ...existing, ...refreshedData, updatedAt: now };
      }
      return transaction.create({
        ...mapKnowledgeInputToCreateData(assistantId, input),
        status: "PROCESSING",
        updatedAt: now,
      });
    })
  ));
}

async function discardExternalKnowledgeReservation(
  repository: KnowledgeMutationRepository,
  assistantId: string,
  globalTenantId: string,
  knowledgeId: string,
  reservationUpdatedAt: Date,
): Promise<void> {
  const candidate = await repository.findAssistantTenant(assistantId);
  assertAssistantTenant(candidate, globalTenantId);

  await repository.transaction((transaction) => (
    transaction.withTenantLock(globalTenantId, async () => {
      const assistant = await transaction.findAssistantTenant(assistantId);
      assertAssistantTenant(assistant, globalTenantId);
      const reservation = await transaction.findByAssistant(assistantId, knowledgeId);
      if (reservation?.sourceType === "EXTERNAL_MANAGEMENT" && reservation.status === "PROCESSING") {
        await transaction.deleteProcessingReservation(
          assistantId,
          knowledgeId,
          reservationUpdatedAt,
        );
      }
    })
  ));
}

async function finalizeExternalKnowledgeReservation(
  repository: KnowledgeMutationRepository,
  assistantId: string,
  globalTenantId: string,
  knowledgeId: string,
  reservationUpdatedAt: Date,
  importResult: ExternalCatalogImportResult,
): Promise<KnowledgeItemRecord> {
  const candidate = await repository.findAssistantTenant(assistantId);
  assertAssistantTenant(candidate, globalTenantId);

  const finalized = await repository.transaction((transaction) => (
    transaction.withTenantLock(globalTenantId, async () => {
      const assistant = await transaction.findAssistantTenant(assistantId);
      assertAssistantTenant(assistant, globalTenantId);
      const reservation = await transaction.findByAssistant(assistantId, knowledgeId);
      if (reservation?.sourceType === "EXTERNAL_MANAGEMENT"
        && reservation.status === "PROCESSING"
        && reservation.updatedAt.getTime() === reservationUpdatedAt.getTime()) {
        const latestEvent = await transaction.latestCatalogSyncEvent(globalTenantId);
        if (latestEvent?.eventId === importResult.eventId) {
          const updated = await transaction.updateStatus(
            assistantId,
            knowledgeId,
            "PROCESSING",
            reservationUpdatedAt,
            "READY",
          );
          if (updated === 1) return { ...reservation, status: "READY" };
        } else {
          await transaction.deleteProcessingReservation(
            assistantId,
            knowledgeId,
            reservationUpdatedAt,
          );
        }
      }

      await compensateImportedCatalogIfCurrent(transaction, globalTenantId, importResult);
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
  importSnapshot: (globalTenantId: string) => Promise<ExternalCatalogImportResult>,
  options: ExternalKnowledgeCreationOptions = {},
): Promise<KnowledgeItemRecord> {
  const now = options.now?.() ?? new Date();
  const reservation = await reserveExternalKnowledgeItem(
    repository,
    assistantId,
    globalTenantId,
    input,
    now,
    options.leaseMs ?? externalReservationLeaseMs,
  );
  let importResult: ExternalCatalogImportResult;
  try {
    importResult = await importSnapshot(globalTenantId);
  } catch (error) {
    try {
      await discardExternalKnowledgeReservation(
        repository,
        assistantId,
        globalTenantId,
        reservation.id,
        reservation.updatedAt,
      );
    } catch {
      // Preserve the classified upstream error; the durable lease permits a later takeover.
    }
    throw error;
  }
  return finalizeExternalKnowledgeReservation(
    repository,
    assistantId,
    globalTenantId,
    reservation.id,
    reservation.updatedAt,
    importResult,
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
