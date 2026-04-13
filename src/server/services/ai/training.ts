import { markTrainingJobCompleted, markTrainingJobFailed, markTrainingJobStarted } from "@/server/queries/ai";
import { buildTenantKnowledgeContext } from "@/server/services/ai/knowledge";

export async function processTrainingJob(input: {
  tenantId: string;
  workspaceId: string;
  jobId: string;
}) {
  try {
    await markTrainingJobStarted(input.jobId);
    await buildTenantKnowledgeContext(input.tenantId, input.workspaceId);
    await markTrainingJobCompleted(input.jobId, input.workspaceId);
    return { ok: true };
  } catch (error) {
    await markTrainingJobFailed(
      input.jobId,
      input.workspaceId,
      error instanceof Error ? error.message : "Training job failed",
    );
    return { ok: false };
  }
}
