import { describe, expect, it } from "vitest";
import { createMetaCustomerProfileResolver } from "../apps/vase-labs/app/lib/meta-customer-profile";
import { encryptChannelSecret } from "../apps/vase-labs/app/lib/channel-secrets";

describe("Meta customer profile resolver", () => {
  it("returns the Facebook Messenger name using the stored Page token", async () => {
    const resolver = createMetaCustomerProfileResolver({
      repository: {
        async findDeliveryContext() {
          return {
            channelType: "FACEBOOK",
            providerAccountId: "page_123",
            encryptedAccessToken: encryptChannelSecret("page-token", "secret"),
          };
        },
      },
      encryptionSecret: "secret",
      graphVersion: "v25.0",
      fetcher: async (url, init) => {
        expect(String(url)).toBe("https://graph.facebook.com/v25.0/psid_456?fields=first_name%2Clast_name");
        expect(init?.headers).toMatchObject({ authorization: "Bearer page-token" });
        return Response.json({ first_name: "Alexis", last_name: "Vallejos" });
      },
    });

    await expect(resolver.resolve({
      globalTenantId: "tenant_1",
      channelType: "FACEBOOK",
      userId: "psid_456",
    })).resolves.toBe("Alexis Vallejos");
  });

  it("returns the Instagram display name using the stored official credential", async () => {
    const resolver = createMetaCustomerProfileResolver({
      repository: {
        async findDeliveryContext() {
          return {
            channelType: "INSTAGRAM",
            providerAccountId: "ig_business",
            encryptedAccessToken: encryptChannelSecret("IG-token", "secret"),
          };
        },
      },
      encryptionSecret: "secret",
      graphVersion: "v25.0",
      fetcher: async (url, init) => {
        expect(String(url)).toBe("https://graph.instagram.com/v25.0/ig_user_456?fields=name%2Cusername");
        expect(init?.headers).toMatchObject({ authorization: "Bearer IG-token" });
        return Response.json({ name: "Alexis Vallejos", username: "alexis.dev" });
      },
    });

    await expect(resolver.resolve({
      globalTenantId: "tenant_1",
      channelType: "INSTAGRAM",
      userId: "ig_user_456",
    })).resolves.toBe("Alexis Vallejos");
  });

  it("uses the username and does not block processing when Graph fails", async () => {
    const base = {
      repository: {
        async findDeliveryContext() {
          return {
            channelType: "INSTAGRAM" as const,
            providerAccountId: "ig_business",
            encryptedAccessToken: encryptChannelSecret("token", "secret"),
          };
        },
      },
      encryptionSecret: "secret",
      graphVersion: "v25.0",
    };
    const usernameResolver = createMetaCustomerProfileResolver({
      ...base,
      fetcher: async () => Response.json({ username: "alexis.dev" }),
    });
    const failedResolver = createMetaCustomerProfileResolver({
      ...base,
      fetcher: async () => new Response("denied", { status: 403 }),
    });

    await expect(usernameResolver.resolve({
      globalTenantId: "tenant_1", channelType: "INSTAGRAM", userId: "ig_user",
    })).resolves.toBe("@alexis.dev");
    await expect(failedResolver.resolve({
      globalTenantId: "tenant_1", channelType: "INSTAGRAM", userId: "ig_user",
    })).resolves.toBeNull();
  });
});
