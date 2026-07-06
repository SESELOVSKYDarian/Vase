function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

export function readRemoteCredentialIntrospectionBaseUrl() {
  return trimTrailingSlash(
    process.env.VASE_APP_INTERNAL_URL ||
    process.env.VASE_APP_URL ||
    'https://app.vase.ar'
  );
}

export function buildRemoteCredentialIntrospectionRequest({
  tenantSlug,
  token,
  scope,
  consumerSecret = null,
}) {
  return {
    tenantSlug,
    token,
    scope,
    ...(consumerSecret ? { consumerSecret } : {}),
  };
}
