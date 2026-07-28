import { z } from "zod";

const quantitySchema = z.string().regex(/^-?\d+(?:\.\d{1,6})?$/)
  .refine((value) => Number(value) !== 0);
const movementSchema = z.object({
  globalTenantId: z.string().min(1),
  warehouseId: z.string().min(1),
  ingredientId: z.string().min(1),
  kind: z.enum(["RECEIPT", "RECIPE_CONSUMPTION", "WASTE", "CORRECTION"]),
  quantity: quantitySchema,
  commandId: z.string().min(1),
  actorId: z.string().min(1),
  referenceType: z.string().min(1).optional(),
  referenceId: z.string().min(1).optional(),
  reason: z.string().min(2).max(500).optional(),
}).strict();
const reverseSchema = z.object({
  globalTenantId: z.string().min(1),
  movementId: z.string().min(1),
  commandId: z.string().min(1),
  actorId: z.string().min(1),
  reason: z.string().min(2).max(500),
}).strict();

type MovementIdentity = {
  id: string;
  globalTenantId: string;
  reversedById: string | null;
};
export interface InventoryRepository {
  append(input: z.infer<typeof movementSchema>): Promise<unknown>;
  findMovement(globalTenantId: string, movementId: string): Promise<MovementIdentity | null>;
  reverse(input: z.infer<typeof reverseSchema> & { originalMovementId: string }): Promise<unknown>;
}

export function createInventoryService(repository: InventoryRepository) {
  return {
    async record(raw: unknown) {
      const input = movementSchema.parse(raw);
      const amount = Number(input.quantity);
      if (input.kind === "RECEIPT" && amount < 0) {
        throw new Error("REST_INVENTORY_SIGN_INVALID");
      }
      if (["RECIPE_CONSUMPTION", "WASTE"].includes(input.kind) && amount > 0) {
        throw new Error("REST_INVENTORY_SIGN_INVALID");
      }
      return repository.append(input);
    },
    async reverse(raw: unknown) {
      const input = reverseSchema.parse(raw);
      const movement = await repository.findMovement(
        input.globalTenantId,
        input.movementId,
      );
      if (!movement || movement.globalTenantId !== input.globalTenantId) {
        throw new Error("REST_INVENTORY_MOVEMENT_NOT_FOUND");
      }
      if (movement.reversedById) throw new Error("REST_INVENTORY_ALREADY_REVERSED");
      return repository.reverse({ ...input, originalMovementId: movement.id });
    },
  };
}
