function normalizeDomainInput(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

function toBool(value) {
  return value === true;
}

export function getVercelDomainConfig() {
  const token = String(process.env.VERCEL_API_TOKEN || '').trim();
  const projectId = String(process.env.VERCEL_PROJECT_ID || '').trim();
  const teamId = String(process.env.VERCEL_TEAM_ID || '').trim();

  return {
    enabled: Boolean(token && projectId),
    token,
    projectId,
    teamId,
  };
}

function buildApiUrl(pathname, config) {
  const base = 'https://api.vercel.com';
  const url = new URL(pathname, base);
  if (config.teamId) {
    url.searchParams.set('teamId', config.teamId);
  }
  return url.toString();
}

async function callVercel(pathname, options = {}, config = getVercelDomainConfig()) {
  if (!config.enabled) {
    return { ok: false, status: 0, data: null, error: 'vercel_not_configured' };
  }

  const res = await fetch(buildApiUrl(pathname, config), {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      data,
      error: data?.error?.code || data?.error?.message || data?.message || `http_${res.status}`,
    };
  }

  return { ok: true, status: res.status, data, error: null };
}

function normalizeVerification(result) {
  const domain = result?.data || {};
  return {
    verified: toBool(domain.verified),
    verification: Array.isArray(domain.verification) ? domain.verification : [],
    error: result?.error || null,
    status_code: result?.status ?? 0,
  };
}

export async function upsertVercelProjectDomain(domain, config = getVercelDomainConfig()) {
  const normalizedDomain = normalizeDomainInput(domain);
  if (!normalizedDomain) {
    return {
      provider: 'vercel',
      enabled: config.enabled,
      status: 'error',
      verified: false,
      error: 'invalid_domain',
      checked_at: new Date().toISOString(),
    };
  }

  if (!config.enabled) {
    return {
      provider: 'vercel',
      enabled: false,
      status: 'not_required',
      verified: true,
      error: null,
      checked_at: new Date().toISOString(),
    };
  }

  const addResult = await callVercel(
    `/v10/projects/${encodeURIComponent(config.projectId)}/domains`,
    { method: 'POST', body: JSON.stringify({ name: normalizedDomain }) },
    config
  );

  // If already attached, continue with get/check flow.
  if (!addResult.ok && addResult.status !== 409) {
    return {
      provider: 'vercel',
      enabled: true,
      status: 'error',
      verified: false,
      error: addResult.error,
      details: addResult.data || null,
      checked_at: new Date().toISOString(),
    };
  }

  let getResult = await callVercel(
    `/v10/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(normalizedDomain)}`,
    { method: 'GET' },
    config
  );

  if (!getResult.ok && getResult.status === 404) {
    // Retry verify endpoint when get is briefly unavailable right after create.
    await callVercel(
      `/v10/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(normalizedDomain)}/verify`,
      { method: 'POST' },
      config
    );
    getResult = await callVercel(
      `/v10/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(normalizedDomain)}`,
      { method: 'GET' },
      config
    );
  }

  let verificationState = normalizeVerification(getResult);

  if (!verificationState.verified && getResult.ok) {
    await callVercel(
      `/v10/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(normalizedDomain)}/verify`,
      { method: 'POST' },
      config
    );
    const afterVerify = await callVercel(
      `/v10/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(normalizedDomain)}`,
      { method: 'GET' },
      config
    );
    verificationState = normalizeVerification(afterVerify);
  }

  return {
    provider: 'vercel',
    enabled: true,
    status: verificationState.verified ? 'verified' : (verificationState.error ? 'error' : 'pending'),
    verified: verificationState.verified,
    verification: verificationState.verification,
    error: verificationState.error,
    details: getResult?.data || null,
    checked_at: new Date().toISOString(),
  };
}

export async function getVercelProjectDomainStatus(domain, config = getVercelDomainConfig()) {
  const normalizedDomain = normalizeDomainInput(domain);
  if (!normalizedDomain) {
    return {
      provider: 'vercel',
      enabled: config.enabled,
      status: 'error',
      verified: false,
      error: 'invalid_domain',
      checked_at: new Date().toISOString(),
    };
  }

  if (!config.enabled) {
    return {
      provider: 'vercel',
      enabled: false,
      status: 'not_required',
      verified: true,
      error: null,
      checked_at: new Date().toISOString(),
    };
  }

  let getResult = await callVercel(
    `/v10/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(normalizedDomain)}`,
    { method: 'GET' },
    config
  );

  if (!getResult.ok && getResult.status === 404) {
    return {
      provider: 'vercel',
      enabled: true,
      status: 'pending',
      verified: false,
      error: 'domain_not_attached_to_project',
      checked_at: new Date().toISOString(),
    };
  }

  let verificationState = normalizeVerification(getResult);
  if (!verificationState.verified && getResult.ok) {
    await callVercel(
      `/v10/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(normalizedDomain)}/verify`,
      { method: 'POST' },
      config
    );
    const afterVerify = await callVercel(
      `/v10/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(normalizedDomain)}`,
      { method: 'GET' },
      config
    );
    verificationState = normalizeVerification(afterVerify);
    getResult = afterVerify;
  }

  return {
    provider: 'vercel',
    enabled: true,
    status: verificationState.verified ? 'verified' : (verificationState.error ? 'error' : 'pending'),
    verified: verificationState.verified,
    verification: verificationState.verification,
    error: verificationState.error,
    details: getResult?.data || null,
    checked_at: new Date().toISOString(),
  };
}

export async function removeVercelProjectDomain(domain, config = getVercelDomainConfig()) {
  const normalizedDomain = normalizeDomainInput(domain);
  if (!normalizedDomain || !config.enabled) {
    return;
  }

  const result = await callVercel(
    `/v10/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(normalizedDomain)}`,
    { method: 'DELETE' },
    config
  );

  // Ignore not found: domain might have been manually detached.
  if (!result.ok && result.status !== 404) {
    throw new Error(result.error || 'vercel_domain_delete_failed');
  }
}
