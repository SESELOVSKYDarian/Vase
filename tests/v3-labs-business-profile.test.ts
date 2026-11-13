import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearBusinessProfileCache,
  fetchBusinessProfile,
  formatBusinessProfileContext,
} from "../apps/vase-labs/app/lib/business-profile";
import { createAiOrchestrator } from "../apps/vase-labs/app/lib/ai-orchestrator";

const env = { APP_INTERNAL_URL: "http://app-vase:3002/x", SERVICE_TO_SERVICE_TOKEN: "secret" } as unknown as NodeJS.ProcessEnv;

describe("Labs lee Mi negocio", () => {
  beforeEach(() => clearBusinessProfileCache());

  it("pide el perfil a app.vase.ar con el token interno y lo guarda un minuto", async () => {
    const fetcher = vi.fn(async () => Response.json({ profile: { name: "Piquim", hours: "Lun a vie 8 a 17" } }));
    let now = 1_000;
    const first = await fetchBusinessProfile("t/1", { fetcher: fetcher as typeof fetch, env, now: () => now });
    expect(first?.name).toBe("Piquim");
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("http://app-vase:3002/api/internal/business/business-profile?globalTenantId=t%2F1");
    expect(init.headers).toEqual({ authorization: "Bearer secret" });

    now += 30_000;
    await fetchBusinessProfile("t/1", { fetcher: fetcher as typeof fetch, env, now: () => now });
    expect(fetcher).toHaveBeenCalledTimes(1);
    now += 31_000;
    await fetchBusinessProfile("t/1", { fetcher: fetcher as typeof fetch, env, now: () => now });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("no rompe si falta configuración o app.vase.ar falla", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("down");
    });
    expect(await fetchBusinessProfile("t1", { fetcher: fetcher as typeof fetch, env: {} as NodeJS.ProcessEnv })).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(await fetchBusinessProfile("t1", { fetcher: fetcher as typeof fetch, env })).toBeNull();
  });

  it("arma el texto con contacto, redes y sucursales, y nada si está vacío", () => {
    expect(formatBusinessProfileContext(null)).toBe("");
    expect(formatBusinessProfileContext({ name: " ", branches: [] })).toBe("");
    const text = formatBusinessProfileContext({
      name: "Piquim",
      hours: "Lun a vie 8 a 17",
      whatsapp: "+54 9 11 5555-1234",
      socialLinks: [{ network: "instagram", url: "https://instagram.com/piquim.ar" }],
      branches: [{ name: "Villa Crespo", address: "Av. Corrientes 5000", hours: "8 a 17", isMain: true }],
      fiscal: { legalName: "Piquim SRL" },
    });
    expect(text).toContain("- Nombre: Piquim");
    expect(text).toContain("- Horarios: Lun a vie 8 a 17");
    expect(text).toContain("- Redes: instagram https://instagram.com/piquim.ar");
    expect(text).toContain("  - Villa Crespo (principal): Av. Corrientes 5000, horario 8 a 17");
    expect(text).toContain("- Razon social: Piquim SRL");
  });

  it("el asistente recibe los datos del negocio en su contexto", async () => {
    const generateReply = vi.fn(async () => ({ text: "Hola", imageUrls: [], orderAction: { type: "NONE" as const }, inputTokens: 1, outputTokens: 1 }));
    const orchestrator = createAiOrchestrator({
      knowledge: { buildContext: async () => "Conocimiento" },
      businessProfile: { buildContext: async () => "Datos del negocio: Piquim" },
      generateReply,
      persistAssistantReply: async () => ({ messageId: "m1" }),
      registerTokenUsage: async () => ({}) as never,
      sendReply: async () => ({ ok: true }),
    } as unknown as Parameters<typeof createAiOrchestrator>[0]);
    await orchestrator.processConversation({
      assistantId: "a1",
      conversationId: "c1",
      globalTenantId: "t1",
      channel: "WHATSAPP",
      latestUserText: "¿A qué hora abren?",
      canRunAi: true,
      handoffActive: false,
    });
    const call = generateReply.mock.calls[0] as unknown as [{ context: string }];
    expect(call[0].context).toBe("Datos del negocio: Piquim\n\nConocimiento");
  });
});

describe("Labs edita Mi negocio", () => {
  it("manda el cambio a app.vase.ar con el token, la cuenta y quién lo pide, y olvida lo guardado", async () => {
    const { changeBusinessProfile } = await import("../apps/vase-labs/app/lib/business-profile");
    let calls = 0;
    const reader = vi.fn(async () => Response.json({ profile: { name: `v${++calls}` } }));
    await fetchBusinessProfile("t1", { fetcher: reader as typeof fetch, env });
    const writer = vi.fn(async () => Response.json({ ok: true, message: "Sucursal guardada." }));
    const result = await changeBusinessProfile(
      "t1",
      "u1",
      { action: "saveBranch", data: { name: "Centro", address: "Florida 300", phone: "", hours: "", isMain: false } },
      { fetcher: writer as typeof fetch, env },
    );
    expect(result).toEqual({ ok: true, message: "Sucursal guardada.", status: 200 });
    const [url, init] = writer.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("http://app-vase:3002/api/internal/business/business-profile/manage");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ authorization: "Bearer secret", "content-type": "application/json" });
    expect(JSON.parse(String(init.body))).toMatchObject({ globalTenantId: "t1", actorUserId: "u1", action: "saveBranch" });
    const fresh = await fetchBusinessProfile("t1", { fetcher: reader as typeof fetch, env });
    expect(fresh?.name).toBe("v2");
  });

  it("devuelve el motivo cuando app no deja (por ejemplo, no es el Dueño)", async () => {
    const { changeBusinessProfile } = await import("../apps/vase-labs/app/lib/business-profile");
    const writer = vi.fn(async () => Response.json({ error: "OWNER_REQUIRED", message: "Solo el Dueño puede cambiar Mi negocio." }, { status: 403 }));
    const result = await changeBusinessProfile("t1", "u2", { action: "deleteBranch", data: { id: "b1" } }, { fetcher: writer as typeof fetch, env });
    expect(result).toEqual({ ok: false, message: "Solo el Dueño puede cambiar Mi negocio.", status: 403 });
    expect(await changeBusinessProfile("t1", "u2", { action: "deleteBranch", data: { id: "b1" } }, { fetcher: writer as typeof fetch, env: {} as NodeJS.ProcessEnv })).toMatchObject({ ok: false, status: 503 });
  });
});
