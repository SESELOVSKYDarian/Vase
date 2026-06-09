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

export function generateMetaWebhookVerifyToken(tenantSlug: string) {
  const normalizedTenantSlug = tenantSlug.trim().toLowerCase();
  const signature = createHmac("sha256", getMetaWebhookSecret())
    .update(normalizedTenantSlug)
    .digest("hex")
    .slice(0, 32);

  return `${META_WEBHOOK_TOKEN_PREFIX}_${signature}`;
}

export function resolveMetaWebhookVerifyToken(tenantSlug: string) {
  const legacyToken = process.env.META_VERIFY_TOKEN?.trim();
  return legacyToken || generateMetaWebhookVerifyToken(tenantSlug);
}
