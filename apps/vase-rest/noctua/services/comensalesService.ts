// Servicio de comensales: centraliza lectura/escritura del número de comensales
// (personas sentadas) de una mesa. El dato vive en el pedido activo (por seating),
// no en la mesa. Las escrituras persisten vía el backend Express cuando el pedido
// ya existe en la DB; siempre actualizan el store de forma optimista.
'use client';

import { useMesasStore } from '@/store/mesasStore';
import { usePedidosStore } from '@/store/pedidosStore';
import { actualizarComensales } from '@/hooks/lib/api/pedidosApi';
import { COMENSALES_MIN } from '@/hooks/lib/constants';
import type { Mesa } from '@/types/mesa';

// Un id "temporal" (generado en cliente antes de persistir) es más corto que un
// UUID/id real de Supabase. Mientras sea temporal, no hay fila en la DB que actualizar.
function esPedidoPersistido(id: string): boolean {
  return id.length >= 20;
}

/** Comensales actuales de una mesa: del pedido activo o del estado local de la mesa. */
export function getComensales(mesa: Mesa): number | undefined {
  const pedido = usePedidosStore.getState().getPedidoPorMesa(mesa.id);
  return pedido?.personas ?? mesa.personas;
}

/**
 * Fija los comensales de una mesa. Actualiza store (mesa + pedido) de inmediato
 * y persiste en el backend si el pedido ya existe en la DB.
 */
export async function setComensales(mesaId: string, comensales: number): Promise<void> {
  const value = Math.max(COMENSALES_MIN, Math.trunc(comensales));

  // Optimista: mesa (para el badge de la tarjeta) + pedido (fuente por seating)
  useMesasStore.getState().setPersonasMesa(mesaId, value);
  usePedidosStore.getState().setComensalesPedido(mesaId, value);

  const pedido = usePedidosStore.getState().getPedidoPorMesa(mesaId);
  if (pedido && esPedidoPersistido(pedido.id)) {
    await actualizarComensales(pedido.id, value);
  }
}
