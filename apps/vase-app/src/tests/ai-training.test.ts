import { beforeEach, describe, expect, it, vi } from "vitest";
import { processTrainingJob } from "@/server/services/ai/training";
import { buildTenantKnowledgeContext } from "@/server/services/ai/knowledge";
import { processQueuedKnowledgeItems } from "@/server/services/ai/knowledge-processing";
import { markTrainingJobCompleted, markTrainingJobFailed, markTrainingJobStarted } from "@/server/queries/ai";

vi.mock("@/server/queries/ai", () => ({
  markTrainingJobStarted: vi.fn().mockResolvedValue(undefined),
  markTrainingJobCompleted: vi.fn().mockResolvedValue(undefined),
  markTrainingJobFailed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/services/ai/knowledge", () => ({
  buildTenantKnowledgeContext: vi.fn().mockResolvedValue({ items: [], text: "" }),
}));

vi.mock("@/server/services/ai/knowledge-processing", () => ({
  processQueuedKnowledgeItems: vi.fn().mockResolvedValue({ processed: 0 }),
}));

const mockedProcessQueuedKnowledgeItems = vi.mocked(processQueuedKnowledgeItems);
const mockedBuildTenantKnowledgeContext = vi.mocked(buildTenantKnowledgeContext);

describe("AI training processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes queued knowledge items before building the training context", async () => {
    await processTrainingJob({
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      jobId: "job-1",
    });

    expect(mockedProcessQueuedKnowledgeItems).toHaveBeenCalledWith("tenant-1", "workspace-1");
    expect(mockedProcessQueuedKnowledgeItems.mock.invocationCallOrder[0]).toBeLessThan(
      mockedBuildTenantKnowledgeContext.mock.invocationCallOrder[0],
    );
    expect(markTrainingJobStarted).toHaveBeenCalledWith("job-1");
    expect(markTrainingJobCompleted).toHaveBeenCalledWith("job-1", "workspace-1");
  });

  it("marks the job as failed when queued knowledge processing fails", async () => {
    mockedProcessQueuedKnowledgeItems.mockRejectedValueOnce(new Error("PDF processing failed"));

    const result = await processTrainingJob({
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      jobId: "job-1",
    });

    expect(result).toEqual({ ok: false });
    expect(markTrainingJobFailed).toHaveBeenCalledWith("job-1", "workspace-1", "PDF processing failed");
  });
});
