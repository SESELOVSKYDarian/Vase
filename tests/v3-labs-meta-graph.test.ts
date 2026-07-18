import { describe, expect, it } from "vitest";
import { createMetaGraphClient } from "../apps/vase-labs/app/lib/meta-graph";

describe("Meta Graph official channel adapter", () => {
  it.each([[190,"META_TOKEN_INVALID"],[10,"META_PERMISSIONS_MISSING"]])("maps Meta error %s to a safe actionable code", async (code, expected) => {
    const client = createMetaGraphClient({ graphVersion:"v99.0", appId:"app", appSecret:"secret", fetcher: async () => Response.json({ error:{ code, message:"provider detail" } }, { status:400 }) });
    await expect(client.resolveManualAsset({ channelType:"WHATSAPP", accessToken:"token", providerAccountId:"phone", parentId:"waba" })).rejects.toThrow(expected);
  });
  it("validates a manually entered WhatsApp phone directly under its WABA", async () => {
    const client = createMetaGraphClient({ graphVersion:"v99.0", appId:"app_123", appSecret:"secret", fetcher: async (url) => {
      expect(String(url)).toContain("/waba_1/phone_numbers");
      return Response.json({ data:[{ id:"phone_1", display_phone_number:"+54 11", verified_name:"Ventas" }] });
    }});
    await expect(client.resolveManualAsset({ channelType:"WHATSAPP", accessToken:"token", providerAccountId:"phone_1", parentId:"waba_1" })).resolves.toMatchObject({
      candidate:{ id:"phone_1", kind:"WHATSAPP_PHONE", name:"Ventas", parentId:"waba_1" }, parentId:"waba_1",
    });
  });

  it("validates manually entered Facebook and Instagram assets directly from the Page", async () => {
    const client = createMetaGraphClient({ graphVersion:"v99.0", appId:"app_123", appSecret:"secret", fetcher: async (url) => {
      expect(String(url)).toContain("/page_1?fields=");
      return Response.json({ id:"page_1", name:"Vase", username:"vase", instagram_business_account:{ id:"ig_1", name:"Vase IG", username:"vaseig" } });
    }});
    await expect(client.resolveManualAsset({ channelType:"FACEBOOK", accessToken:"page-token", providerAccountId:"page_1", parentId:null })).resolves.toMatchObject({ candidate:{ id:"page_1", kind:"FACEBOOK_PAGE" }, accessToken:"page-token" });
    await expect(client.resolveManualAsset({ channelType:"INSTAGRAM", accessToken:"page-token", providerAccountId:"ig_1", parentId:"page_1" })).resolves.toMatchObject({ candidate:{ id:"ig_1", kind:"INSTAGRAM_ACCOUNT", parentId:"page_1" }, parentId:"page_1", accessToken:"page-token" });
  });
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
