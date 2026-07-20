// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = { refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import { ChannelConnectModal } from "../apps/vase-labs/app/app/owner/labs/channels/channel-connect-modal";

const capacity = {
  WHATSAPP: { limit: 1, used: 0, remaining: 1 },
  INSTAGRAM: { limit: 1, used: 0, remaining: 1 },
  FACEBOOK: { limit: 0, used: 0, remaining: 0 },
};

function button(label: string) {
  const match = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes(label) || item.getAttribute("aria-label")?.includes(label));
  if (!match) throw new Error(`Missing button: ${label}`);
  return match;
}

async function click(element: Element) {
  await act(async () => { element.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}

describe("ChannelConnectModal interactions", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    router.refresh.mockReset();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => { root.render(React.createElement(ChannelConnectModal, { capacity })); });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it("opens, focuses each step, posts exact setup, and shows both returned values", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ channelId: "channel_1", webhookUrl: "https://hook", webhookKey: "secret-key" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await click(button("Agregar canal"));
    expect(document.activeElement?.textContent).toContain("Elegir un canal");
    await click(button("WhatsApp"));
    await click(button("Continuar"));
    expect(document.activeElement?.textContent).toContain("Configurar WhatsApp");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/labs/channels/setup");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ channelType: "WHATSAPP" });
    expect(host.textContent).toContain("https://hook");
    expect(host.textContent).toContain("secret-key");
    await click(button("Configuración avanzada"));
    expect(host.textContent).toContain("Phone Number ID");
    expect(host.textContent).toContain("WABA ID");
    expect(host.textContent).toContain("Access Token");
  });

  it("submits the required WhatsApp account data from the add flow", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ channelId: "channel_1", webhookUrl: "https://hook", webhookKey: "key" }))
      .mockResolvedValueOnce(Response.json({ status: "PENDING" }));
    vi.stubGlobal("fetch", fetchMock);
    await click(button("Agregar canal")); await click(button("WhatsApp")); await click(button("Continuar"));
    await click(button("Configuración avanzada"));
    const inputs = [...host.querySelectorAll("input")];
    for (const [input, value] of inputs.map((input, index) => [input, ["phone_1", "waba_1", "token_1"][index]!] as const)) {
      await act(async () => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set; setter?.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
    }
    await click(button("Guardar y comprobar"));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/labs/channels/channel_1/connect");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ channelType:"WHATSAPP", accessToken:"token_1", providerAccountId:"phone_1", parentId:"waba_1" });
  });

  it("explains when Meta rejects the event subscription step", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ channelId: "channel_1", webhookUrl: "https://hook", webhookKey: "key" }))
      .mockResolvedValueOnce(Response.json({ error: "META_SUBSCRIPTION_FAILED" }, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    await click(button("Agregar canal")); await click(button("WhatsApp")); await click(button("Continuar"));
    await click(button("Configuración avanzada"));
    const inputs = [...host.querySelectorAll("input")];
    for (const [input, value] of inputs.map((input, index) => [input, ["phone_1", "waba_1", "token_1"][index]!] as const)) {
      await act(async () => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set; setter?.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
    }

    await click(button("Guardar y comprobar"));

    expect(host.textContent).toContain("Meta validó el activo, pero no pudo activar la suscripción de eventos");
  });

  it("disables only the exhausted manual type and shows one of one used", async () => {
    await act(async () => { root.render(React.createElement(ChannelConnectModal, { capacity: {
      WHATSAPP: { limit: 1, used: 1, remaining: 0 },
      INSTAGRAM: { limit: 1, used: 0, remaining: 1 },
      FACEBOOK: { limit: 1, used: 0, remaining: 1 },
    } })); });
    await click(button("Agregar canal"));
    expect((button("WhatsApp") as HTMLButtonElement).disabled).toBe(true);
    expect(button("WhatsApp").textContent).toContain("1 de 1 usados");
    expect((button("Instagram") as HTMLButtonElement).disabled).toBe(false);
    expect((button("Facebook") as HTMLButtonElement).disabled).toBe(false);
  });

  it("aborts pending setup on Back and immediately allows reselection", async () => {
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      signals.push(init?.signal as AbortSignal);
      return new Promise<Response>(() => undefined);
    });
    vi.stubGlobal("fetch", fetchMock);
    await click(button("Agregar canal"));
    await click(button("WhatsApp"));
    await click(button("Continuar"));
    await click(button("Volver"));
    expect(signals[0]?.aborted).toBe(true);
    await click(button("Instagram"));
    await click(button("Continuar"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ channelType: "INSTAGRAM" });
  });

  it("locks copy on CONNECTED, preserves success, then refreshes and closes", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ channelId: "channel_1", webhookUrl: "https://hook", webhookKey: "key" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "CONNECTED" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await click(button("Agregar canal")); await click(button("WhatsApp")); await click(button("Continuar"));
    await click(button("Comprobar conexión"));
    expect(host.textContent).toContain("Canal conectado correctamente.");
    expect((button("Copiar Webhook URL") as HTMLButtonElement).disabled).toBe(true);
    expect((button("Copiar Webhook Key") as HTMLButtonElement).disabled).toBe(true);
    expect((button("Cerrar") as HTMLButtonElement).disabled).toBe(true);
    expect((button("Volver") as HTMLButtonElement).disabled).toBe(true);
    expect(router.refresh).not.toHaveBeenCalled();
    const backdrop = host.querySelector(".labs-modal-backdrop")!;
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host.textContent).toContain("Canal conectado correctamente.");
    await act(async () => { vi.advanceTimersByTime(900); });
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it("shows pending and error feedback while retaining setup values", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ channelId: "channel_1", webhookUrl: "https://hook", webhookKey: "key" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "PENDING" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ERROR" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await click(button("Agregar canal")); await click(button("WhatsApp")); await click(button("Continuar"));
    await click(button("Comprobar conexión"));
    expect(host.querySelector(".labs-form-pending")?.textContent).toContain("Todavía no detectamos");
    await click(button("Comprobar conexión"));
    expect(host.querySelector(".labs-form-error")?.textContent).toContain("No pudimos verificar");
    expect(host.textContent).toContain("https://hook");
    expect(host.textContent).toContain("key");
  });

  it("announces clipboard rejection without losing setup values", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ channelId: "channel_1", webhookUrl: "https://hook", webhookKey: "key" }), { status: 200 })));
    await click(button("Agregar canal")); await click(button("WhatsApp")); await click(button("Continuar"));
    await click(button("Copiar Webhook URL"));
    expect(host.textContent).toContain("No pudimos copiar Webhook URL.");
    expect(host.textContent).toContain("https://hook");
  });

  it("shows a clear manual connection conflict", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "CHANNEL_MANUAL_CONNECTION_EXISTS" }, { status: 409 })));
    await click(button("Agregar canal")); await click(button("WhatsApp")); await click(button("Continuar"));
    expect(host.textContent).toContain("Este canal manual ya esta conectado.");
  });

  it("Escape and backdrop close and reset the modal", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await click(button("Agregar canal")); await click(button("WhatsApp"));
    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    await click(button("Agregar canal"));
    expect((button("Continuar") as HTMLButtonElement).disabled).toBe(true);
    const backdrop = host.querySelector(".labs-modal-backdrop")!;
    await act(async () => { backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
});
