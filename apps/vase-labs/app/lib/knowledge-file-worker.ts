export type KnowledgeFileJob = { id: string; objectKey: string; mimeType: string };
type Dependencies = {
  download(key: string): Promise<Buffer>;
  extract(buffer: Buffer, mimeType: string): Promise<string>;
  update(id: string, data: { status: "PROCESSING"; error: null } | { status: "READY"; text: string; error: null } | { status: "FAILED"; error: string }): Promise<void>;
};

export async function processKnowledgeFile(job: KnowledgeFileJob, dependencies: Dependencies) {
  await dependencies.update(job.id, { status: "PROCESSING", error: null });
  try {
    const buffer = await dependencies.download(job.objectKey);
    const text = (await dependencies.extract(buffer, job.mimeType)).trim();
    if (!text) throw new Error("KNOWLEDGE_FILE_EMPTY");
    await dependencies.update(job.id, { status: "READY", text, error: null });
    return { status: "READY" as const, text };
  } catch (error) {
    const message = error instanceof Error ? error.message : "KNOWLEDGE_FILE_PROCESSING_FAILED";
    await dependencies.update(job.id, { status: "FAILED", error: message });
    return { status: "FAILED" as const, error: message };
  }
}
