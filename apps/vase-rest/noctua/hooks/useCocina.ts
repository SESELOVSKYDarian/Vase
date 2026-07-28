'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { cocinaService } from '@/services/cocinaService';
import { usePedidosStore } from '@/store/pedidosStore';
import { queryClient } from '@/hooks/lib/queryClient';

export const useCocina = () => {
  const pedidos = usePedidosStore((s) => s.pedidos.filter((p) => p.estado !== 'entregado'));
  return useQuery({
    queryKey: ['cocina'],
    queryFn: cocinaService.getPedidosActivos,
    initialData: pedidos,
    refetchInterval: 5000,
  });
};

export const useAvanzarEstadoCocina = () =>
  useMutation({
    mutationFn: (pedidoId: string) => cocinaService.avanzarEstado(pedidoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cocina'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['mesas'] });
    },
  });
