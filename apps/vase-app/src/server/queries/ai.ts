import { AiChannelStatus, AiKnowledgeItemStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function getTenantAiWorkspaceConfig(tenantId: string) {
  return prisma.tenantAiWorkspace.findUnique({
    where: { tenantId },
    include: {
      channels: {
        where: {
          status: {
            in: [AiChannelStatus.CONNECTED, AiChannelStatus.PENDING],
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function listReadyKnowledgeItems(tenantId: string, workspaceId: string) {
  return prisma.aiKnowledgeItem.findMany({
    where: {
      tenantId,
      workspaceId,
      status: AiKnowledgeItemStatus.READY,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function markTrainingJobStarted(jobId: string) {
  return prisma.aiTrainingJob.update({
    where: { id: jobId },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
    },
  });
}

export async function markTrainingJobCompleted(jobId: string, workspaceId: string) {
  const now = new Date();

  await prisma.aiTrainingJob.update({
    where: { id: jobId },
    data: {
      status: "READY",
      completedAt: now,
    },
  });

  return prisma.tenantAiWorkspace.update({
    where: { id: workspaceId },
    data: {
      trainingStatus: "READY",
      lastTrainedAt: now,
    },
  });
}

export async function markTrainingJobFailed(jobId: string, workspaceId: string, reason: string) {
  await prisma.aiTrainingJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      failureReason: reason,
    },
  });

  return prisma.tenantAiWorkspace.update({
    where: { id: workspaceId },
    data: {
      trainingStatus: "FAILED",
    },
  });
}
