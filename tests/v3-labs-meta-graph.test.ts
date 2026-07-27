import { describe, expect, it } from "vitest";
import { createMetaGraphClient } from "../apps/vase-labs/app/lib/meta-graph";

describe("Meta Graph official channel adapter", () => {
  it.each([[190,"META_TOKEN_INVALID"],[10,"META_PERMISSIONS_MISSING"]])("maps Meta error %s to a safe actionable code", async (code, expected) => {
    const client = createMetaGraphClient({ graphVersion:"v99.0", appId:"app", appSecret:"secret", fetcher: async () => Response.json({ error:{ code, message:"provider detail" } }, { status:400 }) });
    await expect(client.resolveManualAsset({ channelType:"WHATSAPP", accessToken:"token", providerAccountId:"phone", parentId:"waba" })).rejects.toThrow(expected);
  });
  it("maps Meta read failures during manual asset lookup to an asset assignment error", async () => {
    const client = createMetaGraphClient({
      graphVersion:"v99.0",
      appId:"app",
      appSecret:"secret",
      fetcher: async () => Response.json({ error:{ code:100, message:"Unsupported get request" } }, { status:400 }),
    });

    await expect(client.resolveManualAsset({ channelType:"WHATSAPP", accessToken:"token", providerAccountId:"phone", parentId:"waba" }))
      .rejects.toThrow("META_ASSET_NOT_AUTHORIZED");
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

  it("does not require Instagram page fields when validating a manually entered Facebook Page", async () => {
    const requestedUrls: string[] = [];
    const client = createMetaGraphClient({ graphVersion:"v99.0", appId:"app_123", appSecret:"secret", fetcher: async (url) => {
      requestedUrls.push(String(url));
      return Response.json({ id:"page_1", name:"Vase", username:"vase" });
    }});

    await expect(client.resolveManualAsset({ channelType:"FACEBOOK", accessToken:"page-token", providerAccountId:"page_1", parentId:null }))
      .resolves.toMatchObject({ candidate:{ id:"page_1", kind:"FACEBOOK_PAGE" }, accessToken:"page-token" });
    expect(requestedUrls[0]).toBe("https://graph.facebook.com/v99.0/page_1?fields=id%2Cname%2Cusername");
  });

  it("validates an Instagram Login token directly against the Instagram graph", async () => {
    const client = createMetaGraphClient({ graphVersion:"v99.0", appId:"1540258407754657", appSecret:"secret", fetcher: async (url) => {
      expect(String(url)).toBe("https://graph.instagram.com/v99.0/me?fields=user_id,username,name");
      return Response.json({ user_id:"17841428932871922", username:"elteflonsanitarios", name:"El Teflon" });
    }});

    await expect(client.resolveManualAsset({
      channelType:"INSTAGRAM",
      accessToken:"IGAA-token",
      providerAccountId:"17841428932871922",
      parentId:"61590260919409",
    })).resolves.toMatchObject({
      candidate:{ id:"17841428932871922", kind:"INSTAGRAM_ACCOUNT", handle:"@elteflonsanitarios" },
      accessToken:"IGAA-token",
    });
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

  it("subscribes a WhatsApp WABA without page subscribed_fields", async () => {
    const calls: string[] = [];
    const client = createMetaGraphClient({ graphVersion:"v99.0", appId:"app_123", appSecret:"secret", fetcher: async (url, init) => {
      calls.push(String(url));
      if (String(url).includes("/debug_token")) return Response.json({ data:{ is_valid:true, app_id:"app_123", scopes:["whatsapp_business_management","whatsapp_business_messaging"] } });
      expect(init?.method).toBe("POST"); return Response.json({ success:true });
    }});
    await client.verifyAndSubscribe({ channelType:"WHATSAPP", userAccessToken:"token", asset:{ candidate:{ id:"1244514615401381", kind:"WHATSAPP_PHONE", name:"Ventas", parentId:"956541757411319" }, parentId:"956541757411319" } });
    const subscription = calls.find((url) => url.includes("/956541757411319/subscribed_apps"));
    expect(subscription).toBe("https://graph.facebook.com/v99.0/956541757411319/subscribed_apps");
  });

  it("subscribes Instagram Login accounts through graph.instagram.com messages only", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const client = createMetaGraphClient({ graphVersion:"v99.0", appId:"1540258407754657", appSecret:"secret", fetcher: async (url, init) => {
      calls.push({ url:String(url), method:init?.method ?? "GET" });
      expect(init?.method).toBe("POST");
      return Response.json({ success:true });
    }});
    await client.verifyAndSubscribe({
      channelType:"INSTAGRAM",
      userAccessToken:"IGAA-token",
      asset:{ candidate:{ id:"17841428932871922", kind:"INSTAGRAM_ACCOUNT", name:"El Teflon", handle:"@elteflonsanitarios" }, accessToken:"IGAA-token" },
    });

    expect(calls).toEqual([{
      url:"https://graph.instagram.com/v99.0/17841428932871922/subscribed_apps?subscribed_fields=messages",
      method:"POST",
    }]);
  });

  it("maps Meta subscribed_apps failures to a subscription assignment error", async () => {
    const client = createMetaGraphClient({ graphVersion:"v99.0", appId:"app_123", appSecret:"secret", fetcher: async (url) => {
      if (String(url).includes("/debug_token")) return Response.json({ data:{ is_valid:true, app_id:"app_123", scopes:["whatsapp_business_management","whatsapp_business_messaging"] } });
      return Response.json({ error:{ code:200, message:"Requires business management" } }, { status:400 });
    }});

    await expect(client.verifyAndSubscribe({ channelType:"WHATSAPP", userAccessToken:"token", asset:{ candidate:{ id:"phone_1", kind:"WHATSAPP_PHONE", name:"Ventas", parentId:"waba_1" }, parentId:"waba_1" } }))
      .rejects.toThrow("META_SUBSCRIPTION_FAILED");
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
