import { createHash } from "node:crypto";
import type {
  LabsChannel,
  MetaAssetCandidate,
  MetaConnectionAttemptStatus,
} from "@vase/contracts";
import { decryptChannelSecret, encryptChannelSecret } from "./channel-secrets";

type OAuthStatePayload = {
  attemptId: string;
  globalUserId: string;
  globalTenantId: string;
  tenantSlug: string;
  channelType: LabsChannel;
  expiresAt: string;
};

type MetaOAuthAdapter = {
  createAuthorizationUrl(input: Omit<OAuthStatePayload, "expiresAt">): {
    authorizationUrl: string;
    state: string;
    expiresAt: string;
    scopes: string[];
  };
  verifyState(state: string): OAuthStatePayload;
  exchangeCodeForAccessToken(code: string): Promise<{
    accessToken: string;
    tokenType: string | null;
    expiresIn: number | null;
  }>;
};

export type DiscoveredMetaAsset = {
  candidate: MetaAssetCandidate;
  accessToken?: string;
  parentId?: string;
};

type MetaGraphAdapter = {
  discoverAssets(input: {
    channelType: LabsChannel;
    accessToken: string;
  }): Promise<DiscoveredMetaAsset[]>;
  verifyAndSubscribe(input: {
    channelType: LabsChannel;
    asset: DiscoveredMetaAsset;
    userAccessToken: string;
  }): Promise<{
    providerAccountId: string;
    accountLabel: string;
    externalHandle: string | null;
    config: Record<string, unknown>;
    accessToken: string;
  }>;
};

export type PersistedMetaAttempt = {
  id: string;
  globalUserId: string;
  globalTenantId: string;
  tenantSlug: string;
  channelType: LabsChannel;
  status: MetaConnectionAttemptStatus;
  stateHash: string;
  encryptedUserToken?: string | null;
  candidates: MetaAssetCandidate[];
  errorCode?: string | null;
  expiresAt: Date;
  consumedAt?: Date | null;
};

export interface MetaConnectionRepository {
  createAttempt(input: {
    id: string;
    globalUserId: string;
    globalTenantId: string;
    tenantSlug: string;
    channelType: LabsChannel;
    stateHash: string;
    expiresAt: Date;
  }): Promise<void>;
  consumeAttemptState(input: {
    stateHash: string;
    now: Date;
  }): Promise<PersistedMetaAttempt | null>;
  setAttemptCandidates(input: {
    attemptId: string;
    encryptedUserToken: string;
    candidates: MetaAssetCandidate[];
  }): Promise<void>;
  findAttempt(input: {
    attemptId: string;
    globalUserId: string;
    globalTenantId: string;
  }): Promise<PersistedMetaAttempt | null>;
  markAttemptVerifying(attemptId: string): Promise<void>;
  completeAttempt(input: {
    attemptId: string;
    channel: {
      globalTenantId: string;
      tenantSlug: string;
      type: LabsChannel;
      provider: "META_OFFICIAL";
      providerAccountId: string;
      accountLabel: string;
      externalHandle: string | null;
      status: "CONNECTED";
      config: Record<string, unknown>;
    };
    encryptedAccessToken: string;
  }): Promise<{ id: string }>;
  failAttempt(input: { attemptId: string; errorCode: string }): Promise<void>;
}

