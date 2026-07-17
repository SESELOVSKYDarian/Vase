import { describe, expect, it, vi } from "vitest";
import { generateMetaWebhookVerifyToken } from "../apps/vase-labs/app/lib/meta-webhook";
import {
  buildManualChannelSetup,
  createManualChannelSetupService,
  type ManualChannelRecord,
} from "../apps/vase-labs/app/lib/channel-manual-setup";
import { createChannelSetupPostHandler } from "../apps/vase-labs/app/api/labs/channels/setup/route";
import { createChannelVerifyPostHandler } from "../apps/vase-labs/app/api/labs/channels/verify/route";
import {
  verifyMetaChannelWebhookSubscription,
  type ChannelWebhookContext,
  type ChannelWebhookRepository,
} from "../apps/vase-labs/app/lib/channel-webhook-service";

const entitlement = {
  enabledChannels: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const,
  channelLimits: { WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 1 },
};

function request(path: string, body: unknown, cookie = "labs_session=valid") {
  return new Request(`https://labs.vase.ar${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
}

function context() {
  return {
    context: {
      globalTenantId: "tenant_global_1",
      tenantSlug: "acme team",
      entitlement,
    },
    assistant: { id: "assistant_1" },
  };
}

describe("manual channel setup", () => {
  it("builds a normalized, tenant-specific URL and server-derived key", () => {
    expect(buildManualChannelSetup({
      origin: "https://labs.vase.ar/",
      tenantSlug: "acme team/central",
      globalTenantId: "Tenant_Global_1",
      channelType: "INSTAGRAM",
    })).toEqual({
      webhookUrl: "https://labs.vase.ar/api/v1/channels/instagram/acme%20team%2Fcentral/webhook",
      webhookKey: generateMetaWebhookVerifyToken("Tenant_Global_1"),
    });
  });

  it("creates once and reuses the pending channel on retry without consuming extra capacity", async () => {
    const channels: ManualChannelRecord[] = [];
    const service = createManualChannelSetupService({
      list: async () => channels,
      create: async (input) => {
        const channel = { id: "channel_1", type: input.channelType, provider: "META_OFFICIAL", status: "PENDING", webhookUrl: input.webhookUrl };
        channels.push(channel);
        return channel;
      },
      findByIdForAssistant: async () => null,
    });
    const input = { ...context(), origin: "https://labs.vase.ar", channelType: "WHATSAPP" as const };

    const first = await service.setup(input);
    const retry = await service.setup(input);

    expect(first).toEqual(retry);
    expect(channels).toHaveLength(1);
  });

  it("does not overwrite a connected channel and enforces capacity", async () => {
    const service = createManualChannelSetupService({
      list: async () => [{ id: "real", type: "FACEBOOK", provider: "META_OFFICIAL", status: "CONNECTED", webhookUrl: "https://real" }],
      create: vi.fn(),
      findByIdForAssistant: async () => null,
    });

    await expect(service.setup({ ...context(), origin: "https://labs.vase.ar", channelType: "FACEBOOK" })).rejects.toThrow("CHANNEL_LIMIT_REACHED");
  });

  it("reuses an existing pending channel even when the public origin changes", async () => {
    const create = vi.fn();
    const service = createManualChannelSetupService({
      list: async () => [{ id: "pending", type: "WHATSAPP", provider: "META_OFFICIAL", status: "PENDING", webhookUrl: "https://old.example/hook" }],
      create,
      findByIdForAssistant: async () => null,
    });
    const result = await service.setup({ ...context(), origin: "https://labs.vase.ar", channelType: "WHATSAPP" });
    expect(result.channelId).toBe("pending");
    expect(result.webhookUrl).toBe("https://labs.vase.ar/api/v1/channels/whatsapp/acme%20team/webhook");
    expect(create).not.toHaveBeenCalled();
  });

  it("setup route trusts only resolved tenant fields and returns the redacted contract", async () => {
    const setup = vi.fn().mockResolvedValue({ channelId: "channel_1", webhookUrl: "https://hook", webhookKey: "server-key" });
    const handler = createChannelSetupPostHandler({ resolveContext: async () => context(), setup });
    const response = await handler(request("/api/labs/channels/setup", {
      channelType: "WHATSAPP", assistantId: "evil", globalTenantId: "evil", tenantSlug: "evil", webhookKey: "evil",
    }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ channelId: "channel_1", webhookUrl: "https://hook", webhookKey: "server-key" });
    expect(setup).toHaveBeenCalledWith(expect.objectContaining({
      assistant: { id: "assistant_1" },
      context: expect.objectContaining({ globalTenantId: "tenant_global_1", tenantSlug: "acme team" }),
    }));
  });

  it("uses exact auth mappings and sanitizes setup internals", async () => {
    for (const [error, status] of [["LABS_SESSION_REQUIRED", 401], ["LABS_TENANT_FORBIDDEN", 403], ["db password leaked", 500]] as const) {
      const handler = createChannelSetupPostHandler({ resolveContext: async () => { throw new Error(error); }, setup: vi.fn() });
      const response = await handler(request("/api/labs/channels/setup", { channelType: "WHATSAPP" }));
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: status === 500 ? "CHANNEL_SETUP_FAILED" : error });
    }
  });

  it("verifies only channels under the resolved assistant", async () => {
    const service = createManualChannelSetupService({
      list: async () => [], create: vi.fn(),
      findByIdForAssistant: async (assistantId, channelId) => assistantId === "assistant_1" && channelId === "own"
        ? { id: "own", status: "CONNECTED", lastError: null }
        : null,
    });
    await expect(service.verify("assistant_1", "other-tenant")).rejects.toThrow("CHANNEL_NOT_FOUND");
    expect(await service.verify("assistant_1", "own")).toEqual({ status: "CONNECTED" });
  });

  it("returns CONNECTED, PENDING and sanitized ERROR verification states", async () => {
    for (const [record, expected] of [
      [{ id: "c", status: "CONNECTED", lastError: null }, { status: "CONNECTED" }],
      [{ id: "c", status: "PENDING", lastError: null }, { status: "PENDING", message: "Meta todavia no verifico este webhook." }],
      [{ id: "c", status: "ERROR", lastError: "secret provider detail" }, { status: "ERROR", message: "No pudimos verificar este webhook." }],
    ] as const) {
      const service = createManualChannelSetupService({ list: async () => [], create: vi.fn(), findByIdForAssistant: async () => record });
      expect(await service.verify("assistant_1", "c")).toEqual(expected);
    }
  });

  it("verify route validates body, isolates tenants, and maps auth safely", async () => {
    const verify = vi.fn().mockRejectedValue(new Error("CHANNEL_NOT_FOUND"));
    const handler = createChannelVerifyPostHandler({ resolveContext: async () => context(), verify });
    const missing = await handler(request("/api/labs/channels/verify", { channelId: "foreign" }));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "CHANNEL_NOT_FOUND" });
    expect(verify).toHaveBeenCalledWith("assistant_1", "foreign");
  });
});

describe("attributable webhook verification", () => {
  const webhookContext: ChannelWebhookContext = {
    assistantId: "assistant_1", globalTenantId: "tenant_global_1", tenantSlug: "acme",
    channelType: "INSTAGRAM", channel: { id: "channel_1", provider: "META_OFFICIAL", status: "PENDING", config: { manualWebhook: true } }, entitlement: null,
  };

  it("marks the matching pending channel connected only after a valid challenge", async () => {
    const mark = vi.fn();
    const repository: ChannelWebhookRepository = { findContextByTenantSlug: async () => webhookContext, persistInboundMessage: vi.fn(), markSubscriptionVerified: mark };
    const key = generateMetaWebhookVerifyToken("tenant_global_1");
    const result = await verifyMetaChannelWebhookSubscription({ channelType: "INSTAGRAM", repository, tenantSlug: "acme", url: `https://x?hub.mode=subscribe&hub.verify_token=${key}&hub.challenge=ok` });
    expect(result).toEqual({ status: 200, body: "ok" });
    expect(mark).toHaveBeenCalledWith(webhookContext);
  });

  it("does not mutate on an invalid challenge or mismatched channel type", async () => {
    const mark = vi.fn();
    const repository: ChannelWebhookRepository = { findContextByTenantSlug: async () => ({ ...webhookContext, channelType: "FACEBOOK" }), persistInboundMessage: vi.fn(), markSubscriptionVerified: mark };
    const result = await verifyMetaChannelWebhookSubscription({ channelType: "INSTAGRAM", repository, tenantSlug: "acme", url: "https://x?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=no" });
    expect(result.status).toBe(403);
    expect(mark).not.toHaveBeenCalled();
  });
});
