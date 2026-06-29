import { beforeEach, describe, expect, it, vi } from "vitest";
import { queueAiTrainingJob } from "@/server/services/labs-training";
import { processTrainingJob } from "@/server/services/ai/training";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/server/services/ai/training", () => ({
  processTrainingJob: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    aiKnowledgeItem: {
      count: vi.fn(),
    },
    aiTrainingJob: {
      create: vi.fn(),
    },
    tenantAiWorkspace: {
      update: vi.fn(),
    },
  },
}));

const mockedPrisma = vi.mocked(prisma);
const mockedProcessTrainingJob = vi.mocked(processTrainingJob);

describe("labs training queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.aiTrainingJob.create.mockResolvedValue({
      id: "job-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      status: "QUEUED",
      sourceCount: 3,
      startedByUserId: "user-1",
      summary: "Actualizar conocimiento",
      failureReason: null,
      queuedAt: new Date("2026-06-18T16:09:00.000Z"),
      startedAt: null,
      completedAt: null,
      createdAt: new Date("2026-06-18T16:09:00.000Z"),
      updatedAt: new Date("2026-06-18T16:09:00.000Z"),
    });
    mockedPrisma.tenantAiWorkspace.update.mockResolvedValue({} as never);
  });

  it("starts processing a queued training job when knowledge sources exist", async () => {
    mockedPrisma.aiKnowledgeItem.count.mockResolvedValue(3);

    await queueAiTrainingJob("tenant-1", "workspace-1", "user-1", "Actualizar conocimiento");

    expect(mockedProcessTrainingJob).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      jobId: "job-1",
    });
  });

  it("does not process draft jobs without knowledge sources", async () => {
    mockedPrisma.aiKnowledgeItem.count.mockResolvedValue(0);

    await queueAiTrainingJob("tenant-1", "workspace-1", "user-1", "Sin fuentes");

    expect(mockedProcessTrainingJob).not.toHaveBeenCalled();
  });
});
