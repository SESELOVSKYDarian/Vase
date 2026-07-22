import { describe, expect, it } from "vitest";
import {
  createLockedKnowledgeItem,
  deleteKnowledgeItem,
  renameKnowledgeItem,
  type KnowledgeMutationRepository,
  type KnowledgeTransactionOperations,
  type KnowledgeItemRecord,
} from "../apps/vase-labs/app/lib/knowledge-repository";

type MemoryState = {
  assistants: Map<string, string>;
  items: Map<string, KnowledgeItemRecord>;
  catalogProducts: Set<string>;
  catalogSyncEvents: Set<string>;
};

function cloneState(state: MemoryState): MemoryState {
  return {
    assistants: new Map(state.assistants),
    items: new Map([...state.items].map(([id, item]) => [id, { ...item }])),
    catalogProducts: new Set(state.catalogProducts),
    catalogSyncEvents: new Set(state.catalogSyncEvents),
  };
}

function knowledgeItem(
  id: string,
  assistantId: string,
  sourceType: string,
  title = id,
): KnowledgeItemRecord {
  return { id, assistantId, sourceType, title, content: "content", status: "READY" };
}

function memoryRepository(initialState: MemoryState, options?: { failCatalogEventDelete?: boolean }) {
  let state = cloneState(initialState);
  const lockTails = new Map<string, Promise<void>>();

  async function acquireAssistantLock(assistantId: string) {
    const previous = lockTails.get(assistantId) ?? Promise.resolve();
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => gate);
    lockTails.set(assistantId, tail);
    await previous;
    return () => {
      release();
      if (lockTails.get(assistantId) === tail) lockTails.delete(assistantId);
    };
  }

  function operationsFor(target: () => MemoryState): KnowledgeTransactionOperations {
    return {
      async lockAssistant(assistantId) {
        const globalTenantId = target().assistants.get(assistantId);
        return globalTenantId ? { globalTenantId } : null;
      },
      async create(data) {
        const record = { ...data, id: `created-${target().items.size + 1}` };
        target().items.set(record.id, record);
        return record;
      },
      async findByAssistant(assistantId, knowledgeId) {
        const item = target().items.get(knowledgeId);
        return item?.assistantId === assistantId ? { ...item } : null;
      },
      async updateTitle(assistantId, knowledgeId, title) {
        const item = target().items.get(knowledgeId);
        if (!item || item.assistantId !== assistantId) throw new Error("KNOWLEDGE_SOURCE_NOT_FOUND");
        const updated = { ...item, title };
        target().items.set(knowledgeId, updated);
        return 1;
      },
      async deleteByAssistant(assistantId, knowledgeId) {
        const item = target().items.get(knowledgeId);
        if (!item || item.assistantId !== assistantId) throw new Error("KNOWLEDGE_SOURCE_NOT_FOUND");
        target().items.delete(knowledgeId);
        return 1;
      },
      async countByAssistantAndSourceType(assistantId, sourceType) {
        return [...target().items.values()].filter(
          (item) => item.assistantId === assistantId && item.sourceType === sourceType,
        ).length;
      },
      async deleteCatalogProducts(globalTenantId) {
        target().catalogProducts.delete(globalTenantId);
      },
      async deleteCatalogSyncEvents(globalTenantId) {
        if (options?.failCatalogEventDelete) throw new Error("SYNC_EVENT_DELETE_FAILED");
        target().catalogSyncEvents.delete(globalTenantId);
      },
    };
  }

  const repository: KnowledgeMutationRepository = {
    ...operationsFor(() => state),
    async transaction(operation) {
      let draft: MemoryState | null = null;
      let releaseLock: (() => void) | null = null;
      const transactionOperations = operationsFor(() => {
        if (!draft) throw new Error("ASSISTANT_LOCK_REQUIRED");
        return draft;
      });
      transactionOperations.lockAssistant = async (assistantId) => {
        releaseLock = await acquireAssistantLock(assistantId);
        draft = cloneState(state);
        const globalTenantId = draft.assistants.get(assistantId);
        return globalTenantId ? { globalTenantId } : null;
      };
      try {
        const result = await operation(transactionOperations);
        if (!draft) throw new Error("ASSISTANT_LOCK_REQUIRED");
        state = draft;
        return result;
      } finally {
        releaseLock?.();
      }
    },
  };

  return { repository, state: () => state };
}

function initialState(items: KnowledgeItemRecord[]): MemoryState {
  return {
    assistants: new Map([
      ["assistant-1", "tenant-1"],
      ["assistant-2", "tenant-2"],
    ]),
    items: new Map(items.map((item) => [item.id, item])),
    catalogProducts: new Set(["tenant-1", "tenant-2"]),
    catalogSyncEvents: new Set(["tenant-1", "tenant-2"]),
  };
}

