import { describe, expect, it } from "vitest";
import { decryptChannelSecret } from "../apps/vase-labs/app/lib/channel-secrets";
import {
  createMetaConnectionService,
  type MetaConnectionRepository,
} from "../apps/vase-labs/app/lib/meta-connection-service";

const encryptionSecret = "0123456789abcdef0123456789abcdef";

function createRepository(): MetaConnectionRepository & {
  attempt: Record<string, unknown> | null;
  channel: Record<string, unknown> | null;
  channelSecret: string | null;
} {
  return {
    attempt: null,
    channel: null,
    channelSecret: null,
    async createAttempt(input) {
      this.attempt = { ...input, status: "AUTHORIZING", candidates: [] };
    },
    async consumeAttemptState(input) {
      if (
        this.attempt?.stateHash !== input.stateHash ||
        this.attempt?.consumedAt
      ) {
        return null;
      }
      this.attempt = { ...this.attempt, consumedAt: new Date() };
      return this.attempt as never;
    },
    async setAttemptCandidates(input) {
      this.attempt = {
        ...this.attempt,
        status: "SELECTING_ASSET",
        encryptedUserToken: input.encryptedUserToken,
        candidates: input.candidates,
      };
    },
    async findAttempt(input) {
      if (
        this.attempt?.id !== input.attemptId ||
        this.attempt?.globalUserId !== input.globalUserId ||
        this.attempt?.globalTenantId !== input.globalTenantId
      ) {
        return null;
      }
      return this.attempt as never;
    },
    async markAttemptVerifying() {
      this.attempt = { ...this.attempt, status: "VERIFYING" };
    },
    async completeAttempt(input) {
      this.attempt = { ...this.attempt, status: "CONNECTED" };
      this.channel = input.channel;
      this.channelSecret = input.encryptedAccessToken;
      return { id: "channel_123" };
    },
    async failAttempt(input) {
      this.attempt = { ...this.attempt, status: "FAILED", errorCode: input.errorCode };
    },
  };
}

describe("official Meta connection service", () => {
  it("does not start OAuth for a channel excluded by the tenant entitlement", async () => {
    const repository = createRepository();
    const service = createMetaConnectionService({
      repository,
      encryptionSecret,
      now: () => new Date("2026-07-06T19:00:00.000Z"),
      oauth: {
        createAuthorizationUrl: () => {
          throw new Error("must not run");
        },
        verifyState: () => {
          throw new Error("unused");
        },
        exchangeCodeForAccessToken: async () => {
          throw new Error("unused");
        },
      },
      graph: {
        discoverAssets: async () => [],
        verifyAndSubscribe: async () => {
          throw new Error("unused");
        },
      },
    });

    await expect(
      service.start({
        attemptId: "attempt_123",
        globalUserId: "user_123",
        globalTenantId: "tenant_123",
        tenantSlug: "norte-equipos",
        channelType: "FACEBOOK",
        enabledChannels: ["WHATSAPP", "INSTAGRAM"],
      }),
    ).rejects.toThrow("CHANNEL_NOT_INCLUDED");
  });

  it("stores OAuth tokens encrypted and returns only redacted asset candidates", async () => {
    const repository = createRepository();
    const service = createMetaConnectionService({
      repository,
      encryptionSecret,
      now: () => new Date("2026-07-06T19:00:00.000Z"),
      oauth: {
        createAuthorizationUrl: ({ attemptId }) => ({
          authorizationUrl: "https://www.facebook.com/dialog/oauth",
          state: `signed-${attemptId}`,
          expiresAt: "2026-07-06T20:00:00.000Z",
          scopes: ["pages_show_list"],
        }),
        verifyState: () => ({
          attemptId: "attempt_123",
          globalUserId: "user_123",
          globalTenantId: "tenant_123",
          tenantSlug: "norte-equipos",
          channelType: "FACEBOOK",
          expiresAt: "2026-07-06T20:00:00.000Z",
        }),
        exchangeCodeForAccessToken: async () => ({
          accessToken: "user-access-token",
          tokenType: "bearer",
          expiresIn: 3600,
        }),
      },
      graph: {
        discoverAssets: async () => [{
          candidate: {
            id: "page_123",
            kind: "FACEBOOK_PAGE",
            name: "Norte Equipos",
            handle: "@norteequipos",
          },
          accessToken: "page-access-token",
        }],
        verifyAndSubscribe: async () => ({
          providerAccountId: "page_123",
          accountLabel: "Norte Equipos",
          externalHandle: "@norteequipos",
          config: { subscribedFields: ["messages"] },
          accessToken: "page-access-token",
        }),
      },
    });

    const start = await service.start({
      attemptId: "attempt_123",
      globalUserId: "user_123",
      globalTenantId: "tenant_123",
      tenantSlug: "norte-equipos",
      channelType: "FACEBOOK",
      enabledChannels: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
    });
    const callback = await service.callback({ code: "oauth-code", state: start.state });

    expect(callback.candidates).toEqual([{
      id: "page_123",
      kind: "FACEBOOK_PAGE",
      name: "Norte Equipos",
      handle: "@norteequipos",
    }]);
    expect(JSON.stringify(callback)).not.toContain("access-token");

    const completed = await service.complete({
      attemptId: "attempt_123",
      globalUserId: "user_123",
      globalTenantId: "tenant_123",
      candidateId: "page_123",
    });

    expect(completed).toEqual({ channelId: "channel_123" });
    expect(repository.channel).toMatchObject({
      type: "FACEBOOK",
      providerAccountId: "page_123",
      status: "CONNECTED",
    });
    expect(repository.channelSecret).not.toContain("page-access-token");
    expect(decryptChannelSecret(repository.channelSecret!, encryptionSecret)).toBe(
      "page-access-token",
    );
  });
});