function hashState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export function createMetaConnectionService(input: {
  repository: MetaConnectionRepository;
  encryptionSecret: string;
  oauth: MetaOAuthAdapter;
  graph: MetaGraphAdapter;
  now?: () => Date;
  metrics?: {
    record(event: {
      event: "connection_started" | "connection_completed" | "connection_failed";
      channelType?: LabsChannel;
      globalTenantId?: string;
      errorCode?: string;
    }): void;
  };
}) {
  const now = input.now ?? (() => new Date());

  return {
    async start(params: {
      attemptId: string;
      globalUserId: string;
      globalTenantId: string;
      tenantSlug: string;
      channelType: LabsChannel;
      enabledChannels: LabsChannel[];
    }) {
      if (!params.enabledChannels.includes(params.channelType)) {
        throw new Error("CHANNEL_NOT_INCLUDED");
      }

      const authorization = input.oauth.createAuthorizationUrl({
        attemptId: params.attemptId,
        globalUserId: params.globalUserId,
        globalTenantId: params.globalTenantId,
        tenantSlug: params.tenantSlug,
        channelType: params.channelType,
      });

      await input.repository.createAttempt({
        id: params.attemptId,
        globalUserId: params.globalUserId,
        globalTenantId: params.globalTenantId,
        tenantSlug: params.tenantSlug,
        channelType: params.channelType,
        stateHash: hashState(authorization.state),
        expiresAt: new Date(authorization.expiresAt),
      });
      input.metrics?.record({
        event: "connection_started",
        channelType: params.channelType,
        globalTenantId: params.globalTenantId,
      });

      return authorization;
    },

    async callback(params: { code: string; state: string }) {
      const state = input.oauth.verifyState(params.state);
      const attempt = await input.repository.consumeAttemptState({
        stateHash: hashState(params.state),
        now: now(),
      });

      if (
        !attempt ||
        attempt.id !== state.attemptId ||
        attempt.globalUserId !== state.globalUserId ||
        attempt.globalTenantId !== state.globalTenantId ||
        attempt.channelType !== state.channelType
      ) {
        throw new Error("META_OAUTH_STATE_CONSUMED_OR_MISMATCHED");
      }

      const token = await input.oauth.exchangeCodeForAccessToken(params.code);
      const assets = await input.graph.discoverAssets({
        channelType: attempt.channelType,
        accessToken: token.accessToken,
      });
      const candidates = assets.map((asset) => asset.candidate);

      if (!candidates.length) {
        await input.repository.failAttempt({
          attemptId: attempt.id,
          errorCode: "META_NO_ELIGIBLE_ASSETS",
        });
        throw new Error("META_NO_ELIGIBLE_ASSETS");
      }

      await input.repository.setAttemptCandidates({
        attemptId: attempt.id,
        encryptedUserToken: encryptChannelSecret(
          token.accessToken,
          input.encryptionSecret,
        ),
        candidates,
      });

      return {
        attemptId: attempt.id,
        channelType: attempt.channelType,
        status: "SELECTING_ASSET" as const,
        candidates,
      };
    },

    async complete(params: {
      attemptId: string;
      globalUserId: string;
      globalTenantId: string;
      candidateId: string;
    }) {
      const attempt = await input.repository.findAttempt(params);
      if (
        !attempt ||
        attempt.status !== "SELECTING_ASSET" ||
        !attempt.encryptedUserToken ||
        attempt.expiresAt.getTime() <= now().getTime()
      ) {
        throw new Error("META_CONNECTION_ATTEMPT_INVALID");
      }

      const userAccessToken = decryptChannelSecret(
        attempt.encryptedUserToken,
        input.encryptionSecret,
      );
      const assets = await input.graph.discoverAssets({
        channelType: attempt.channelType,
        accessToken: userAccessToken,
      });
      const asset = assets.find((candidate) => candidate.candidate.id === params.candidateId);
      if (!asset) {
        throw new Error("META_ASSET_NOT_AUTHORIZED");
      }

      await input.repository.markAttemptVerifying(attempt.id);

      try {
        const verified = await input.graph.verifyAndSubscribe({
          channelType: attempt.channelType,
          asset,
          userAccessToken,
        });
        const channel = await input.repository.completeAttempt({
          attemptId: attempt.id,
          channel: {
            globalTenantId: attempt.globalTenantId,
            tenantSlug: attempt.tenantSlug,
            type: attempt.channelType,
            provider: "META_OFFICIAL",
            providerAccountId: verified.providerAccountId,
            accountLabel: verified.accountLabel,
            externalHandle: verified.externalHandle,
            status: "CONNECTED",
            config: verified.config,
          },
          encryptedAccessToken: encryptChannelSecret(
            verified.accessToken,
            input.encryptionSecret,
          ),
        });
        input.metrics?.record({
          event: "connection_completed",
          channelType: attempt.channelType,
          globalTenantId: attempt.globalTenantId,
        });

        return { channelId: channel.id };
      } catch (error) {
        const errorCode = error instanceof Error ? error.message : "META_CONNECTION_FAILED";
        await input.repository.failAttempt({
          attemptId: attempt.id,
          errorCode,
        });
        input.metrics?.record({
          event: "connection_failed",
          channelType: attempt.channelType,
          globalTenantId: attempt.globalTenantId,
          errorCode,
        });
        throw error;
      }
    },
  };
}
