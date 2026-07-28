// Provee los datos del pedido activo de una mesa para el overlay de resumen rápido.
'use client';

import { useState, useMemo } from 'react';
import { usePedidosStore } from '@/store/pedidosStore';
import { useMesasStore } from '@/store/mesasStore';
import type { MesaQuickSummaryData } from '@/types/mesa';

interface UseMesaQuickSummaryReturn {
  open: (mesaId: string) => void;
  close: () => void;
  activeMesaId: string | null;
  data: MesaQuickSummaryData | null;
}

export function useMesaQuickSummary(): UseMesaQuickSummaryReturn {
  const [activeMesaId, setActiveMesaId] = useState<string | null>(null);

  const getPedidoPorMesa = usePedidosStore((s) => s.getPedidoPorMesa);
  const mesas            = useMesasStore((s) => s.mesas);

  const data = useMemo((): MesaQuickSummaryData | null => {
    if (!activeMesaId) return null;
    const mesa = mesas.find((m) => m.id === activeMesaId);
    if (!mesa) return null;

    const pedido = getPedidoPorMesa(activeMesaId);

    return {
      mesaId:      activeMesaId,
      numero:      mesa.numero,
      capacidad:   mesa.capacidad,
      comensales:  pedido?.personas ?? mesa.personas,
      estado:      mesa.estado,
      pedidoId:    pedido?.id,
      items:       pedido?.items.map((i) => ({
        nombre:   i.nombre,
        cantidad: i.cantidad,
        subtotal: i.subtotal,
      })) ?? [],
      total:       pedido?.total ?? 0,
      timerInicio: mesa.timerInicio,
      isLoading:   false,
    };
  }, [activeMesaId, mesas, getPedidoPorMesa]);

  return {
    open:         setActiveMesaId,
    close:        () => setActiveMesaId(null),
    activeMesaId,
    data,
  };
}
