function normalizeDomainInput(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

function extractRootDomain(domain) {
  const parts = normalizeDomainInput(domain).split('.').filter(Boolean);
  if (parts.length < 2) return '';
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

function getCloudflareConfig() {
  return {
    token: String(process.env.CLOUDFLARE_API_TOKEN || '').trim(),
    enabled: Boolean(String(process.env.CLOUDFLARE_API_TOKEN || '').trim()),
  };
}

async function cfRequest(pathname, options = {}, config = getCloudflareConfig()) {
  if (!config.enabled) {
    return { ok: false, status: 0, error: 'cloudflare_not_configured', result: null };
  }
  const res = await fetch(`https://api.cloudflare.com/client/v4${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return {
    ok: Boolean(data?.success),
    status: res.status,
    error: data?.errors?.[0]?.message || data?.messages?.[0]?.message || null,
    result: data?.result ?? null,
  };
}

async function resolveZoneId(rootDomain, config = getCloudflareConfig()) {
  const response = await cfRequest(`/zones?name=${encodeURIComponent(rootDomain)}&status=active`, {}, config);
  if (!response.ok || !Array.isArray(response.result) || !response.result[0]?.id) {
    return null;
  }
  return response.result[0].id;
}

async function upsertDnsRecord(zoneId, { type, name, content, proxied = false }, config = getCloudflareConfig()) {
  const search = await cfRequest(
    `/zones/${zoneId}/dns_records?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`,
    {},
    config
  );

  const existing = Array.isArray(search.result) ? search.result[0] : null;
  const body = JSON.stringify({ type, name, content, proxied, ttl: 1 });

  if (!existing?.id) {
    return cfRequest(`/zones/${zoneId}/dns_records`, { method: 'POST', body }, config);
  }

  return cfRequest(`/zones/${zoneId}/dns_records/${existing.id}`, { method: 'PUT', body }, config);
}

export async function provisionCustomDomainDns(domain, options = {}) {
  const normalized = normalizeDomainInput(domain);
  const rootDomain = extractRootDomain(normalized);
  const config = getCloudflareConfig();
  const checkedAt = new Date().toISOString();
  const apexIp = String(options.apexIp || process.env.PLATFORM_APEX_IP || '').trim();

  if (!normalized || !rootDomain || !apexIp) {
    return {
      provider: 'cloudflare',
      enabled: config.enabled,
      status: 'error',
      error: 'invalid_provisioning_input',
      checked_at: checkedAt,
    };
  }

  if (!config.enabled) {
    return {
      provider: 'cloudflare',
      enabled: false,
      status: 'not_configured',
      error: null,
      checked_at: checkedAt,
    };
  }

  const zoneId = await resolveZoneId(rootDomain, config);
  if (!zoneId) {
    return {
      provider: 'cloudflare',
      enabled: true,
      status: 'zone_not_found',
      error: 'zone_not_found_or_not_active',
      checked_at: checkedAt,
    };
  }

  const apexResult = await upsertDnsRecord(zoneId, {
    type: 'A',
    name: rootDomain,
    content: apexIp,
    proxied: false,
  }, config);

  const wwwResult = await upsertDnsRecord(zoneId, {
    type: 'CNAME',
    name: `www.${rootDomain}`,
    content: rootDomain,
    proxied: false,
  }, config);

  if (!apexResult.ok || !wwwResult.ok) {
    return {
      provider: 'cloudflare',
      enabled: true,
      status: 'error',
      error: apexResult.error || wwwResult.error || 'dns_upsert_failed',
      checked_at: checkedAt,
      details: {
        apex_ok: apexResult.ok,
        www_ok: wwwResult.ok,
      },
    };
  }

  return {
    provider: 'cloudflare',
    enabled: true,
    status: 'configured',
    error: null,
    checked_at: checkedAt,
    details: {
      zone_id: zoneId,
      apex: rootDomain,
      www: `www.${rootDomain}`,
      apex_ip: apexIp,
    },
  };
}
