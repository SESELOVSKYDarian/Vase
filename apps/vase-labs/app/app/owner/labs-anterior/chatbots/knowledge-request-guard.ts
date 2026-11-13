export type KnowledgeRequestTicket = {
  scope: string;
  generation: number;
  controller: AbortController;
  signal: AbortSignal;
};

export function createKnowledgeRequestGuard() {
  let generation = 0;
  const active = new Map<string, KnowledgeRequestTicket>();

  return {
    isActive(scope: string) {
      return active.has(scope);
    },
    start(scope: string): KnowledgeRequestTicket | null {
      if (active.has(scope)) return null;
      const controller = new AbortController();
      const ticket = { scope, generation, controller, signal: controller.signal };
      active.set(scope, ticket);
      return ticket;
    },
    isCurrent(ticket: KnowledgeRequestTicket) {
      return ticket.generation === generation && active.get(ticket.scope) === ticket && !ticket.signal.aborted;
    },
    finish(ticket: KnowledgeRequestTicket) {
      if (active.get(ticket.scope) === ticket) active.delete(ticket.scope);
    },
    invalidate() {
      generation += 1;
      for (const ticket of active.values()) ticket.controller.abort();
      active.clear();
    },
  };
}
