// Lógica de fusión/separación de mesas: actualiza el store y sincroniza con Supabase.
'use client';

import { useMesasStore } from '@/store/mesasStore';
import { usePedidosStore } from '@/store/pedidosStore';
import { actualizarEstadoMesa } from '@/hooks/lib/api/mesasApi';
import type { Pedido } from '@/types/pedido';

/**
 * Determina la mesa primaria de una fusión:
 * la que tenga el pedido activo más antiguo, o la de origen si ninguna tiene pedido.
 */
function elegirMesaPrimaria(
  allIds: string[],
  originId: string,
  getPedido: (id: string) => Pedido | undefined
): string {
  const conPedido = allIds
    .map((id) => ({ id, pedido: getPedido(id) }))
    .filter((x): x is { id: string; pedido: Pedido } => x.pedido !== undefined)
    .sort((a, b) => a.pedido.creadoEn.getTime() - b.pedido.creadoEn.getTime());

  return conPedido[0]?.id ?? originId;
}

/**
 * Fusiona mesas: une visualmente, transfiere items de pedidos al pedido primario
 * y actualiza el estado de todas a 'ocupada' en Supabase.
 */
export async function mergeMesas(
  originMesaId: string,
  secondaryMesaIds: string[]
): Promise<void> {
  const allIds       = [originMesaId, ...secondaryMesaIds];
  const mesasState   = useMesasStore.getState();
  const pedidosState = usePedidosStore.getState();

  const primaryId    = elegirMesaPrimaria(allIds, originMesaId, pedidosState.getPedidoPorMesa);
  const secondaryIds = allIds.filter((id) => id !== primaryId);

  // Fusionar items de pedidos secundarios al borrador de la mesa primaria en el store
  const primaryPedido = pedidosState.getPedidoPorMesa(primaryId);
  for (const secId of secondaryIds) {
    const secPedido = pedidosState.getPedidoPorMesa(secId);
    if (secPedido && primaryPedido) {
      // Asegura un borrador para la primaria antes de transferir sus ítems
      pedidosState.iniciarPedido(
        primaryId,
        primaryPedido.numeroMesa,
        primaryPedido.zona,
        primaryPedido.personas
      );
      for (const item of secPedido.items) {
        pedidosState.agregarItem(primaryId, {
          productoId:     item.productoId,
          nombre:         item.nombre,
          cantidad:       item.cantidad,
          precioUnitario: item.precioUnitario,
          notas:          item.notas,
        });
      }
    }
  }

  // Actualizar mesasUnidas en el store
  mesasState.unirMesas(allIds);

  // Actualizar estado a 'ocupada' en Supabase para todas las mesas
  await Promise.all(allIds.map((id) => actualizarEstadoMesa(id, 'ocupada')));
}

/**
 * Separa mesas fusionadas: limpia mesasUnidas y actualiza el store.
 */
export async function unmergeMesas(mesaId: string): Promise<void> {
  useMesasStore.getState().dividirMesas(mesaId);
}

/**
 * Obtiene el pedido activo de una mesa desde el store.
 */
export function getActivePedidoForMesa(mesaId: string): Pedido | undefined {
  return usePedidosStore.getState().getPedidoPorMesa(mesaId);
}
