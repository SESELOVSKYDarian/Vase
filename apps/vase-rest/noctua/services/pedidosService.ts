import type { Pedido, EstadoCocina } from '@/types/pedido';
import { usePedidosStore } from '@/store/pedidosStore';

export const pedidosService = {
  getPedidos: async (): Promise<Pedido[]> => {
    // TODO: Supabase — supabase.from('pedidos').select('*, items(*)')
    await new Promise((r) => setTimeout(r, 50));
    return usePedidosStore.getState().pedidos;
  },

  getPedidosPorEstado: async (estado: EstadoCocina): Promise<Pedido[]> => {
    // TODO: Supabase — supabase.from('pedidos').select('*').eq('estado', estado)
    return usePedidosStore.getState().pedidos.filter((p) => p.estado === estado);
  },

  actualizarEstado: async (pedidoId: string, estado: EstadoCocina): Promise<void> => {
    // TODO: Supabase — supabase.from('pedidos').update({ estado, actualizado_en: new Date() }).eq('id', pedidoId)
    usePedidosStore.getState().actualizarEstadoCocina(pedidoId, estado);
  },
};
