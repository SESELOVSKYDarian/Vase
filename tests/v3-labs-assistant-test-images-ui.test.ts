// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantTestPanel } from "../apps/vase-labs/app/app/owner/labs/chatbots/assistant-test-panel";

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

async function enterMessage(host: HTMLElement, value: string) {
  const textarea = host.querySelector("textarea");
  if (!textarea) throw new Error("Missing assistant test textarea");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submit(host: HTMLElement) {
  const form = host.querySelector("form");
  if (!form) throw new Error("Missing assistant test form");
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

describe("AssistantTestPanel catalog images", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root.render(React.createElement(AssistantTestPanel, { configured: true, hasKnowledge: true }));
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it("renders validated catalog image URLs in a gallery below the reply", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      reply: "Te muestro el producto.",
      imageUrls: [
        "https://cdn.vase.ar/p1.jpg",
        "https://cdn.vase.ar/p2.jpg",
      ],
      model: "gpt-5.6-terra",
      usage: { inputTokens: 10, outputTokens: 6 },
    })));

    await enterMessage(host, "Mostrame el producto");
    await submit(host);

    const message = host.querySelector(".labs-assistant-message");
    const gallery = message?.querySelector(".labs-assistant-message-images");
    const images = [...(gallery?.querySelectorAll("img") ?? [])];
    expect(message?.querySelector("p")?.textContent).toBe("Te muestro el producto.");
    expect(images.map((image) => image.getAttribute("src"))).toEqual([
      "https://cdn.vase.ar/p1.jpg",
      "https://cdn.vase.ar/p2.jpg",
    ]);
    expect(images.map((image) => image.getAttribute("alt"))).toEqual([
      "Imagen de producto 1",
      "Imagen de producto 2",
    ]);
    expect(message?.querySelector("p")?.compareDocumentPosition(gallery!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("clears previous images when a new submit starts and keeps them cleared on error", async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        reply: "Primera respuesta.",
        imageUrls: ["https://cdn.vase.ar/p1.jpg"],
        model: "gpt-5.6-terra",
        usage: { inputTokens: 4, outputTokens: 3 },
      }))
      .mockImplementationOnce(() => pending.promise);
    vi.stubGlobal("fetch", fetchMock);

    await enterMessage(host, "Primera consulta");
    await submit(host);
    expect(host.querySelectorAll(".labs-assistant-message-images img")).toHaveLength(1);

    await enterMessage(host, "Segunda consulta");
    await submit(host);
    expect(host.querySelector(".labs-assistant-message-images")).toBeNull();

    pending.resolve(Response.json({ error: "ASSISTANT_TEST_FAILED" }, { status: 502 }));
    await act(async () => { await pending.promise; });
    expect(host.querySelector(".labs-assistant-message-images")).toBeNull();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  });
});
