import { describe, expect, it, vi } from "vitest";
import { createInboxHandoffHandler } from "../apps/vase-labs/app/api/v1/inbox/[tenantSlug]/conversations/[conversationId]/handoff/route";
import { createInboxReactivateHandler } from "../apps/vase-labs/app/api/v1/inbox/[tenantSlug]/conversations/[conversationId]/reactivate/route";

const params = Promise.resolve({
  tenantSlug: "tenant-demo",
  conversationId: "conversation_1",
});

describe("Labs Inbox handoff controls", () => {
  it("rejects pause when the URL tenant does not match the authenticated tenant", async () => {
    const pauseConversation = vi.fn();
    const POST = createInboxHandoffHandler({
      resolveContext: async () => ({
        context: { tenantSlug: "other-tenant", globalTenantId: "tenant_global" },
      }),
      pauseConversation,
    });

    const response = await POST(new Request("https://labs.vase.ar/api/v1/inbox/tenant-demo/conversations/conversation_1/handoff", {
      method: "POST",
      body: JSON.stringify({ reason: "Intervención humana" }),
    }), { params });

    expect(response.status).toBe(403);
    expect(pauseConversation).not.toHaveBeenCalled();
  });

  it("pauses a scoped conversation and reuses its active handoff", async () => {
    const pauseConversation = vi.fn(async () => ({
      handoff: { id: "handoff_existing", status: "PENDING", reason: "Intervención humana" },
      conversation: { id: "conversation_1", status: "ESCALATED", escalatedToHuman: true },
    }));
    const POST = createInboxHandoffHandler({
      resolveContext: async () => ({
        context: { tenantSlug: "tenant-demo", globalTenantId: "tenant_global" },
      }),
      pauseConversation,
    });

    const response = await POST(new Request("https://labs.vase.ar", {
      method: "POST",
      headers: { cookie: "labs=session" },
      body: JSON.stringify({ reason: "Intervención humana" }),
    }), { params });

    expect(response.status).toBe(200);
    expect(pauseConversation).toHaveBeenCalledWith({
      conversationId: "conversation_1",
      globalTenantId: "tenant_global",
      reason: "Intervención humana",
    });
    expect(await response.json()).toMatchObject({
      handoff: { id: "handoff_existing" },
      conversation: { escalatedToHuman: true },
    });
  });

  it("reactivates only the scoped conversation and resolves all active handoffs", async () => {
    const reactivateConversation = vi.fn(async () => ({
      conversation: { id: "conversation_1", status: "OPEN", escalatedToHuman: false },
      resolvedHandoffs: 2,
    }));
    const POST = createInboxReactivateHandler({
      resolveContext: async () => ({
        context: { tenantSlug: "tenant-demo", globalTenantId: "tenant_global" },
      }),
      reactivateConversation,
    });

    const response = await POST(new Request("https://labs.vase.ar", {
      method: "POST",
      headers: { cookie: "labs=session" },
    }), { params });

    expect(response.status).toBe(200);
    expect(reactivateConversation).toHaveBeenCalledWith({
      conversationId: "conversation_1",
      globalTenantId: "tenant_global",
    });
    expect(await response.json()).toEqual({
      conversation: { id: "conversation_1", status: "OPEN", escalatedToHuman: false },
      resolvedHandoffs: 2,
    });
  });

  it("returns 404 when the scoped conversation does not exist", async () => {
    const POST = createInboxReactivateHandler({
      resolveContext: async () => ({
        context: { tenantSlug: "tenant-demo", globalTenantId: "tenant_global" },
      }),
      reactivateConversation: vi.fn(async () => null),
    });

    const response = await POST(new Request("https://labs.vase.ar", { method: "POST" }), { params });

    expect(response.status).toBe(404);
  });
});
