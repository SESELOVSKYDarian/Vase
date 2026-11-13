import { pool } from '../db.js';

// Aprobación de clientes nuevos. Por defecto (sin ajuste cargado) todos esperan aprobación, como siempre.
// Dos llaves independientes:
// - Minoristas: entran solos si la tienda apagó la aprobación (commerce.manual_approval === false).
// - Mayoristas: entran solos si la tienda lo eligió (commerce.auto_approve_wholesale === true).
// Los administradores siempre esperan.
export function initialMembershipStatus(commerce, role) {
  if (!commerce || typeof commerce !== 'object') return 'pending';
  if (role === 'retail') return commerce.manual_approval === false ? 'active' : 'pending';
  if (role === 'wholesale') return commerce.auto_approve_wholesale === true ? 'active' : 'pending';
  return 'pending';
}

export async function resolveInitialMembershipStatus(tenantId, role) {
  try {
    const result = await pool.query('select commerce from tenant_settings where tenant_id = $1', [tenantId]);
    return initialMembershipStatus(result.rows[0]?.commerce || null, role);
  } catch (err) {
    console.warn('[customer-approval] No se pudo leer el ajuste, queda pendiente:', err.message);
    return 'pending';
  }
}
