import { describe, expect, it, vi } from "vitest";
import { generateMetaWebhookVerifyToken } from "../apps/vase-labs/app/lib/meta-webhook";
import {
  buildManualChannelSetup,
  createManualChannelSetupService,
  getManualChannelId,
  resolveCanonicalLabsOrigin,
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

  it("uses only a validated configured Labs origin with a fixed safe fallback", () => {
    expect(resolveCanonicalLabsOrigin("https://canonical.vase.ar/path")).toBe("https://canonical.vase.ar");
    expect(resolveCanonicalLabsOrigin("not a url")).toBe("https://labs.vase.ar");
    expect(resolveCanonicalLabsOrigin("javascript:alert(1)")).toBe("https://labs.vase.ar");
  });

  it("creates once and reuses the pending channel on retry without consuming extra capacity", async () => {
    const channels: ManualChannelRecord[] = [];
    const service = createManualChannelSetupService({
      list: async () => channels,
      create: async (input) => {
        const channel = { id: input.id, type: input.channelType, provider: "META_OFFICIAL", status: "PENDING", webhookUrl: input.webhookUrl };
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

  it("returns a stable conflict for its connected deterministic row even when plan capacity is two", async () => {
    const connectedId = getManualChannelId("assistant_1", "WHATSAPP");
    const service = createManualChannelSetupService({
      list: async () => [{ id: connectedId, type: "WHATSAPP", provider: "META_OFFICIAL", status: "CONNECTED" }],
      create: vi.fn(),
      findByIdForAssistant: async () => null,
    });
    const input = {
      ...context(), origin: "https://labs.vase.ar", channelType: "WHATSAPP" as const,
      context: { ...context().context, entitlement: { ...entitlement, channelLimits: { ...entitlement.channelLimits, WHATSAPP: 2 } } },
    };
    await expect(service.setup(input)).rejects.toThrow("CHANNEL_MANUAL_CONNECTION_EXISTS");
  });

  it("returns the same stable conflict for a connected legacy marked manual row", async () => {
    const service = createManualChannelSetupService({
      list: async () => [{ id: "legacy", type: "INSTAGRAM", provider: "META_OFFICIAL", status: "CONNECTED", config: { manualWebhook: true } }],
      create: vi.fn(), findByIdForAssistant: async () => null,
    });
    const input = {
      ...context(), origin: "https://labs.vase.ar", channelType: "INSTAGRAM" as const,
      context: { ...context().context, entitlement: { ...entitlement, channelLimits: { ...entitlement.channelLimits, INSTAGRAM: 2 } } },
    };
    await expect(service.setup(input)).rejects.toThrow("CHANNEL_MANUAL_CONNECTION_EXISTS");
  });

  it("maps an existing manual connection to a safe 409 response", async () => {
    const handler = createChannelSetupPostHandler({
      resolveContext: async () => context(),
      setup: async () => { throw new Error("CHANNEL_MANUAL_CONNECTION_EXISTS"); },
    });
    const response = await handler(request("/api/labs/channels/setup", { channelType: "WHATSAPP" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "CHANNEL_MANUAL_CONNECTION_EXISTS" });
  });

  it("reuses an existing pending channel even when the public origin changes", async () => {
    const create = vi.fn();
    const service = createManualChannelSetupService({
      list: async () => [{ id: "pending", type: "WHATSAPP", provider: "META_OFFICIAL", status: "PENDING", webhookUrl: "https://old.example/hook", config: { manualWebhook: true } }],
      create,
      findByIdForAssistant: async () => null,
      adoptPending: async (input) => ({ id: input.id, type: input.channelType, provider: "META_OFFICIAL", status: "PENDING" }),
    });
    const result = await service.setup({ ...context(), origin: "https://labs.vase.ar", channelType: "WHATSAPP" });
    expect(result.channelId).toBe(getManualChannelId("assistant_1", "WHATSAPP"));
    expect(result.webhookUrl).toBe("https://labs.vase.ar/api/v1/channels/whatsapp/acme%20team/webhook");
    expect(create).not.toHaveBeenCalled();
  });

  it("does not adopt an unrelated pending provider row as a manual channel", async () => {
    const adoptPending = vi.fn();
    const service = createManualChannelSetupService({
      list: async () => [{ id: "oauth", type: "WHATSAPP", provider: "META_OFFICIAL", status: "PENDING", webhookUrl: null }],
      create: vi.fn(),
      findByIdForAssistant: async () => null,
      adoptPending,
    });
    await expect(service.setup({ ...context(), origin: "https://labs.vase.ar", channelType: "WHATSAPP" })).rejects.toThrow("CHANNEL_LIMIT_REACHED");
    expect(adoptPending).not.toHaveBeenCalled();
  });

  it("setup route accepts exactly channelType and returns the redacted contract", async () => {
    const setup = vi.fn().mockResolvedValue({ channelId: "channel_1", webhookUrl: "https://hook", webhookKey: "server-key" });
    const handler = createChannelSetupPostHandler({ resolveContext: async () => context(), setup });
    const response = await handler(request("/api/labs/channels/setup", { channelType: "WHATSAPP" }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ channelId: "channel_1", webhookUrl: "https://hook", webhookKey: "server-key" });
    expect(setup).toHaveBeenCalledWith(expect.objectContaining({
      assistant: { id: "assistant_1" },
      context: expect.objectContaining({ globalTenantId: "tenant_global_1", tenantSlug: "acme team" }),
    }));
  });

  it("ignores a hostile request host and uses the configured canonical origin", async () => {
    const setup = vi.fn().mockResolvedValue({ channelId: "channel_1", webhookUrl: "https://canonical.vase.ar/hook", webhookKey: "key" });
    const handler = createChannelSetupPostHandler({
      resolveContext: async () => context(), setup,
      resolvePublicOrigin: () => "https://canonical.vase.ar",
    });
    await handler(new Request("https://attacker.example/api/labs/channels/setup", {
      method: "POST", headers: { "content-type": "application/json", cookie: "labs_session=valid" }, body: JSON.stringify({ channelType: "WHATSAPP" }),
    }));
    expect(setup).toHaveBeenCalledWith(expect.objectContaining({ origin: "https://canonical.vase.ar" }));
  });

  it.each([
    null,
    [],
    { channelType: "WHATSAPP", tenantSlug: "evil" },
    { channelType: "WHATSAPP", assistantId: "evil" },
    { channelType: "WHATSAPP", webhookKey: "evil" },
    { channelType: "WHATSAPP", webhookUrl: "https://evil" },
  ])("rejects setup bodies other than exactly channelType: %j", async (body) => {
    const setup = vi.fn();
    const handler = createChannelSetupPostHandler({ resolveContext: async () => context(), setup });
    const response = await handler(request("/api/labs/channels/setup", body));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "CHANNEL_INPUT_INVALID" });
    expect(setup).not.toHaveBeenCalled();
  });

  it("denies reuse when the channel entitlement has been revoked", async () => {
    const service = createManualChannelSetupService({
      list: async () => [{ id: "pending", type: "WHATSAPP", provider: "META_OFFICIAL", status: "PENDING" }],
      create: vi.fn(),
      findByIdForAssistant: async () => null,
    });
    await expect(service.setup({
      ...context(), origin: "https://labs.vase.ar", channelType: "WHATSAPP",
      context: { ...context().context, entitlement: { enabledChannels: [] as const, channelLimits: { WHATSAPP: 0, INSTAGRAM: 1, FACEBOOK: 1 } } },
    })).rejects.toThrow("CHANNEL_NOT_INCLUDED");
  });

  it("allows retry of its own pending row when that row consumes the only slot", async () => {
    const create = vi.fn();
    const pendingId = getManualChannelId("assistant_1", "WHATSAPP");
    const service = createManualChannelSetupService({
      list: async () => [{ id: pendingId, type: "WHATSAPP", provider: "META_OFFICIAL", status: "PENDING" }],
      create,
      findByIdForAssistant: async () => null,
    });
    expect((await service.setup({ ...context(), origin: "https://labs.vase.ar", channelType: "WHATSAPP" })).channelId).toBe(pendingId);
    expect(create).not.toHaveBeenCalled();
  });

  it("denies pending reuse when another channel now consumes the only slot", async () => {
    const pendingId = getManualChannelId("assistant_1", "WHATSAPP");
    const service = createManualChannelSetupService({
      list: async () => [
        { id: pendingId, type: "WHATSAPP", provider: "META_OFFICIAL", status: "PENDING" },
        { id: "connected", type: "WHATSAPP", provider: "META_OFFICIAL", status: "CONNECTED" },
      ],
      create: vi.fn(),
      findByIdForAssistant: async () => null,
    });
    await expect(service.setup({ ...context(), origin: "https://labs.vase.ar", channelType: "WHATSAPP" })).rejects.toThrow("CHANNEL_LIMIT_REACHED");
  });

  it("does not mistake unrelated create failures for idempotency conflicts", async () => {
    const service = createManualChannelSetupService({
      list: async () => [],
      create: async () => { throw Object.assign(new Error("database unavailable"), { code: "P1001" }); },
      findByIdForAssistant: vi.fn(),
    });
    await expect(service.setup({ ...context(), origin: "https://labs.vase.ar", channelType: "WHATSAPP" })).rejects.toThrow("database unavailable");
  });

  it("concurrent setup calls converge on one deterministic manual channel", async () => {
    const records: ManualChannelRecord[] = [];
    let createCalls = 0;
    const repository = {
      list: async () => [],
      async create(input: { id: string; assistantId: string; channelType: "WHATSAPP"; webhookUrl: string }) {
        createCalls += 1;
        await Promise.resolve();
        if (records.some((record) => record.id === input.id)) throw Object.assign(new Error("unique"), { code: "P2002" });
        const record = { id: input.id, type: input.channelType, provider: "META_OFFICIAL", status: "PENDING", webhookUrl: input.webhookUrl };
        records.push(record);
        return record;
      },
      async findByIdForAssistant(_assistantId: string, channelId: string) {
        return records.find((record) => record.id === channelId) ?? null;
      },
    };
    const service = createManualChannelSetupService(repository);
    const input = { ...context(), origin: "https://labs.vase.ar", channelType: "WHATSAPP" as const };
    const [first, second] = await Promise.all([service.setup(input), service.setup(input)]);
    expect(first).toEqual(second);
    expect(records).toHaveLength(1);
    expect(createCalls).toBe(2);
  });

  it("maps a create race with an already connected deterministic row to the stable conflict", async () => {
    const connectedId = getManualChannelId("assistant_1", "WHATSAPP");
    const service = createManualChannelSetupService({
      list: async () => [],
      create: async () => { throw Object.assign(new Error("unique"), { code: "P2002" }); },
      findByIdForAssistant: async () => ({ id: connectedId, type: "WHATSAPP", provider: "META_OFFICIAL", status: "CONNECTED" }),
    });
    await expect(service.setup({ ...context(), origin: "https://labs.vase.ar", channelType: "WHATSAPP" }))
      .rejects.toThrow("CHANNEL_MANUAL_CONNECTION_EXISTS");
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

  it("does not report connected when credentials are missing", async () => {
    const service = createManualChannelSetupService({
      list: async () => [], create: vi.fn(),
      findByIdForAssistant: async () => ({ id: "c", status: "CONNECTED", lastError: null, credentialsPresent: false }),
    });
    expect(await service.verify("assistant_1", "c")).toEqual({
      status: "ERROR",
      message: "Faltan las credenciales de Meta.",
    });
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

  it("marks only the webhook as verified after a valid challenge", async () => {
    const mark = vi.fn();
    const repository: ChannelWebhookRepository = { findContextByTenantSlug: async () => webhookContext, persistInboundMessage: vi.fn(), markWebhookVerified: mark };
    const key = generateMetaWebhookVerifyToken("tenant_global_1");
    const result = await verifyMetaChannelWebhookSubscription({ channelType: "INSTAGRAM", repository, tenantSlug: "acme", url: `https://x?hub.mode=subscribe&hub.verify_token=${key}&hub.challenge=ok` });
    expect(result).toEqual({ status: 200, body: "ok" });
    expect(mark).toHaveBeenCalledWith(webhookContext);
  });

  it("does not mutate on an invalid challenge or mismatched channel type", async () => {
    const mark = vi.fn();
    const repository: ChannelWebhookRepository = { findContextByTenantSlug: async () => ({ ...webhookContext, channelType: "FACEBOOK" }), persistInboundMessage: vi.fn(), markWebhookVerified: mark };
    const result = await verifyMetaChannelWebhookSubscription({ channelType: "INSTAGRAM", repository, tenantSlug: "acme", url: "https://x?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=no" });
    expect(result.status).toBe(403);
    expect(mark).not.toHaveBeenCalled();
  });

  it("transitions exactly the deterministic manual row returned by setup", async () => {
    const manualId = getManualChannelId("assistant_1", "INSTAGRAM");
    const rows = [
      { id: "oauth_channel", type: "INSTAGRAM" as const, provider: "META_OFFICIAL", status: "PENDING", webhookUrl: "https://oauth" },
      { id: manualId, type: "INSTAGRAM" as const, provider: "META_OFFICIAL", status: "PENDING", webhookUrl: "https://manual" },
    ];
    const setupService = createManualChannelSetupService({
      list: async () => rows,
      create: vi.fn(),
      findByIdForAssistant: async (_assistantId, id) => rows.find((row) => row.id === id) ?? null,
    });
    const setupContext = context();
    const setup = await setupService.setup({
      ...setupContext,
      context: { ...setupContext.context, entitlement: { ...setupContext.context.entitlement, channelLimits: { ...setupContext.context.entitlement.channelLimits, INSTAGRAM: 2 } } },
      origin: "https://labs.vase.ar",
      channelType: "INSTAGRAM",
    });
    expect(setup.channelId).toBe(manualId);

    const repository: ChannelWebhookRepository = {
      findContextByTenantSlug: async () => ({ ...webhookContext, channel: { ...webhookContext.channel!, id: "oauth_channel" } }),
      findManualSubscriptionContext: async () => ({ ...webhookContext, channel: { ...webhookContext.channel!, id: manualId } }),
      persistInboundMessage: vi.fn(),
      markWebhookVerified: async (target) => {
        const row = rows.find((candidate) => candidate.id === target.channel?.id);
        if (row) row.status = "PENDING";
      },
    };
    const key = generateMetaWebhookVerifyToken("tenant_global_1");
    await verifyMetaChannelWebhookSubscription({ channelType: "INSTAGRAM", repository, tenantSlug: "acme", url: `https://x?hub.mode=subscribe&hub.verify_token=${key}&hub.challenge=ok` });
    expect(rows.find((row) => row.id === manualId)?.status).toBe("PENDING");
    expect(rows.find((row) => row.id === "oauth_channel")?.status).toBe("PENDING");
  });
});
