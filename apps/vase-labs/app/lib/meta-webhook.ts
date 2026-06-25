import { createHmac } from "node:crypto";

const META_WEBHOOK_TOKEN_PREFIX = "vase_meta";

function getMetaWebhookSecret() {
  return (
    process.env.VASE_WEBHOOK_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY ||
    "vase_meta_webhook_fallback"
  );
}

export function generateMetaWebhookVerifyToken(globalTenantId: string) {
  const normalizedTenantId = globalTenantId.trim().toLowerCase();
  const signature = createHmac("sha256", getMetaWebhookSecret())
    .update(normalizedTenantId)
    .digest("hex")
    .slice(0, 32);

  return `${META_WEBHOOK_TOKEN_PREFIX}_${signature}`;
}

export function resolveMetaWebhookVerifyToken(globalTenantId: string, configuredToken?: string | null) {
  const explicitToken = configuredToken?.trim() || process.env.META_VERIFY_TOKEN?.trim();
  return explicitToken || generateMetaWebhookVerifyToken(globalTenantId);
}
