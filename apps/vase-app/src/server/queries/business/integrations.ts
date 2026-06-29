import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function listErpConnectionsByTenant(tenantId: string) {
  return prisma.erpConnection.findMany({
    where: { tenantId },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getErpConnectionById(tenantId: string, connectionId: string) {
  return prisma.erpConnection.findFirst({
    where: {
      tenantId,
      id: connectionId,
    },
  });
}

export async function createSyncJob(input: Prisma.SyncJobUncheckedCreateInput) {
  return prisma.syncJob.create({
    data: input,
  });
}

export async function updateSyncJob(jobId: string, data: Prisma.SyncJobUncheckedUpdateInput) {
  return prisma.syncJob.update({
    where: { id: jobId },
    data,
  });
}

export async function findProductSyncRecord(
  tenantId: string,
  externalId: string,
  sourceSystem: string,
) {
  return prisma.productSyncRecord.findUnique({
    where: {
      tenantId_externalId_sourceSystem: {
        tenantId,
        externalId,
        sourceSystem,
      },
    },
  });
}

export async function upsertProductSyncRecord(input: Prisma.ProductSyncRecordUncheckedCreateInput) {
  return prisma.productSyncRecord.upsert({
    where: {
      tenantId_externalId_sourceSystem: {
        tenantId: input.tenantId,
        externalId: input.externalId,
        sourceSystem: input.sourceSystem,
      },
    },
    update: {
      productId: input.productId,
      erpConnectionId: input.erpConnectionId,
      lastSyncAt: input.lastSyncAt,
      rawPayload: input.rawPayload,
    },
    create: input,
  });
}
