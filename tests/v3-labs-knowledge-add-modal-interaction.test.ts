// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { KnowledgeAddModal } from "../apps/vase-labs/app/app/owner/labs/chatbots/knowledge-add-modal";

function button(label: string) {
  const match = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes(label));
  if (!match) throw new Error(`Missing button: ${label}`);
  return match as HTMLButtonElement;
}
async function click(element: Element) { await act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true }))); }
async function enter(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("KnowledgeAddModal URL validation", () => {
  let root: Root; let host: HTMLDivElement;
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(KnowledgeAddModal)));
    await click(button("Agregar conocimiento")); await click(button("URL"));
    await enter(host.querySelector('input:not([type="url"])')!, "Docs");
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

  it.each(["ftp://vase.ar/file", "mailto:hola@vase.ar", "javascript:alert(1)"])("blocks %s with an associated field error", async (url) => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const urlInput = host.querySelector('input[type="url"]') as HTMLInputElement;
    await enter(urlInput, url); await click(button("Agregar fuente"));
    expect(fetchMock).not.toHaveBeenCalled(); expect(urlInput.value).toBe(url);
    expect(urlInput.getAttribute("aria-invalid")).toBe("true");
    const errorId = urlInput.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy(); expect(document.getElementById(errorId!)?.textContent).toContain("http:// o https://");
  });

  it("clears the field error on edit and submits HTTPS", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 })); vi.stubGlobal("fetch", fetchMock);
    const urlInput = host.querySelector('input[type="url"]') as HTMLInputElement;
    await enter(urlInput, "ftp://vase.ar/file"); await click(button("Agregar fuente"));
    await enter(urlInput, "https://vase.ar/docs");
    expect(urlInput.getAttribute("aria-invalid")).toBe("false");
    await click(button("Agregar fuente")); expect(fetchMock).toHaveBeenCalledOnce();
  });
});
