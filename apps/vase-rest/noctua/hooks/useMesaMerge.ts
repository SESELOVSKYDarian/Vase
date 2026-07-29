// Gestiona el modo selección para unir mesas.
// Flujo: el mozo activa el modo desde el toolbar → toca 2+ mesas elegibles →
// confirma. No hay paso de "elegir origen": el pedido primario lo decide el
// service (mesaMergeService) por antigüedad del pedido.
'use client';

import { useState, useCallback } from 'react';
import type { MergeSelectionState } from '@/types/mesa';

interface UseMesaMergeReturn extends MergeSelectionState {
  enterSelectionMode: () => void;
  exitSelectionMode:  () => void;
  toggleSelection:    (mesaId: string) => void;
  maxReached:         boolean;
}

const INITIAL: MergeSelectionState = {
  isSelectionMode: false,
  selectedIds:     [],
};

const MAX_MESAS = 4;

export function useMesaMerge(): UseMesaMergeReturn {
  const [state, setState] = useState<MergeSelectionState>(INITIAL);

  const enterSelectionMode = useCallback(() => {
    setState({ isSelectionMode: true, selectedIds: [] });
  }, []);

  const exitSelectionMode = useCallback(() => setState(INITIAL), []);

  const toggleSelection = useCallback((mesaId: string) => {
    setState((prev) => {
      if (!prev.isSelectionMode) return prev;
      if (prev.selectedIds.includes(mesaId)) {
        return { ...prev, selectedIds: prev.selectedIds.filter((id) => id !== mesaId) };
      }
      if (prev.selectedIds.length >= MAX_MESAS) return prev;
      return { ...prev, selectedIds: [...prev.selectedIds, mesaId] };
    });
  }, []);

  return {
    ...state,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    maxReached: state.selectedIds.length >= MAX_MESAS,
  };
}
