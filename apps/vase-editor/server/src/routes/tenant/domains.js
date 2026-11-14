// Rutas para ver, conectar, revisar y quitar dominios.
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import { buildTenantDomainsPayload as buildTenantDomainsPayloadService, ensureTenantPlatformDomain as ensureTenantPlatformDomainService, normalizeDomainInput as normalizeDomainInputService, normalizeSubdomainLabel as normalizeSubdomainLabelService, provisionTenantCustomDomain as provisionTenantCustomDomainService, removeTenantDomain as removeTenantDomainService, upsertTenantDomain as upsertTenantDomainService } from '../../services/tenantDomains.js';
import { getTenantId, parseBooleanInput } from './helpers-common.js';

tenantRouter.get('/domains', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    return res.json(await buildTenantDomainsPayloadService(pool, tenantId, {
      ensurePlatformDomain: true,
      autoCreateOptions: { onlyWhenMissing: false },
    }));
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/domains', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const domain = String(req.body?.domain || '').trim();
    if (!domain) {
      return res.status(400).json({ error: 'domain_required' });
    }

    const payload = await upsertTenantDomainService(pool, tenantId, domain, {
      isPrimary: parseBooleanInput(req.body?.is_primary, true),
    });

    return res.status(201).json(payload);
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({ error: err.code });
    }
    return next(err);
  }
});

tenantRouter.post('/domains/platform', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const platformBaseDomain = String(process.env.PLATFORM_BASE_DOMAIN || '').trim().toLowerCase();
  if (!platformBaseDomain) {
    return res.status(400).json({ error: 'platform_domain_not_configured' });
  }

  try {
    const subdomain = normalizeSubdomainLabelService(req.body?.subdomain || '');
    if (!subdomain) {
      return res.status(400).json({ error: 'subdomain_required' });
    }

    const fullDomain = `${subdomain}.${platformBaseDomain}`;
    const payload = await upsertTenantDomainService(pool, tenantId, fullDomain, {
      isPrimary: parseBooleanInput(req.body?.is_primary, true),
    });

    return res.status(201).json(payload);
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({ error: err.code });
    }
    return next(err);
  }
});

tenantRouter.post('/domains/platform/ensure', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const platformBaseDomain = String(process.env.PLATFORM_BASE_DOMAIN || '').trim().toLowerCase();
  if (!platformBaseDomain) {
    return res.status(400).json({ error: 'platform_domain_not_configured' });
  }

  try {
    await ensureTenantPlatformDomainService(pool, tenantId, {
      preferredSubdomain: normalizeSubdomainLabelService(req.body?.subdomain || ''),
      onlyWhenMissing: false,
      isPrimary: parseBooleanInput(req.body?.is_primary, true),
    });

    const payload = await buildTenantDomainsPayloadService(pool, tenantId, {
      ensurePlatformDomain: true,
      autoCreateOptions: {
        onlyWhenMissing: false,
        isPrimary: parseBooleanInput(req.body?.is_primary, true),
      },
    });

    return res.status(201).json(payload);
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({ error: err.code });
    }
    return next(err);
  }
});

tenantRouter.post('/domains/check', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const payload = await buildTenantDomainsPayloadService(pool, tenantId, {
      ensurePlatformDomain: true,
      autoCreateOptions: { onlyWhenMissing: false },
    });
    const requestedDomain = normalizeDomainInputService(req.body?.domain || '');
    if (!requestedDomain) {
      return res.json(payload);
    }

    const target = payload.domains.find((item) => item.domain === requestedDomain) || null;
    return res.json({
      ...payload,
      checked_domain: target,
    });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/domains/:domain/provision', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const payload = await provisionTenantCustomDomainService(
      pool,
      tenantId,
      decodeURIComponent(req.params.domain || '')
    );
    return res.json(payload);
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({ error: err.code });
    }
    return next(err);
  }
});

tenantRouter.patch('/domains/:domain/primary', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const payload = await upsertTenantDomainService(pool, tenantId, decodeURIComponent(req.params.domain || ''), {
      isPrimary: true,
    });
    return res.json(payload);
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({ error: err.code });
    }
    return next(err);
  }
});

tenantRouter.delete('/domains/:domain', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const payload = await removeTenantDomainService(pool, tenantId, decodeURIComponent(req.params.domain || ''), {
      ensurePlatformDomain: true,
    });
    return res.json(payload);
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({ error: err.code });
    }
    return next(err);
  }
});
