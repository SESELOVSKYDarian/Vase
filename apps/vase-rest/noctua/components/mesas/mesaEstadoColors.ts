/**
 * Colores hex de estado de mesa — para uso en SVG y filtros de sombra.
 * Debe coincidir exactamente con COLORES_ESTADO_MESA de hooks/lib/constants.ts.
 */
import type { EstadoMesa } from '@/types/mesa';

export const MESA_ESTADO_HEX: Record<EstadoMesa, string> = {
  libre:            '#4b5563', // gray-600
  ocupada:          '#f97316', // orange-500
  esperando_pedido: '#facc15', // yellow-400
  pedido_listo:     '#22c55e', // green-500
  esperando_pago:   '#3b82f6', // blue-500
  problema:         '#ef4444', // red-500
  para_cobrar:      '#d97706', // amber-600 — NOCTUA gold
};

/** Estados que implican personas sentadas (cambia color de sillas) */
export const ESTADOS_CON_PERSONAS: ReadonlySet<EstadoMesa> = new Set([
  'ocupada',
  'esperando_pedido',
  'pedido_listo',
  'esperando_pago',
]);

/** Determina la forma visual según capacidad (el tipo Mesa no tiene campo 'forma') */
export type FormaVisual = 'circular' | 'cuadrada' | 'rectangular';

export function getFormaVisual(capacidad: number): FormaVisual {
  if (capacidad <= 2) return 'circular';
  if (capacidad <= 4) return 'cuadrada';
  return 'rectangular';
}
