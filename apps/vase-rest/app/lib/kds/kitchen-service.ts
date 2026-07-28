import { z } from "zod";

const statusSchema = z.enum(["QUEUED", "PREPARING", "READY", "SERVED", "CANCELLED"]);
type Ticket = {
  id: string; globalTenantId: string; branchId: string; status: string; revision: number;
};
export interface KitchenRepository {
  findTicket(globalTenantId: string, branchId: string, ticketId: string): Promise<Ticket | null>;
  transition(input: {
    globalTenantId: string; branchId: string; ticketId: string;
    expectedRevision: number; from: string; to: string; commandId: string; actorId: string;
  }): Promise<unknown>;
  markServed(input: {
    globalTenantId: string; branchId: string; ticketId: string;
    expectedRevision: number; actorId: string; commandId: string;
  }): Promise<unknown>;
}
const allowed: Record<string, string[]> = {
  QUEUED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED"],
};

export function createKitchenService(repository: KitchenRepository) {
  async function parsed(raw: unknown) {
    const input = z.object({
      globalTenantId: z.string().min(1), branchId: z.string().min(1),
      ticketId: z.string().min(1), expectedRevision: z.number().int().positive(),
      to: statusSchema, commandId: z.string().min(1), actorId: z.string().min(1),
    }).strict().parse(raw);
    const ticket = await repository.findTicket(
      input.globalTenantId, input.branchId, input.ticketId,
    );
    if (!ticket) throw new Error("REST_KDS_TICKET_NOT_FOUND");
    if (ticket.revision !== input.expectedRevision) throw new Error("REST_KDS_REVISION_CONFLICT");
    if (!allowed[ticket.status]?.includes(input.to)) throw new Error("REST_KDS_TRANSITION_INVALID");
    return { input, ticket };
  }
  return {
    async transition(raw: unknown) {
      const { input, ticket } = await parsed(raw);
      if (input.to === "SERVED") {
        return repository.markServed(input);
      }
      return repository.transition({ ...input, from: ticket.status });
    },
  };
}
