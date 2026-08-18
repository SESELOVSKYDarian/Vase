import { describe, expect, it, vi } from "vitest";
import { processKnowledgeFile } from "../apps/vase-labs/app/lib/knowledge-file-worker";

describe("Labs knowledge file worker", () => {
  it("moves a queued file through processing to ready with extracted text", async () => {
    const update = vi.fn(async () => undefined);
    const result = await processKnowledgeFile({ id: "k1", objectKey: "tenant/k1/a.txt", mimeType: "text/plain" }, {
      download: async () => Buffer.from("Horarios: lunes a viernes"),
      extract: async (buffer) => buffer.toString("utf8"), update,
    });
    expect(result).toEqual({ status: "READY", text: "Horarios: lunes a viernes" });
    expect(update).toHaveBeenNthCalledWith(1, "k1", { status: "PROCESSING", error: null });
    expect(update).toHaveBeenLastCalledWith("k1", { status: "READY", text: "Horarios: lunes a viernes", error: null });
  });

  it("marks empty extraction as failed", async () => {
    const update = vi.fn(async () => undefined);
    const result = await processKnowledgeFile({ id: "k1", objectKey: "x", mimeType: "text/plain" }, {
      download: async () => Buffer.from(""), extract: async () => "  ", update,
    });
    expect(result.status).toBe("FAILED");
    expect(update).toHaveBeenLastCalledWith("k1", { status: "FAILED", error: "KNOWLEDGE_FILE_EMPTY" });
  });
});
