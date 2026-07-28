import type { Mesa, EstadoMesa } from '@/types/mesa';
import { useMesasStore } from '@/store/mesasStore';

export const mesasService = {
  getMesas: async (): Promise<Mesa[]> => {
    // TODO: Supabase — return supabase.from('mesas').select('*')
    await new Promise((r) => setTimeout(r, 50));
    return useMesasStore.getState().mesas;
  },

  actualizarEstado: async (id: string, estado: EstadoMesa): Promise<void> => {
    // TODO: Supabase — supabase.from('mesas').update({ estado }).eq('id', id)
    useMesasStore.getState().setEstadoMesa(id, estado);
  },

  abrirMesa: async (id: string, personas: number): Promise<void> => {
    // TODO: Supabase — supabase.from('mesas').update({ estado: 'esperando_pedido', personas, timer_inicio: new Date() }).eq('id', id)
    useMesasStore.getState().abrirMesa(id, personas);
  },

  cerrarMesa: async (id: string): Promise<void> => {
    // TODO: Supabase — supabase.from('mesas').update({ estado: 'libre', personas: null, pedido_id: null }).eq('id', id)
    useMesasStore.getState().cerrarMesa(id);
  },
};
