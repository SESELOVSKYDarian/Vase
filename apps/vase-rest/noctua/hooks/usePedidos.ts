'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { pedidosService } from '@/services/pedidosService';
import { usePedidosStore } from '@/store/pedidosStore';
import { queryClient } from '@/hooks/lib/queryClient';
import type { EstadoCocina } from '@/types/pedido';

export const usePedidos = () => {
  const pedidos = usePedidosStore((s) => s.pedidos);
  return useQuery({
    queryKey: ['pedidos'],
    queryFn: pedidosService.getPedidos,
    initialData: pedidos,
    refetchInterval: 5000,
  });
};

export const useActualizarEstadoPedido = () =>
  useMutation({
    mutationFn: ({ pedidoId, estado }: { pedidoId: string; estado: EstadoCocina }) =>
      pedidosService.actualizarEstado(pedidoId, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['cocina'] });
    },
  });
