import { describe, expect, it } from "vitest";
import { createMetaGraphClient } from "../apps/vase-labs/app/lib/meta-graph";

describe("Meta Graph official channel adapter", () => {
  it("discovers Facebook Pages and linked Instagram professional accounts", async () => {
    const client = createMetaGraphClient({
      graphVersion: "v99.0",
      appId: "app_123",
      appSecret: "app-secret",
      fetcher: async (url) => {
        expect(String(url)).toContain("/v99.0/me/accounts");
        return Response.json({
          data: [{
            id: "page_123",
            name: "Norte Equipos",
            username: "norteequipos",
            access_token: "page-token",
            instagram_business_account: {
              id: "ig_123",
              name: "Norte Equipos",
              username: "norteequipos",
            },
          }],
        });
      },
    });

    await expect(
      client.discoverAssets({ channelType: "FACEBOOK", accessToken: "user-token" }),
    ).resolves.toEqual([{
      candidate: {
        id: "page_123",
        kind: "FACEBOOK_PAGE",
        name: "Norte Equipos",
        handle: "@norteequipos",
      },
      accessToken: "page-token",
    }]);

    await expect(
      client.discoverAssets({ channelType: "INSTAGRAM", accessToken: "user-token" }),
    ).resolves.toEqual([{
      candidate: {
        id: "ig_123",
        kind: "INSTAGRAM_ACCOUNT",
        name: "Norte Equipos",
        handle: "@norteequipos",
        parentId: "page_123",
      },
      accessToken: "page-token",
      parentId: "page_123",
    }]);
  });

  it("validates the token and subscribes the selected Facebook Page", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const client = createMetaGraphClient({
      graphVersion: "v99.0",
      appId: "app_123",
      appSecret: "app-secret",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), method: init?.method ?? "GET" });
        if (String(url).includes("/debug_token")) {
          return Response.json({
            data: {
              is_valid: true,
              app_id: "app_123",
              scopes: ["pages_messaging", "pages_manage_metadata"],
            },
          });
        }
        return Response.json({ success: true });
      },
    });

    const result = await client.verifyAndSubscribe({
      channelType: "FACEBOOK",
      userAccessToken: "user-token",
      asset: {
        candidate: {
          id: "page_123",
          kind: "FACEBOOK_PAGE",
          name: "Norte Equipos",
          handle: "@norteequipos",
        },
        accessToken: "page-token",
      },
    });

    expect(result).toMatchObject({
      providerAccountId: "page_123",
      accessToken: "page-token",
    });
    expect(calls.some((call) => call.url.includes("/page_123/subscribed_apps") && call.method === "POST")).toBe(true);
  });

  it("tests token health without sending an unsolicited message", async () => {
    const client = createMetaGraphClient({
      graphVersion: "v99.0",
      appId: "app_123",
      appSecret: "app-secret",
      fetcher: async (url, init) => {
        expect(String(url)).toContain("/debug_token");
        expect(init?.method).toBeUndefined();
        return Response.json({
          data: {
            is_valid: true,
            app_id: "app_123",
            scopes: ["pages_messaging", "pages_manage_metadata"],
          },
        });
      },
    });

    await expect(
      client.testConnection({
        channelType: "FACEBOOK",
        accessToken: "page-token",
      }),
    ).resolves.toEqual({ ok: true });
  });
});
