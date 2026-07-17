import crypto from 'crypto';

async function findLatestProductSyncToken(db, tenantId) {
  const result = await db.query(
    [
      'select id, name, token_hash, scope, created_at',
      'from api_tokens',
      'where tenant_id = $1',
      "and (scope = 'products:sync' or scope = '*')",
      'order by created_at desc',
      'limit 1',
    ].join(' '),
    [tenantId]
  );

  return result.rows[0] || null;
}

function createProductSyncTokenValue() {
  return `vase_${crypto.randomBytes(24).toString('hex')}`;
}

export async function ensureProductSyncToken(db, tenantId, tokenName = 'ERP Sync') {
  const existing = await findLatestProductSyncToken(db, tenantId);
  if (existing) {
    return { tokenRecord: existing, autoCreated: false };
  }

  const tokenValue = createProductSyncTokenValue();
  const insertRes = await db.query(
    [
      'insert into api_tokens (tenant_id, name, token_hash, scope)',
      'values ($1, $2, $3, $4)',
      'returning id, name, token_hash, scope, created_at',
    ].join(' '),
    [tenantId, tokenName, tokenValue, 'products:sync']
  );

  return {
    tokenRecord: insertRes.rows[0],
    autoCreated: true,
  };
}

export function createProductSyncCredentialsHandler({ db, expectedServiceToken, ensureToken = ensureProductSyncToken }) {
  return async function productSyncCredentialsHandler(req, res, next) {
    const expected = String(expectedServiceToken || '').trim();
    if (!expected || req.get('authorization') !== `Bearer ${expected}`) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const tenantId = String(req.params?.tenantId || '').trim();
    if (!tenantId) return res.status(400).json({ error: 'invalid_tenant_id' });

    try {
      const { tokenRecord } = await ensureToken(db, tenantId);
      return res.json({
        domain: 'business.vase.ar',
        tenantUuid: tenantId,
        consumerKey: tokenRecord.token_hash,
      });
    } catch (error) {
      return next(error);
    }
  };
}
