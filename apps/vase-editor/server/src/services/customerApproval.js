import { pool } from '../db.js';

// Aprobación de clientes nuevos. Por defecto (sin ajuste cargado) todos esperan aprobación, como siempre.
// Si la tienda apaga "Aprobar clientes nuevos a mano" (commerce.manual_approval === false), los minoristas
// entran solos. Los mayoristas también, solo si la tienda lo eligió (commerce.auto_approve_wholesale === true),
// porque ven otros precios. Los administradores siempre esperan.
export function initialMembershipStatus(commerce, role) {
  const manual = !commerce || typeof commerce !== 'object' || commerce.manual_approval !== false;
  if (manual) return 'pending';
  if (role === 'retail') return 'active';
  if (role === 'wholesale' && commerce.auto_approve_wholesale === true) return 'active';
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
