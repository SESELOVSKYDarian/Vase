// El código está repartido por tema en la carpeta labs-entitlements-service/. Este archivo solo lo junta.
// partes: ./labs-entitlements-service/create-labs-entitlements-service.ts, ./labs-entitlements-service/prisma-labs-entitlements-repository.ts
export { type LabsEntitlementRecord, type UpsertLabsEntitlementInput, type LabsEntitlementsRepository, type RegisterPersistedTokenUsageInput, createLabsEntitlementsService } from "./labs-entitlements-service/create-labs-entitlements-service";
export { prismaLabsEntitlementsRepository, labsEntitlementsService } from "./labs-entitlements-service/prisma-labs-entitlements-repository";
