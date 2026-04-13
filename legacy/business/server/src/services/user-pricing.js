import { pool } from '../db.js';

export async function getUserPriceAdjustmentPercent(tenantId, userId) {
  if (!tenantId || !userId) return 0;

  const result = await pool.query(
    [
      'select price_adjustment_percent',
      'from user_tenants',
      'where tenant_id = $1 and user_id = $2',
      'limit 1',
    ].join(' '),
    [tenantId, userId]
  );

  const raw = Number(result.rows[0]?.price_adjustment_percent || 0);
  return Number.isFinite(raw) ? raw : 0;
}
