import { describe, expect, it } from "vitest";
import {
  createExternalKnowledgeItem,
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
  latestCatalogEventIds: Map<string, string>;
};

function cloneState(state: MemoryState): MemoryState {
  return {
    assistants: new Map(state.assistants),
    items: new Map([...state.items].map(([id, item]) => [id, { ...item }])),
    catalogProducts: new Set(state.catalogProducts),
    catalogSyncEvents: new Set(state.catalogSyncEvents),
    latestCatalogEventIds: new Map(state.latestCatalogEventIds),
  };
}

function knowledgeItem(
  id: string,
  assistantId: string,
  sourceType: string,
  title = id,
  status = "READY",
  updatedAt = new Date("2026-07-22T12:00:00.000Z"),
): KnowledgeItemRecord {
  return { id, assistantId, sourceType, title, content: "content", status, updatedAt };
}

function memoryRepository(initialState: MemoryState, options?: {
  failCatalogEventDelete?: boolean;
  failReservationDelete?: boolean;
}) {
  let state = cloneState(initialState);
  const lockTails = new Map<string, Promise<void>>();

  async function acquireTenantLock(globalTenantId: string) {
    const previous = lockTails.get(globalTenantId) ?? Promise.resolve();
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => gate);
    lockTails.set(globalTenantId, tail);
    await previous;
    return () => {
      release();
      if (lockTails.get(globalTenantId) === tail) lockTails.delete(globalTenantId);
    };
  }

  function operationsFor(target: () => MemoryState): KnowledgeTransactionOperations {
    return {
      async findAssistantTenant(assistantId) {
        const globalTenantId = target().assistants.get(assistantId);
        return globalTenantId ? { globalTenantId } : null;
      },
      async withTenantLock(_globalTenantId, operation) {
        return operation();
      },
      async create(data) {
        const record = {
          ...data,
          id: `created-${target().items.size + 1}`,
          updatedAt: data.updatedAt ?? new Date("2026-07-22T12:00:00.000Z"),
        };
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
      async updateStatus(assistantId, knowledgeId, expectedStatus, expectedUpdatedAt, status) {
        const item = target().items.get(knowledgeId);
        if (!item || item.assistantId !== assistantId || item.status !== expectedStatus
          || item.updatedAt.getTime() !== expectedUpdatedAt.getTime()) return 0;
        target().items.set(knowledgeId, { ...item, status });
        return 1;
      },
      async findByAssistantAndSourceType(assistantId, sourceType) {
        return [...target().items.values()].find(
          (item) => item.assistantId === assistantId && item.sourceType === sourceType,
        ) ?? null;
      },
      async refreshProcessingReservation(assistantId, knowledgeId, expectedUpdatedAt, data, updatedAt) {
        const item = target().items.get(knowledgeId);
        if (!item || item.assistantId !== assistantId || item.status !== "PROCESSING"
          || item.updatedAt.getTime() !== expectedUpdatedAt.getTime()) return 0;
        target().items.set(knowledgeId, { ...item, ...data, status: "PROCESSING", updatedAt });
        return 1;
      },
      async deleteProcessingReservation(assistantId, knowledgeId, expectedUpdatedAt) {
        const item = target().items.get(knowledgeId);
        if (!item || item.assistantId !== assistantId || item.status !== "PROCESSING"
          || item.updatedAt.getTime() !== expectedUpdatedAt.getTime()) return 0;
        if (options?.failReservationDelete) throw new Error("RESERVATION_DELETE_FAILED");
        target().items.delete(knowledgeId);
        return 1;
      },
      async deleteByAssistant(assistantId, knowledgeId) {
        const item = target().items.get(knowledgeId);
        if (!item || item.assistantId !== assistantId) throw new Error("KNOWLEDGE_SOURCE_NOT_FOUND");
        target().items.delete(knowledgeId);
        return 1;
      },
      async countByTenantAndSourceType(globalTenantId, sourceType) {
        return [...target().items.values()].filter(
          (item) => target().assistants.get(item.assistantId) === globalTenantId
            && item.sourceType === sourceType,
        ).length;
      },
      async countReadyByTenantAndSourceType(globalTenantId, sourceType) {
        return [...target().items.values()].filter(
          (item) => target().assistants.get(item.assistantId) === globalTenantId
            && item.sourceType === sourceType
            && item.status === "READY",
        ).length;
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
        target().latestCatalogEventIds.delete(globalTenantId);
      },
      async latestCatalogSyncEvent(globalTenantId) {
        const eventId = target().latestCatalogEventIds.get(globalTenantId);
        return eventId ? { eventId } : null;
      },
    };
  }

  const repository: KnowledgeMutationRepository = {
    ...operationsFor(() => state),
    async transaction(operation) {
      let draft = cloneState(state);
      let releaseLock: (() => void) | null = null;
      let tenantLocked = false;
      const transactionOperations = operationsFor(() => draft);
      const findAssistantTenant = transactionOperations.findAssistantTenant;
      transactionOperations.findAssistantTenant = (assistantId) => {
        if (!tenantLocked) throw new Error("TENANT_LOCK_REQUIRED");
        return findAssistantTenant(assistantId);
      };
      transactionOperations.withTenantLock = async (globalTenantId, lockedOperation) => {
        releaseLock = await acquireTenantLock(globalTenantId);
        draft = cloneState(state);
        tenantLocked = true;
        return lockedOperation();
      };
      try {
        const result = await operation(transactionOperations);
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
      ["assistant-3", "tenant-1"],
    ]),
    items: new Map(items.map((item) => [item.id, item])),
    catalogProducts: new Set(["tenant-1", "tenant-2"]),
    catalogSyncEvents: new Set(["tenant-1", "tenant-2"]),
    latestCatalogEventIds: new Map([
      ["tenant-1", "existing-tenant-1"],
      ["tenant-2", "existing-tenant-2"],
    ]),
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

  it("reserves an external source as processing before import and finalizes it as ready", async () => {
    const memory = memoryRepository(initialState([]));
    const observedStatuses: string[] = [];

    const created = await createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "ERP" },
      async () => {
        observedStatuses.push(...[...memory.state().items.values()].map((item) => item.status));
        memory.state().catalogSyncEvents.add("tenant-1");
        memory.state().latestCatalogEventIds.set("tenant-1", "import-event");
        return { eventId: "import-event", processed: true };
      },
    );

    expect(observedStatuses).toEqual(["PROCESSING"]);
    expect(created.status).toBe("READY");
    expect(memory.state().items.get(created.id)?.status).toBe("READY");
  });

  it("keeps a fresh processing reservation leased and rejects a second import", async () => {
    const now = new Date("2026-07-22T13:00:00.000Z");
    const reservation = knowledgeItem(
      "knowledge-processing",
      "assistant-1",
      "EXTERNAL_MANAGEMENT",
      "ERP",
      "PROCESSING",
      new Date("2026-07-22T12:59:00.000Z"),
    );
    const memory = memoryRepository(initialState([reservation]));
    let imports = 0;

    await expect(createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "Retry" },
      async () => {
        imports += 1;
        return { eventId: "retry-event", processed: true };
      },
      { now: () => now, leaseMs: 5 * 60_000 },
    )).rejects.toThrow("KNOWLEDGE_SOURCE_ALREADY_EXISTS");

    expect(imports).toBe(0);
    expect(memory.state().items.get(reservation.id)?.updatedAt).toEqual(reservation.updatedAt);
  });

  it("reclaims a stale processing reservation and reuses its durable id", async () => {
    const now = new Date("2026-07-22T13:00:00.000Z");
    const reservation = knowledgeItem(
      "knowledge-processing",
      "assistant-1",
      "EXTERNAL_MANAGEMENT",
      "Old ERP",
      "PROCESSING",
      new Date("2026-07-22T12:54:59.999Z"),
    );
    const memory = memoryRepository(initialState([reservation]));

    const result = await createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "Recovered ERP" },
      async () => {
        memory.state().catalogSyncEvents.add("tenant-1");
        memory.state().latestCatalogEventIds.set("tenant-1", "recovery-event");
        return { eventId: "recovery-event", processed: true };
      },
      { now: () => now, leaseMs: 5 * 60_000 },
    );

    expect(result).toMatchObject({
      id: "knowledge-processing",
      title: "Recovered ERP",
      status: "READY",
      updatedAt: now,
    });
    expect(memory.state().items.size).toBe(1);
  });

  it("rejects a duplicate external source before importing", async () => {
    const memory = memoryRepository(initialState([
      knowledgeItem("knowledge-1", "assistant-1", "EXTERNAL_MANAGEMENT"),
    ]));
    let imports = 0;

    await expect(createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "Second ERP" },
      async () => { imports += 1; },
    )).rejects.toThrow("KNOWLEDGE_SOURCE_ALREADY_EXISTS");

    expect(imports).toBe(0);
    expect(memory.state().items.size).toBe(1);
  });

  it("serializes concurrent reservations so only one request imports", async () => {
    const memory = memoryRepository(initialState([]));
    let imports = 0;

    const attempts = await Promise.allSettled([
      createExternalKnowledgeItem(
        memory.repository,
        "assistant-1",
        "tenant-1",
        { type: "EXTERNAL_MANAGEMENT", title: "ERP A" },
        async () => {
          imports += 1;
          memory.state().catalogSyncEvents.add("tenant-1");
          memory.state().latestCatalogEventIds.set("tenant-1", "event-a");
          return { eventId: "event-a", processed: true };
        },
      ),
      createExternalKnowledgeItem(
        memory.repository,
        "assistant-1",
        "tenant-1",
        { type: "EXTERNAL_MANAGEMENT", title: "ERP B" },
        async () => {
          imports += 1;
          memory.state().catalogSyncEvents.add("tenant-1");
          memory.state().latestCatalogEventIds.set("tenant-1", "event-b");
          return { eventId: "event-b", processed: true };
        },
      ),
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
    expect(imports).toBe(1);
    expect(memory.state().items.size).toBe(1);
  });

  it("removes only the processing reservation when import fails", async () => {
    const memory = memoryRepository(initialState([]));

    await expect(createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "ERP" },
      async () => { throw new Error("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE"); },
    )).rejects.toThrow("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");

    expect(memory.state().items.size).toBe(0);
    expect(memory.state().catalogProducts.has("tenant-1")).toBe(true);
    expect(memory.state().catalogSyncEvents.has("tenant-1")).toBe(true);
    expect(memory.state().latestCatalogEventIds.get("tenant-1")).toBe("existing-tenant-1");
  });

  it("preserves the primary upstream error when reservation discard fails", async () => {
    const memory = memoryRepository(initialState([]), { failReservationDelete: true });

    await expect(createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "ERP" },
      async () => { throw new Error("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE"); },
    )).rejects.toThrow("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");

    expect([...memory.state().items.values()][0]?.status).toBe("PROCESSING");
  });

  it("cleans catalog rows and fails if the reservation is deleted during import", async () => {
    const memory = memoryRepository(initialState([]));
    let importStarted!: () => void;
    let finishImport!: () => void;
    const started = new Promise<void>((resolve) => { importStarted = resolve; });
    const finish = new Promise<void>((resolve) => { finishImport = resolve; });

    const creating = createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "ERP" },
      async () => {
        importStarted();
        await finish;
        memory.state().catalogProducts.add("tenant-1");
        memory.state().catalogSyncEvents.add("tenant-1");
        memory.state().latestCatalogEventIds.set("tenant-1", "import-event");
        return { eventId: "import-event", processed: true };
      },
    );
    await started;
    const reservation = [...memory.state().items.values()][0];
    await deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-1", reservation.id);
    finishImport();

    await expect(creating).rejects.toThrow("KNOWLEDGE_SOURCE_RESERVATION_LOST");
    expect(memory.state().items.size).toBe(0);
    expect(memory.state().catalogProducts.has("tenant-1")).toBe(false);
    expect(memory.state().catalogSyncEvents.has("tenant-1")).toBe(false);
  });

  it("preserves catalog rows when a newer event follows a lost reservation import", async () => {
    const memory = memoryRepository(initialState([]));

    const creating = createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "ERP" },
      async () => {
        const reservation = [...memory.state().items.values()][0];
        await deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-1", reservation.id);
        memory.state().catalogProducts.add("tenant-1");
        memory.state().catalogSyncEvents.add("tenant-1");
        memory.state().latestCatalogEventIds.set("tenant-1", "newer-event");
        return { eventId: "import-event", processed: true };
      },
    );

    await expect(creating).rejects.toThrow("KNOWLEDGE_SOURCE_RESERVATION_LOST");
    expect(memory.state().catalogProducts.has("tenant-1")).toBe(true);
    expect(memory.state().catalogSyncEvents.has("tenant-1")).toBe(true);
    expect(memory.state().latestCatalogEventIds.get("tenant-1")).toBe("newer-event");
  });

  it("compensates A when B takes its stale lease and then fails", async () => {
    const memory = memoryRepository(initialState([]));
    let signalAStarted!: () => void;
    let releaseAImport!: () => void;
    let signalBStarted!: () => void;
    let releaseBFailure!: () => void;
    const aStarted = new Promise<void>((resolve) => { signalAStarted = resolve; });
    const finishAImport = new Promise<void>((resolve) => { releaseAImport = resolve; });
    const bStarted = new Promise<void>((resolve) => { signalBStarted = resolve; });
    const failBImport = new Promise<void>((resolve) => { releaseBFailure = resolve; });

    const attemptA = createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "ERP A" },
      async () => {
        signalAStarted();
        await finishAImport;
        memory.state().catalogProducts.add("tenant-1");
        memory.state().catalogSyncEvents.add("tenant-1");
        memory.state().latestCatalogEventIds.set("tenant-1", "event-a");
        return { eventId: "event-a", processed: true };
      },
      { now: () => new Date("2026-07-22T12:00:00.000Z"), leaseMs: 5 * 60_000 },
    );
    await aStarted;

    const attemptB = createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "ERP B" },
      async () => {
        signalBStarted();
        await failBImport;
        throw new Error("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");
      },
      { now: () => new Date("2026-07-22T12:06:00.000Z"), leaseMs: 5 * 60_000 },
    );
    await bStarted;

    releaseAImport();
    await expect(attemptA).rejects.toThrow("KNOWLEDGE_SOURCE_RESERVATION_LOST");
    expect(memory.state().catalogProducts.has("tenant-1")).toBe(false);
    expect(memory.state().catalogSyncEvents.has("tenant-1")).toBe(false);

    releaseBFailure();
    await expect(attemptB).rejects.toThrow("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");
    expect(memory.state().items.size).toBe(0);
    expect(memory.state().catalogProducts.has("tenant-1")).toBe(false);
    expect(memory.state().catalogSyncEvents.has("tenant-1")).toBe(false);
  });

  it("preserves an attributed catalog when another external source is ready", async () => {
    const memory = memoryRepository(initialState([
      knowledgeItem("knowledge-ready", "assistant-3", "EXTERNAL_MANAGEMENT"),
    ]));

    const creating = createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "ERP" },
      async () => {
        const reservation = [...memory.state().items.values()].find(
          (item) => item.assistantId === "assistant-1",
        );
        await deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-1", reservation!.id);
        memory.state().catalogProducts.add("tenant-1");
        memory.state().catalogSyncEvents.add("tenant-1");
        memory.state().latestCatalogEventIds.set("tenant-1", "import-event");
        return { eventId: "import-event", processed: true };
      },
    );

    await expect(creating).rejects.toThrow("KNOWLEDGE_SOURCE_RESERVATION_LOST");
    expect(memory.state().items.has("knowledge-ready")).toBe(true);
    expect(memory.state().catalogProducts.has("tenant-1")).toBe(true);
    expect(memory.state().catalogSyncEvents.has("tenant-1")).toBe(true);
  });

  it("does not finalize a taken-over generation after its idempotent event was compensated", async () => {
    const memory = memoryRepository(initialState([]));
    let signalAStarted!: () => void;
    let releaseASync!: () => void;
    let signalASynced!: () => void;
    let releaseAFinalize!: () => void;
    let signalBStarted!: () => void;
    let releaseBResult!: () => void;
    const aStarted = new Promise<void>((resolve) => { signalAStarted = resolve; });
    const syncA = new Promise<void>((resolve) => { releaseASync = resolve; });
    const aSynced = new Promise<void>((resolve) => { signalASynced = resolve; });
    const finalizeA = new Promise<void>((resolve) => { releaseAFinalize = resolve; });
    const bStarted = new Promise<void>((resolve) => { signalBStarted = resolve; });
    const finishB = new Promise<void>((resolve) => { releaseBResult = resolve; });

    const attemptA = createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "ERP A" },
      async () => {
        signalAStarted();
        await syncA;
        memory.state().catalogProducts.add("tenant-1");
        memory.state().catalogSyncEvents.add("tenant-1");
        memory.state().latestCatalogEventIds.set("tenant-1", "shared-event");
        signalASynced();
        await finalizeA;
        return { eventId: "shared-event", processed: true };
      },
      { now: () => new Date("2026-07-22T12:00:00.000Z"), leaseMs: 5 * 60_000 },
    );
    await aStarted;

    const attemptB = createExternalKnowledgeItem(
      memory.repository,
      "assistant-1",
      "tenant-1",
      { type: "EXTERNAL_MANAGEMENT", title: "ERP B" },
      async () => {
        signalBStarted();
        await aSynced;
        await finishB;
        return { eventId: "shared-event", processed: false };
      },
      { now: () => new Date("2026-07-22T12:06:00.000Z"), leaseMs: 5 * 60_000 },
    );
    await bStarted;

    releaseASync();
    await aSynced;
    releaseAFinalize();
    await expect(attemptA).rejects.toThrow("KNOWLEDGE_SOURCE_RESERVATION_LOST");
    expect(memory.state().catalogSyncEvents.has("tenant-1")).toBe(false);

    releaseBResult();
    await expect(attemptB).rejects.toThrow("KNOWLEDGE_SOURCE_RESERVATION_LOST");
    expect(memory.state().items.size).toBe(0);
    expect(memory.state().catalogProducts.has("tenant-1")).toBe(false);
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

  it("preserves catalog rows while another assistant in the tenant has an external source", async () => {
    const memory = memoryRepository(initialState([
      knowledgeItem("knowledge-1", "assistant-1", "EXTERNAL_MANAGEMENT"),
      knowledgeItem("knowledge-3", "assistant-3", "EXTERNAL_MANAGEMENT"),
    ]));

    await deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-1", "knowledge-1");

    expect(memory.state().items.has("knowledge-1")).toBe(false);
    expect(memory.state().items.has("knowledge-3")).toBe(true);
    expect(memory.state().catalogProducts).toEqual(new Set(["tenant-1", "tenant-2"]));
    expect(memory.state().catalogSyncEvents).toEqual(new Set(["tenant-1", "tenant-2"]));
  });

  it("serializes concurrent external deletions so the final deletion cleans the catalog", async () => {
    const memory = memoryRepository(initialState([
      knowledgeItem("knowledge-1", "assistant-1", "EXTERNAL_MANAGEMENT"),
      knowledgeItem("knowledge-3", "assistant-3", "EXTERNAL_MANAGEMENT"),
    ]));

    await Promise.all([
      deleteKnowledgeItem(memory.repository, "assistant-1", "tenant-1", "knowledge-1"),
      deleteKnowledgeItem(memory.repository, "assistant-3", "tenant-1", "knowledge-3"),
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