describe("Labs knowledge source repository mutations", () => {
  it("locks the assistant boundary while creating knowledge", async () => {
    const memory = memoryRepository(initialState([]));

    await expect(createLockedKnowledgeItem(memory.repository, "assistant-1", {
      type: "FAQ",
      title: "Shipping",
      question: "When?",
      answer: "Tomorrow",
    })).resolves.toMatchObject({ assistantId: "assistant-1", title: "Shipping" });
  });

  it("renames an item selected under the trusted assistant", async () => {
    const memory = memoryRepository(initialState([
      knowledgeItem("knowledge-1", "assistant-1", "FAQ", "Old title"),
    ]));

    await expect(
      renameKnowledgeItem(memory.repository, "assistant-1", "knowledge-1", "New title"),
    ).resolves.toMatchObject({ id: "knowledge-1", title: "New title" });
    expect(memory.state().items.get("knowledge-1")?.title).toBe("New title");
  });

  it("returns not found instead of renaming an item owned by another assistant", async () => {
    const memory = memoryRepository(initialState([
      knowledgeItem("knowledge-1", "assistant-2", "FAQ", "Private title"),
    ]));

    await expect(
      renameKnowledgeItem(memory.repository, "assistant-1", "knowledge-1", "Leaked update"),
    ).rejects.toThrow("KNOWLEDGE_SOURCE_NOT_FOUND");
    expect(memory.state().items.get("knowledge-1")?.title).toBe("Private title");
  });

  it("returns not found without deleting an item owned by another assistant", async () => {
    const memory = memoryRepository(initialState([
      knowledgeItem("knowledge-1", "assistant-2", "EXTERNAL_MANAGEMENT"),
    ]));

    await expect(
      deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-1", "knowledge-1"),
    ).rejects.toThrow("KNOWLEDGE_SOURCE_NOT_FOUND");
    expect(memory.state().items.has("knowledge-1")).toBe(true);
    expect(memory.state().catalogProducts).toEqual(new Set(["tenant-1", "tenant-2"]));
    expect(memory.state().catalogSyncEvents).toEqual(new Set(["tenant-1", "tenant-2"]));
  });

  it("fails closed when the supplied tenant does not match the locked assistant", async () => {
    const memory = memoryRepository(initialState([
      knowledgeItem("knowledge-1", "assistant-1", "EXTERNAL_MANAGEMENT"),
    ]));

    await expect(
      deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-2", "knowledge-1"),
    ).rejects.toThrow("KNOWLEDGE_SOURCE_NOT_FOUND");
    expect(memory.state().items.has("knowledge-1")).toBe(true);
    expect(memory.state().catalogProducts).toEqual(new Set(["tenant-1", "tenant-2"]));
    expect(memory.state().catalogSyncEvents).toEqual(new Set(["tenant-1", "tenant-2"]));
  });

  it("deletes tenant catalog rows with the final external-management item only", async () => {
    const memory = memoryRepository(initialState([
      knowledgeItem("knowledge-1", "assistant-1", "EXTERNAL_MANAGEMENT"),
      knowledgeItem("knowledge-2", "assistant-2", "EXTERNAL_MANAGEMENT"),
    ]));

    await expect(
      deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-1", "knowledge-1"),
    ).resolves.toMatchObject({ id: "knowledge-1" });
    expect(memory.state().items.has("knowledge-1")).toBe(false);
    expect(memory.state().items.has("knowledge-2")).toBe(true);
    expect(memory.state().catalogProducts).toEqual(new Set(["tenant-2"]));
    expect(memory.state().catalogSyncEvents).toEqual(new Set(["tenant-2"]));
  });

  it("preserves catalog rows while the assistant has another external-management item", async () => {
    const memory = memoryRepository(initialState([
      knowledgeItem("knowledge-1", "assistant-1", "EXTERNAL_MANAGEMENT"),
      knowledgeItem("knowledge-2", "assistant-1", "EXTERNAL_MANAGEMENT"),
    ]));

    await deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-1", "knowledge-1");

    expect(memory.state().items.has("knowledge-1")).toBe(false);
    expect(memory.state().catalogProducts).toEqual(new Set(["tenant-1", "tenant-2"]));
    expect(memory.state().catalogSyncEvents).toEqual(new Set(["tenant-1", "tenant-2"]));
  });

  it("serializes concurrent external deletions so the final deletion cleans the catalog", async () => {
    const memory = memoryRepository(initialState([
      knowledgeItem("knowledge-1", "assistant-1", "EXTERNAL_MANAGEMENT"),
      knowledgeItem("knowledge-2", "assistant-1", "EXTERNAL_MANAGEMENT"),
    ]));

    await Promise.all([
      deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-1", "knowledge-1"),
      deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-1", "knowledge-2"),
    ]);

    expect(memory.state().items.size).toBe(0);
    expect(memory.state().catalogProducts).toEqual(new Set(["tenant-2"]));
    expect(memory.state().catalogSyncEvents).toEqual(new Set(["tenant-2"]));
  });

  it("does not clean catalog rows when deleting a non-external item", async () => {
    const memory = memoryRepository(initialState([
      knowledgeItem("knowledge-1", "assistant-1", "FAQ"),
    ]));

    await deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-1", "knowledge-1");

    expect(memory.state().items.has("knowledge-1")).toBe(false);
    expect(memory.state().catalogProducts).toEqual(new Set(["tenant-1", "tenant-2"]));
    expect(memory.state().catalogSyncEvents).toEqual(new Set(["tenant-1", "tenant-2"]));
  });

  it("rolls back the item and catalog deletion when transactional cleanup fails", async () => {
    const memory = memoryRepository(
      initialState([knowledgeItem("knowledge-1", "assistant-1", "EXTERNAL_MANAGEMENT")]),
      { failCatalogEventDelete: true },
    );

    await expect(
      deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-1", "knowledge-1"),
    ).rejects.toThrow("SYNC_EVENT_DELETE_FAILED");
    expect(memory.state().items.has("knowledge-1")).toBe(true);
    expect(memory.state().catalogProducts).toEqual(new Set(["tenant-1", "tenant-2"]));
    expect(memory.state().catalogSyncEvents).toEqual(new Set(["tenant-1", "tenant-2"]));
  });
});
