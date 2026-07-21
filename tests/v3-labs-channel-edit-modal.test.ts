// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { ChannelEditModal } from "../apps/vase-labs/app/app/owner/labs/channels/channel-edit-modal";

async function click(label: string) {
  const target = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes(label) || item.getAttribute("aria-label")?.includes(label));
  if (!target) throw new Error(`Missing ${label}`);
  await act(async () => target.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

describe("ChannelEditModal", () => {
  let root: Root; let host: HTMLDivElement;
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      channelId: "c", channelType: "WHATSAPP", webhookUrl: "https://hook", webhookKey: "key",
      providerAccountId: "phone", parentId: "waba", accessTokenMasked: "••••", accountLabel: "Ventas",
      health: { webhookVerified: true, credentialsPresent: true, assetVerified: true, subscriptionActive: true },
    })));
    await act(async () => root.render(React.createElement(ChannelEditModal, { channel: { id: "c", type: "WHATSAPP", accountLabel: "Ventas" } })));
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

  it("shows health, webhook values and editable WhatsApp identifiers", async () => {
    await click("Editar");
    expect(host.textContent).toContain("Webhook verificado");
    await click("Configuración avanzada");
    expect(host.textContent).toContain("Phone Number ID");
    expect(host.textContent).toContain("WABA ID");
    expect(host.textContent).toContain("https://hook");
  });

  it("animates successful copy and exposes an accessible toast", async () => {
    await click("Editar"); await click("Copiar Webhook URL");
    expect(host.querySelector('[role="status"]')?.textContent).toContain("Copiado correctamente");
    expect(host.querySelector(".is-copied")).not.toBeNull();
  });

  it("persists edited identifiers using the stored server-side token", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        channelId: "c", channelType: "WHATSAPP", webhookUrl: "https://hook", webhookKey: "key",
        providerAccountId: "phone", parentId: "waba", accessTokenMasked: "••••", accountLabel: "Ventas",
        health: { webhookVerified:true, credentialsPresent:true, assetVerified:true, subscriptionActive:true },
      }))
      .mockResolvedValueOnce(Response.json({ status:"CONNECTED" }))
      .mockResolvedValueOnce(Response.json({
        channelId: "c", channelType: "WHATSAPP", webhookUrl: "https://hook", webhookKey: "key",
        providerAccountId: "phone-new", parentId: "waba-new", accessTokenMasked: "••••", accountLabel: "Ventas",
        health: { webhookVerified:true, credentialsPresent:true, assetVerified:true, subscriptionActive:true },
      }));
    vi.stubGlobal("fetch", fetchMock);
    await click("Editar"); await click("Configuración avanzada");
    const inputs = [...host.querySelectorAll("input")];
    for (const [input, value] of [[inputs[0],"phone-new"],[inputs[1],"waba-new"]] as const) {
      await act(async () => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set; setter?.call(input,value); input?.dispatchEvent(new Event("input",{bubbles:true})); });
    }
    await click("Comprobar conexión");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/labs/channels/c/connect");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ channelType:"WHATSAPP", providerAccountId:"phone-new", parentId:"waba-new" });
  });

  it("checks an already configured channel without resubscribing when advanced fields are unchanged", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        channelId: "c", channelType: "WHATSAPP", webhookUrl: "https://hook", webhookKey: "key",
        providerAccountId: "phone", parentId: "waba", accessTokenMasked: "••••", accountLabel: "Ventas",
        health: { webhookVerified:true, credentialsPresent:true, assetVerified:true, subscriptionActive:true },
      }))
      .mockResolvedValueOnce(Response.json({ ok:true, status:"CONNECTED" }))
      .mockResolvedValueOnce(Response.json({
        channelId: "c", channelType: "WHATSAPP", webhookUrl: "https://hook", webhookKey: "key",
        providerAccountId: "phone", parentId: "waba", accessTokenMasked: "••••", accountLabel: "Ventas",
        health: { webhookVerified:true, credentialsPresent:true, assetVerified:true, subscriptionActive:true },
      }));
    vi.stubGlobal("fetch", fetchMock);

    await click("Editar"); await click("Configuración avanzada");
    await click("Comprobar conexión");

    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/channels/c/test");
  });

  it("does not blame Meta asset assignment for internal connection failures", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        channelId: "c", channelType: "WHATSAPP", webhookUrl: "https://hook", webhookKey: "key",
        providerAccountId: "phone", parentId: "waba", accessTokenMasked: "••••", accountLabel: "Ventas",
        health: { webhookVerified:true, credentialsPresent:true, assetVerified:true, subscriptionActive:true },
      }))
      .mockResolvedValueOnce(Response.json({ error:"CHANNEL_CONNECTION_FAILED" }, { status:500 }));
    vi.stubGlobal("fetch", fetchMock);

    await click("Editar"); await click("Configuración avanzada");
    const input = host.querySelector("input")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      setter?.call(input,"phone-new");
      input.dispatchEvent(new Event("input",{bubbles:true}));
    });
    await click("Comprobar conexión");

    expect(host.textContent).toContain("Vase no pudo validar el canal con las credenciales cargadas");
    expect(host.textContent).not.toContain("Meta rechazó el acceso al activo");
  });

  it("explains when Labs cannot encrypt the channel token", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        channelId: "c", channelType: "WHATSAPP", webhookUrl: "https://hook", webhookKey: "key",
        providerAccountId: "phone", parentId: "waba", accessTokenMasked: "••••", accountLabel: "Ventas",
        health: { webhookVerified:true, credentialsPresent:true, assetVerified:true, subscriptionActive:true },
      }))
      .mockResolvedValueOnce(Response.json({ error:"TOKEN_ENCRYPTION_SECRET_MISSING" }, { status:400 }));
    vi.stubGlobal("fetch", fetchMock);

    await click("Editar"); await click("Configuración avanzada");
    const input = host.querySelector("input")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      setter?.call(input,"phone-new");
      input.dispatchEvent(new Event("input",{bubbles:true}));
    });
    await click("Comprobar conexión");

    expect(host.textContent).toContain("Falta configurar el secreto interno de cifrado de Labs");
  });
});
