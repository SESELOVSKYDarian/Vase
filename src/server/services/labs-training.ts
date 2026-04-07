import { prisma } from "@/lib/db/prisma";

export async function queueAiTrainingJob(
  tenantId: string,
  workspaceId: string,
  startedByUserId?: string,
  summary?: string,
) {
  const sourceCount = await prisma.aiKnowledgeItem.count({
    where: {
      tenantId,
      workspaceId,
      status: {
        in: ["QUEUED", "READY"],
      },
    },
  });

  const job = await prisma.aiTrainingJob.create({
    data: {
      tenantId,
      workspaceId,
      startedByUserId,
      status: sourceCount === 0 ? "DRAFT" : "QUEUED",
      sourceCount,
      summary,
      queuedAt: new Date(),
    },
  });

  await prisma.tenantAiWorkspace.update({
    where: { tenantId },
    data: {
      trainingStatus: sourceCount === 0 ? "DRAFT" : "QUEUED",
    },
  });

  return job;
}
