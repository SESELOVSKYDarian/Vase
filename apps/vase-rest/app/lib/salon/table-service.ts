import { z } from "zod";

const tableStatusSchema = z.enum(["AVAILABLE", "RESERVED", "OCCUPIED", "DIRTY", "CLEANING", "DISABLED"]);
type TableStatus = z.infer<typeof tableStatusSchema>;
type TableRecord = {
  id: string;
  globalTenantId: string;
  branchId: string;
  status: TableStatus | string;
  revision: number;
  capacity: number;
  mergedIntoId: string | null;
};
export interface TableRepository {
  find(globalTenantId: string, branchId: string, tableId: string): Promise<TableRecord | null>;
  create(input: {
    globalTenantId: string; branchId: string; floorId: string; zoneId?: string;
    code: string; name: string; capacity: number; x: number; y: number;
    width: number; height: number;
  }): Promise<unknown>;
  transition(input: {
    globalTenantId: string; branchId: string; tableId: string;
    expectedRevision: number; from: string; to: TableStatus; actorId: string;
  }): Promise<unknown>;
  merge(input: {
    globalTenantId: string; branchId: string; tableIds: string[];
    capacity: number; actorId: string;
  }): Promise<unknown>;
  split(input: {
    globalTenantId: string; branchId: string; anchorTableId: string; actorId: string;
  }): Promise<unknown>;
}

const allowed: Record<string, TableStatus[]> = {
  AVAILABLE: ["RESERVED", "OCCUPIED", "DISABLED"],
  RESERVED: ["OCCUPIED", "AVAILABLE"],
  OCCUPIED: ["DIRTY"],
  DIRTY: ["CLEANING"],
  CLEANING: ["AVAILABLE"],
  DISABLED: ["AVAILABLE"],
};

export function createTableService(repository: TableRepository) {
  return {
    create(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1), branchId: z.string().min(1),
        floorId: z.string().min(1), zoneId: z.string().min(1).optional(),
        code: z.string().trim().min(1).max(20).transform((v) => v.toUpperCase()),
        name: z.string().trim().min(1).max(80), capacity: z.number().int().positive().max(100),
        x: z.number().finite(), y: z.number().finite(),
        width: z.number().positive(), height: z.number().positive(),
      }).strict().parse(raw);
      return repository.create(input);
    },
    async transition(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1), branchId: z.string().min(1),
        tableId: z.string().min(1), expectedRevision: z.number().int().positive(),
        to: tableStatusSchema, actorId: z.string().min(1),
      }).strict().parse(raw);
      const table = await repository.find(input.globalTenantId, input.branchId, input.tableId);
      if (!table || table.globalTenantId !== input.globalTenantId || table.branchId !== input.branchId) {
        throw new Error("REST_TABLE_NOT_FOUND");
      }
      if (table.revision !== input.expectedRevision) throw new Error("REST_TABLE_REVISION_CONFLICT");
      if (!allowed[table.status]?.includes(input.to)) throw new Error("REST_TABLE_TRANSITION_INVALID");
      return repository.transition({ ...input, from: table.status });
    },
    async merge(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1), branchId: z.string().min(1),
        tableIds: z.array(z.string().min(1)).min(2), actorId: z.string().min(1),
      }).strict().parse(raw);
      const ids = [...new Set(input.tableIds)];
      if (ids.length < 2) throw new Error("REST_TABLE_MERGE_INVALID");
      const tables = await Promise.all(ids.map((id) =>
        repository.find(input.globalTenantId, input.branchId, id)));
      if (tables.some((table) => !table || table.status !== "AVAILABLE" || table.mergedIntoId)) {
        throw new Error("REST_TABLE_MERGE_UNAVAILABLE");
      }
      return repository.merge({
        ...input, tableIds: ids,
        capacity: tables.reduce((sum, table) => sum + table!.capacity, 0),
      });
    },
    async split(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1), branchId: z.string().min(1),
        anchorTableId: z.string().min(1), actorId: z.string().min(1),
      }).strict().parse(raw);
      const table = await repository.find(input.globalTenantId, input.branchId, input.anchorTableId);
      if (!table || table.status !== "AVAILABLE") throw new Error("REST_TABLE_SPLIT_UNAVAILABLE");
      return repository.split(input);
    },
  };
}
