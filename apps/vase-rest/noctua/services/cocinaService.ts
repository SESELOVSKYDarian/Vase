import type { Pedido, EstadoCocina } from '@/types/pedido';
import { usePedidosStore } from '@/store/pedidosStore';
import { useMesasStore } from '@/store/mesasStore';
import type { EstadoMesa } from '@/types/mesa';

// Mapping from kitchen state to table state
const COCINA_TO_MESA: Record<EstadoCocina, EstadoMesa> = {
  pendiente: 'esperando_pedido',
  preparando: 'esperando_pedido',
  listo: 'pedido_listo',
  entregado: 'para_cobrar',
};

export const cocinaService = {
  getPedidosActivos: async (): Promise<Pedido[]> => {
    return usePedidosStore.getState().pedidos.filter((p) => p.estado !== 'entregado');
  },

  avanzarEstado: async (pedidoId: string): Promise<void> => {
    const pedido = usePedidosStore.getState().pedidos.find((item) => item.id === pedidoId);
    if (!pedido) return;

    const siguienteEstado: Record<EstadoCocina, EstadoCocina> = {
      pendiente: 'preparando',
      preparando: 'listo',
      listo: 'entregado',
      entregado: 'entregado',
    };

    await cocinaService.cambiarEstadoLibre(pedidoId, siguienteEstado[pedido.estado]);
  },

  cambiarEstadoLibre: async (pedidoId: string, nuevoEstado: EstadoCocina): Promise<void> => {
    const { pedidos, actualizarEstadoCocina } = usePedidosStore.getState();
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;

    // Actualizamos BD y Estado Local
    await actualizarEstadoCocina(pedidoId, nuevoEstado);

    // Actualización optimista local — el backend ya actualizó la mesa en BD
    // vía PATCH /pedidos/:id/estado → el realtime de Supabase dispara PedidoListoAlerta
    const mesaEstado = COCINA_TO_MESA[nuevoEstado];
    useMesasStore.getState().setEstadoMesa(pedido.mesaId, mesaEstado);
  },
};
