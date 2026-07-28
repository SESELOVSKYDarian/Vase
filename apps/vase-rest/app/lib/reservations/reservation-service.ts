import { z } from "zod";

const createSchema = z.object({
  globalTenantId: z.string().min(1), branchId: z.string().min(1),
  guestName: z.string().trim().min(2).max(120),
  guestPhone: z.string().trim().min(6).max(30).optional(),
  partySize: z.number().int().positive().max(200),
  startsAt: z.iso.datetime(), endsAt: z.iso.datetime(),
  tableIds: z.array(z.string().min(1)).min(1),
  notes: z.string().max(1000).optional(), actorId: z.string().min(1),
}).strict();
export interface ReservationRepository {
  getTables(globalTenantId: string, branchId: string, tableIds: string[]): Promise<Array<{ id: string; capacity: number }>>;
  hasOverlap(input: {
    globalTenantId: string; branchId: string; tableIds: string[];
    startsAt: Date; endsAt: Date; excludeReservationId?: string;
  }): Promise<boolean>;
  create(input: z.infer<typeof createSchema> & { startsAt: string; endsAt: string }): Promise<unknown>;
  cancel(input: {
    globalTenantId: string; branchId: string; reservationId: string;
    expectedRevision: number; actorId: string; reason?: string;
  }): Promise<unknown>;
}

export function createReservationService(repository: ReservationRepository) {
  return {
    async create(raw: unknown) {
      const input = createSchema.parse(raw);
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(input.endsAt);
      if (endsAt <= startsAt) throw new Error("REST_RESERVATION_TIME_INVALID");
      const tableIds = [...new Set(input.tableIds)];
      const tables = await repository.getTables(input.globalTenantId, input.branchId, tableIds);
      if (tables.length !== tableIds.length) throw new Error("REST_RESERVATION_TABLE_NOT_FOUND");
      if (tables.reduce((sum, table) => sum + table.capacity, 0) < input.partySize) {
        throw new Error("REST_RESERVATION_CAPACITY_INSUFFICIENT");
      }
      if (await repository.hasOverlap({
        globalTenantId: input.globalTenantId, branchId: input.branchId,
        tableIds, startsAt, endsAt,
      })) throw new Error("REST_RESERVATION_OVERLAP");
      return repository.create({ ...input, tableIds });
    },
    cancel(raw: unknown) {
      return repository.cancel(z.object({
        globalTenantId: z.string().min(1), branchId: z.string().min(1),
        reservationId: z.string().min(1), expectedRevision: z.number().int().positive(),
        actorId: z.string().min(1), reason: z.string().max(500).optional(),
      }).strict().parse(raw));
    },
  };
}
