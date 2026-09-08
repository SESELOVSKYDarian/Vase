// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { ChannelEditModal } from "../apps/vase-labs/app/app/owner/labs/channels/channel-edit-modal";

async function click(host: HTMLElement, label: string) {
  const button = [...host.querySelectorAll("button")].find((item) => item.textContent?.includes(label));
  if (!button) throw new Error(`Missing ${label}`);
  await act(async () => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

describe("Instagram Login channel editor", () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({
        channelId: "instagram", channelType: "INSTAGRAM", status: "CONNECTED",
        webhookUrl: "https://example.test/webhook", webhookKey: "verify", providerAccountId: "ig-user",
        parentId: "optional-page", metaAppId: "instagram-app", instagramAuthMode: "INSTAGRAM_LOGIN",
        accountLabel: "Instagram", health: { webhookVerified: true, credentialsPresent: true, assetVerified: true, subscriptionActive: true },
      }))
      .mockResolvedValueOnce(Response.json({ accessToken: "IG-token", appSecret: "secret" })),
    );
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(React.createElement(ChannelEditModal, { channel: { id: "instagram", type: "INSTAGRAM", accountLabel: "Instagram" } })));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove(); vi.unstubAllGlobals();
  });

  it("shows the Instagram Login mode and hides the optional Facebook Page ID", async () => {
    await click(host, "Administrar");
    await click(host, "Acceder a configuración avanzada");
    const password = host.querySelector('input[type="password"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(password, "password");
      password.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(host, "Verificar identidad");
    expect(host.textContent).toContain("Instagram Login");
    expect(host.textContent).not.toContain("Facebook Page ID");
  });
});
