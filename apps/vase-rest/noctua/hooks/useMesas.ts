'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { mesasService } from '@/services/mesasService';
import { useMesasStore } from '@/store/mesasStore';
import { queryClient } from '@/hooks/lib/queryClient';
import type { EstadoMesa } from '@/types/mesa';

export const useMesas = () => {
  const mesas = useMesasStore((s) => s.mesas);
  return useQuery({
    queryKey: ['mesas'],
    queryFn: mesasService.getMesas,
    initialData: mesas,
    refetchInterval: 5000,
  });
};

export const useActualizarEstadoMesa = () =>
  useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoMesa }) =>
      mesasService.actualizarEstado(id, estado),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mesas'] }),
  });

export const useAbrirMesa = () =>
  useMutation({
    mutationFn: ({ id, personas }: { id: string; personas: number }) =>
      mesasService.abrirMesa(id, personas),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mesas'] }),
  });

export const useCerrarMesa = () =>
  useMutation({
    mutationFn: (id: string) => mesasService.cerrarMesa(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mesas'] }),
  });
