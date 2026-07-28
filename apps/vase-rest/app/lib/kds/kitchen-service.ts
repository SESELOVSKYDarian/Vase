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
    recallReason?: string;
  }): Promise<unknown>;
  setPriority(input: {
    globalTenantId: string; branchId: string; ticketId: string;
    expectedRevision: number; priority: number; actorId: string; commandId: string;
  }): Promise<unknown>;
  markServed(input: {
    globalTenantId: string; branchId: string; ticketId: string;
    expectedRevision: number; actorId: string; commandId: string;
  }): Promise<unknown>;
}
const allowed: Record<string, string[]> = {
  QUEUED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "PREPARING"],
  SERVED: ["PREPARING"],
};

export function createKitchenService(repository: KitchenRepository) {
  async function parsed(raw: unknown) {
    const input = z.object({
      globalTenantId: z.string().min(1), branchId: z.string().min(1),
      ticketId: z.string().min(1), expectedRevision: z.number().int().positive(),
      to: statusSchema, commandId: z.string().min(1), actorId: z.string().min(1),
      recallReason: z.string().trim().min(2).max(500).optional(),
    }).strict().parse(raw);
    const ticket = await repository.findTicket(
      input.globalTenantId, input.branchId, input.ticketId,
    );
    if (!ticket) throw new Error("REST_KDS_TICKET_NOT_FOUND");
    if (ticket.revision !== input.expectedRevision) throw new Error("REST_KDS_REVISION_CONFLICT");
    if (!allowed[ticket.status]?.includes(input.to)) throw new Error("REST_KDS_TRANSITION_INVALID");
    if (
      ["READY", "SERVED"].includes(ticket.status) &&
      input.to === "PREPARING" &&
      !input.recallReason
    ) throw new Error("REST_KDS_RECALL_REASON_REQUIRED");
    return { input, ticket };
  }
  return {
    async setPriority(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1), branchId: z.string().min(1),
        ticketId: z.string().min(1), expectedRevision: z.number().int().positive(),
        priority: z.number().int().min(0).max(2),
        commandId: z.string().min(1), actorId: z.string().min(1),
      }).strict().parse(raw);
      const ticket = await repository.findTicket(
        input.globalTenantId, input.branchId, input.ticketId,
      );
      if (!ticket) throw new Error("REST_KDS_TICKET_NOT_FOUND");
      if (ticket.revision !== input.expectedRevision) {
        throw new Error("REST_KDS_REVISION_CONFLICT");
      }
      return repository.setPriority(input);
    },
    async transition(raw: unknown) {
      const { input, ticket } = await parsed(raw);
      if (input.to === "SERVED") {
        return repository.markServed(input);
      }
      return repository.transition({ ...input, from: ticket.status });
    },
  };
}
