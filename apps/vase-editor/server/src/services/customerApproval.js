import { pool } from '../db.js';

// Aprobación de clientes nuevos. Por defecto (sin ajuste cargado) todos esperan aprobación, como siempre.
// Si la tienda apaga "Aprobar clientes nuevos a mano" (commerce.manual_approval === false), los minoristas
// entran solos. Los mayoristas siempre esperan: ven otros precios.
export function initialMembershipStatus(commerce, role) {
  const manual = !commerce || typeof commerce !== 'object' || commerce.manual_approval !== false;
  if (manual) return 'pending';
  return role === 'retail' ? 'active' : 'pending';
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
