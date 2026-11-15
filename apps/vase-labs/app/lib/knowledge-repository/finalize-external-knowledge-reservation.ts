// Parte de knowledge-repository.ts: finalizeExternalKnowledgeReservation, createExternalKnowledgeItem, renameKnowledgeItem, deleteKnowledgeItem, KnowledgeMutationDbClient.
import { labsPrisma } from "../db";
import { ExternalCatalogImportResult, ExternalKnowledgeCreationOptions, ExternalKnowledgeInput, KnowledgeItemRecord, KnowledgeMutationOperations, KnowledgeMutationRepository, assertAssistantTenant, compensateImportedCatalogIfCurrent, discardExternalKnowledgeReservation, externalReservationLeaseMs, knowledgeSourceNotFound, reserveExternalKnowledgeItem } from "./reserve-external-knowledge-item";

export async function finalizeExternalKnowledgeReservation(
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

export type KnowledgeMutationDbClient = Pick<
  typeof labsPrisma,
  "$queryRawUnsafe" | "assistant" | "knowledgeItem" | "catalogProduct" | "catalogSyncEvent"
>;
