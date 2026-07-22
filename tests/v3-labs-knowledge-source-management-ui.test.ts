// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = { refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import { KnowledgeGroups } from "../apps/vase-labs/app/app/owner/labs/chatbots/knowledge-groups";

const groups = [{
  type: "EXTERNAL_MANAGEMENT" as const,
  items: [{ id: "source/one", title: "Sistema de gestión externo", status: "READY", updatedAt: new Date("2026-07-22T18:32:00.000Z") }],
}];

function button(label: string) {
  const match = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes(label) || item.getAttribute("aria-label")?.includes(label));
  if (!match) throw new Error(`Missing button: ${label}`);
  return match as HTMLButtonElement;
}

async function click(element: Element) {
  await act(async () => { element.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}

async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("KnowledgeGroups source management", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    router.refresh.mockReset();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => { root.render(React.createElement(KnowledgeGroups, { groups })); });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it("exposes visible edit and delete actions and restores focus after Escape", async () => {
    const edit = button("Editar Sistema de gestión externo");
    expect(button("Eliminar Sistema de gestión externo").isConnected).toBe(true);

    await click(edit);

    const dialog = host.querySelector('[role="dialog"]');
    const input = host.querySelector<HTMLInputElement>("#knowledge-source-title");
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.textContent).toContain("Editar fuente");
    expect(input?.value).toBe("Sistema de gestión externo");
    expect(document.activeElement).toBe(input);

    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(edit);
  });

  it("renames through the scoped item API and refreshes after success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ item: { id: "source/one" } }));
    vi.stubGlobal("fetch", fetchMock);
    await click(button("Editar Sistema de gestión externo"));
    await type(host.querySelector<HTMLInputElement>("#knowledge-source-title")!, "Catálogo Business");

    await click(button("Guardar cambios"));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/labs/knowledge/source%2Fone");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "PATCH", headers: { "content-type": "application/json" } });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ title: "Catálogo Business" });
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it("requires an explicit destructive confirmation and warns about the Labs catalog", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await click(button("Eliminar Sistema de gestión externo"));

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("¿Eliminar esta fuente?");
    expect(dialog?.textContent).toContain("Sistema de gestión externo");
    expect(dialog?.textContent).toContain("Esta acción no se puede deshacer");
    expect(dialog?.textContent).toContain("Si es la última fuente externa");
    expect(dialog?.textContent).toContain("productos y el historial de sincronización del catálogo en Labs");
    expect(button("Cancelar").isConnected).toBe(true);

    await click(button("Cancelar"));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    await click(button("Eliminar Sistema de gestión externo"));
    await click(button("Sí, eliminar fuente"));

    expect(fetchMock).toHaveBeenCalledWith("/api/labs/knowledge/source%2Fone", { method: "DELETE" });
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    const stableList = host.querySelector(".labs-knowledge-groups");
    expect(document.activeElement).toBe(stableList);
    await act(async () => { root.render(React.createElement(KnowledgeGroups, { groups: [] })); });
    expect(host.querySelector(".labs-knowledge-groups")).toBe(stableList);
    expect(document.activeElement).toBe(stableList);
  });

  it("keeps the dialog open with sanitized feedback when a mutation fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "DATABASE_PASSWORD leaked" }, { status: 500 })));
    await click(button("Eliminar Sistema de gestión externo"));
    await click(button("Sí, eliminar fuente"));

    const alert = host.querySelector<HTMLElement>('[role="alert"]');
    expect(alert?.textContent).toContain("No pudimos eliminar la fuente");
    expect(host.textContent).not.toContain("DATABASE_PASSWORD");
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.activeElement).toBe(alert);
    await act(async () => { alert?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })); });
    expect(host.querySelector('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("returns focus to the edit error after a failed PATCH and keeps Tab scoped", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "INTERNAL_DETAIL" }, { status: 500 })));
    await click(button("Editar Sistema de gestión externo"));
    await type(host.querySelector<HTMLInputElement>("#knowledge-source-title")!, "Catálogo Business");
    await click(button("Guardar cambios"));

    const dialog = host.querySelector('[role="dialog"]');
    const alert = host.querySelector<HTMLElement>('[role="alert"]');
    expect(alert?.textContent).toContain("No pudimos guardar los cambios");
    expect(document.activeElement).toBe(alert);
    await act(async () => { alert?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })); });
    expect(dialog?.contains(document.activeElement)).toBe(true);
    expect(host.textContent).not.toContain("INTERNAL_DETAIL");
  });

  it("locks destructive dismissal while the request is pending", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));
    await click(button("Eliminar Sistema de gestión externo"));
    await click(button("Sí, eliminar fuente"));

    expect(button("Eliminando…").disabled).toBe(true);
    expect(button("Cancelar").disabled).toBe(true);
    expect(button("Cerrar").disabled).toBe(true);
    const status = host.querySelector<HTMLElement>('[role="status"]');
    expect(status?.textContent).toContain("Eliminando");
    expect(document.activeElement).toBe(status);
    await act(async () => { status?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })); });
    expect(document.activeElement).toBe(status);
    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
