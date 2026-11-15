// Parte de knowledge-repository.ts: KnowledgeItemCreateData, KnowledgeItemRecord, KnowledgeRepository, KnowledgeMutationOperations, KnowledgeTransactionOperations, KnowledgeMutationRepository y más.
import { type ParsedKnowledgeInput } from "../knowledge-source";

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

export function knowledgeSourceNotFound(): Error {
  return new Error("KNOWLEDGE_SOURCE_NOT_FOUND");
}

export function assertAssistantTenant(
  assistant: { globalTenantId: string } | null,
  globalTenantId: string,
): asserts assistant is { globalTenantId: string } {
  if (!assistant || assistant.globalTenantId !== globalTenantId) {
    throw knowledgeSourceNotFound();
  }
}

export type ExternalCatalogImportResult = { eventId: string; processed: boolean };

export async function compensateImportedCatalogIfCurrent(
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

export type ExternalKnowledgeInput = Extract<ParsedKnowledgeInput, { type: "EXTERNAL_MANAGEMENT" }>;
export type ExternalKnowledgeCreationOptions = {
  now?: () => Date;
  leaseMs?: number;
};

export const externalReservationLeaseMs = 5 * 60_000;

export async function reserveExternalKnowledgeItem(
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

export async function discardExternalKnowledgeReservation(
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
