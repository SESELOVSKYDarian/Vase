import { z } from "zod";

const reserveSchema = z.object({
  globalTenantId: z.string().min(1),
  branchId: z.string().min(1),
  ingredientId: z.string().min(1),
  quantity: z.string().regex(/^\d+(?:\.\d{1,6})?$/)
    .refine((value) => Number(value) > 0),
  expectedRevision: z.number().int().positive(),
  commandId: z.string().min(1),
}).strict();

type Allocation = {
  globalTenantId: string;
  branchId: string;
  warehouseId: string;
  ingredientId: string;
  available: string;
  safetyStock: string;
  revision: number;
};
export interface AllocationRepository {
  get(globalTenantId: string, branchId: string, ingredientId: string): Promise<Allocation | null>;
  reserve(input: z.infer<typeof reserveSchema> & {
    warehouseId: string;
    available: string;
  }): Promise<unknown>;
}

function micros(value: string) {
  const [whole, decimal = ""] = value.split(".");
  return BigInt(whole) * BigInt(1_000_000) +
    BigInt(decimal.padEnd(6, "0").slice(0, 6));
}

export function createAllocationService(repository: AllocationRepository) {
  return {
    async reserve(raw: unknown) {
      const input = reserveSchema.parse(raw);
      const allocation = await repository.get(
        input.globalTenantId,
        input.branchId,
        input.ingredientId,
      );
      if (
        !allocation ||
        allocation.globalTenantId !== input.globalTenantId ||
        allocation.branchId !== input.branchId
      ) {
        throw new Error("REST_ALLOCATION_NOT_FOUND");
      }
      if (allocation.revision !== input.expectedRevision) {
        throw new Error("REST_INVENTORY_REVISION_CONFLICT");
      }
      if (
        micros(allocation.available) - micros(input.quantity) <
        micros(allocation.safetyStock)
      ) {
        throw new Error("REST_OFFLINE_ALLOCATION_EXHAUSTED");
      }
      return repository.reserve({
        ...input,
        warehouseId: allocation.warehouseId,
        available: allocation.available,
      });
    },
  };
}
