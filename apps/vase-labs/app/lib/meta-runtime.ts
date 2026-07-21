import { labsPrisma } from "./db";
import { PrismaMetaConnectionRepository } from "./meta-connection-repository";
import { createMetaConnectionService } from "./meta-connection-service";
import { createMetaGraphClient } from "./meta-graph";
import { metaMetrics } from "./meta-metrics";
import { createMetaOAuthService } from "./meta-oauth";

function required(name: string, value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name}_MISSING`);
  return normalized;
}

export function createMetaRuntime() {
  const appId = required("META_APP_ID", process.env.META_APP_ID);
  const appSecret = required("META_APP_SECRET", process.env.META_APP_SECRET);
  const redirectUri = required(
    "META_OAUTH_REDIRECT_URI",
    process.env.META_OAUTH_REDIRECT_URI,
  );
  const stateSecret = required(
    "META_WEBHOOK_SECRET",
    process.env.META_WEBHOOK_SECRET ?? process.env.SERVICE_TO_SERVICE_TOKEN,
  );
  const encryptionSecret = required(
    "TOKEN_ENCRYPTION_SECRET",
    process.env.TOKEN_ENCRYPTION_SECRET,
  );
  const graphVersion = process.env.META_GRAPH_VERSION?.trim() || "v25.0";

  const repository = new PrismaMetaConnectionRepository(labsPrisma);
  const oauth = createMetaOAuthService({
    appId,
    appSecret,
    redirectUri,
    stateSecret,
    graphVersion,
    whatsappConfigId: process.env.META_WHATSAPP_CONFIG_ID?.trim(),
  });
  const graph = createMetaGraphClient({
    appId,
    appSecret,
    graphVersion,
  });

  return {
    repository,
    graph,
    service: createMetaConnectionService({
      repository,
      oauth,
      graph,
      encryptionSecret,
      metrics: metaMetrics,
    }),
  };
}
