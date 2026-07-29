'use client';

import { useState, useCallback, useRef, memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MesasCanvasLayout } from './MesasCanvasLayout';
import { MesaStatusLegend } from './MesaStatusLegend';
import { MesaContextMenu } from './MesaContextMenu';
import { MesaQuickSummaryWrapper } from './MesaQuickSummary';
import { MesaMergeBar } from './MesaMergeBar';
import { useMesaMerge } from '@/hooks/useMesaMerge';
import { useMesaQuickSummary } from '@/hooks/useMesaQuickSummary';
import { mergeMesas, unmergeMesas } from '@/services/mesaMergeService';
import { setComensales } from '@/services/comensalesService';
import { useMesasStore } from '@/store/mesasStore';
import { toast } from '@/components/ui/Toast';
import { TEXTO_ESTADO_MESA } from '@/hooks/lib/constants';
import type { Mesa, EstadoMesa, ContextMenuAction, MesaGestureCallbacks } from '@/types/mesa';

/** Una mesa es elegible para unión si no forma parte ya de un grupo unido. */
function esElegibleParaUnir(mesa: Mesa): boolean {
  return !mesa.mesasUnidas || mesa.mesasUnidas.length === 0;
}

interface MesasFloorPlanProps {
  mesas:              Mesa[];
  mesasSeleccionadas: string[];
  onSingleClick:      (id: string) => void;
  onDoubleClick:      (mesa: Mesa) => void;
  onDelete:           (id: string) => void;
}

interface ContextMenuState {
  mesa: Mesa;
  x:    number;
  y:    number;
}

interface QuickSummaryPos {
  x: number;
  y: number;
}

/**
 * MesasFloorPlan — Contenedor principal del plano de planta.
 * Gestiona todo el sistema de gestos táctiles: tap, doble tap, long press, swipe, fusión.
 */
export const MesasFloorPlan = memo(function MesasFloorPlan({
  mesas,
  mesasSeleccionadas,
  onSingleClick,
  onDoubleClick,
  onDelete,
}: MesasFloorPlanProps) {
  // ── Estado de gestos ──────────────────────────────────────────────────────
  const [contextMenu, setContextMenu]   = useState<ContextMenuState | null>(null);
  const [summaryPos, setSummaryPos]     = useState<QuickSummaryPos>({ x: 0, y: 0 });
  const [mozoRequeridoIds, setMozo]     = useState<Set<string>>(new Set());
  const [mergeLoading, setMergeLoading] = useState(false);
  const mozoTimers                      = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const cambiarEstadoMesa = useMesasStore((s) => s.cambiarEstadoMesa);
  const dividirMesas      = useMesasStore((s) => s.dividirMesas);

  const merge   = useMesaMerge();
  const summary = useMesaQuickSummary();

  // ── Gestos ────────────────────────────────────────────────────────────────

  const handleTap = useCallback((mesaId: string, x: number, y: number) => {
    // Modo selección de unión → agregar/quitar del grupo (solo mesas elegibles)
    if (merge.isSelectionMode) {
      const mesa = mesas.find((m) => m.id === mesaId);
      if (mesa && esElegibleParaUnir(mesa)) merge.toggleSelection(mesaId);
      return;
    }
    // Toggle quick summary: cerrar si ya está abierta para esa mesa
    if (summary.activeMesaId === mesaId) {
      summary.close();
    } else {
      setSummaryPos({ x, y });
      summary.open(mesaId);
    }
    // Mantener compatibilidad con la lógica de selección desktop
    onSingleClick(mesaId);
  }, [merge, summary, mesas, onSingleClick]);

  const handleDoubleTap = useCallback((mesa: Mesa) => {
    if (merge.isSelectionMode) return;
    summary.close();
    setContextMenu(null);
    onDoubleClick(mesa);
  }, [merge.isSelectionMode, summary, onDoubleClick]);

  const handleLongPress = useCallback((mesaId: string, x: number, y: number) => {
    if (merge.isSelectionMode) return;
    summary.close();
    const mesa = mesas.find((m) => m.id === mesaId);
    if (!mesa) return;
    setContextMenu({ mesa, x, y });
  }, [merge.isSelectionMode, summary, mesas]);

  const handleSwipe = useCallback(async (mesaId: string, direction: 'left' | 'right') => {
    if (merge.isSelectionMode) return;
    const mesa = mesas.find((m) => m.id === mesaId);
    if (!mesa) return;

    let nuevoEstado: EstadoMesa;

    if (direction === 'left') {
      // Swipe izquierda → liberar mesa directamente
      nuevoEstado = 'libre';
    } else {
      // Swipe derecha → ciclar: libre→ocupada→esperando_pedido→libre
      const ciclo: EstadoMesa[] = ['libre', 'ocupada', 'esperando_pedido'];
      const idx = ciclo.indexOf(mesa.estado);
      nuevoEstado = ciclo[(idx + 1) % ciclo.length];
    }

    try {
      await cambiarEstadoMesa(mesaId, nuevoEstado);
      toast.success(
        `Mesa ${mesa.numero}`,
        `Marcada como ${TEXTO_ESTADO_MESA[nuevoEstado].toLowerCase()}`
      );
    } catch {
      toast.error('Error', 'No se pudo cambiar el estado de la mesa');
    }
  }, [merge.isSelectionMode, mesas, cambiarEstadoMesa]);

  // ── Acciones del menú contextual ─────────────────────────────────────────

  const handleContextAction = useCallback(async (
    action: ContextMenuAction,
    mesa: Mesa,
    nuevoEstado?: EstadoMesa
  ) => {
    setContextMenu(null);

    switch (action) {
      case 'abrir_pedido':
        onDoubleClick(mesa);
        break;

      case 'cambiar_estado':
        if (!nuevoEstado) break;
        try {
          await cambiarEstadoMesa(mesa.id, nuevoEstado);
          toast.success(`Mesa ${mesa.numero}`, `Estado: ${TEXTO_ESTADO_MESA[nuevoEstado]}`);
        } catch {
          toast.error('Error', 'No se pudo cambiar el estado');
        }
        break;

      case 'llamar_mozo': {
        // Limpiar timer anterior si existe
        const prevTimer = mozoTimers.current.get(mesa.id);
        if (prevTimer) clearTimeout(prevTimer);
        setMozo((prev) => new Set([...prev, mesa.id]));
        toast.info(`Mesa ${mesa.numero}`, 'Mozo requerido');
        // Auto-apagar tras 5 minutos
        const t = setTimeout(() => {
          setMozo((prev) => { const n = new Set(prev); n.delete(mesa.id); return n; });
          mozoTimers.current.delete(mesa.id);
        }, 5 * 60 * 1000);
        mozoTimers.current.set(mesa.id, t);
        break;
      }

      case 'marcar_cobrar':
        try {
          await cambiarEstadoMesa(mesa.id, 'para_cobrar');
          toast.info(`Mesa ${mesa.numero}`, 'Marcada para cobrar');
        } catch {
          toast.error('Error', 'No se pudo marcar la mesa');
        }
        break;

      case 'editar_comensales':
        // Abre la gestión de la mesa (modal) donde se editan los comensales
        onDoubleClick(mesa);
        break;

      case 'unir_mesa':
        // Desde el menú contextual: entrar en modo selección con esta mesa ya elegida
        merge.enterSelectionMode();
        merge.toggleSelection(mesa.id);
        break;

      case 'separar_mesa':
        dividirMesas(mesa.id);
        unmergeMesas(mesa.id).catch(console.error);
        toast.success('Mesas separadas', `Mesa ${mesa.numero} separada correctamente`);
        break;

      case 'cancelar':
        break;
    }
  }, [onDoubleClick, cambiarEstadoMesa, merge, dividirMesas]);

  // ── Fusión de mesas ───────────────────────────────────────────────────────

  const handleConfirmMerge = useCallback(async () => {
    if (merge.selectedIds.length < 2) return;
    setMergeLoading(true);
    // La primaria real la re-elige mesaMergeService por antigüedad del pedido;
    // acá alcanza con pasar la primera como origen y el resto como secundarias.
    const [origin, ...secondary] = merge.selectedIds;
    try {
      await mergeMesas(origin, secondary);
      toast.success('Mesas unidas correctamente', `Grupo de ${merge.selectedIds.length} mesas`);
      merge.exitSelectionMode();
    } catch {
      toast.error('Error al unir mesas', 'No se pudo completar la fusión');
    } finally {
      setMergeLoading(false);
    }
  }, [merge]);

  const handleToggleSelectionMode = useCallback(() => {
    if (merge.isSelectionMode) merge.exitSelectionMode();
    else { summary.close(); setContextMenu(null); merge.enterSelectionMode(); }
  }, [merge, summary]);

  // ── Callbacks de Quick Summary ────────────────────────────────────────────

  const handleOpenSummaryPedido = useCallback(() => {
    if (!summary.activeMesaId) return;
    const mesa = mesas.find((m) => m.id === summary.activeMesaId);
    summary.close();
    if (mesa) onDoubleClick(mesa);
  }, [summary, mesas, onDoubleClick]);

  const handleSetComensales = useCallback(async (comensales: number) => {
    if (!summary.activeMesaId) return;
    try {
      await setComensales(summary.activeMesaId, comensales);
    } catch {
      toast.error('Error', 'No se pudieron actualizar los comensales');
    }
  }, [summary.activeMesaId]);

  // ── Objeto de callbacks de gestos (estable entre renders) ────────────────

  const gestures: MesaGestureCallbacks = {
    onTap:       handleTap,
    onDoubleTap: handleDoubleTap,
    onLongPress: handleLongPress,
    onSwipe:     handleSwipe,
  };

  // Números de mesas seleccionadas para mostrar en el MesaMergeBar
  const selectedNums = merge.selectedIds
    .map((id) => mesas.find((m) => m.id === id)?.numero ?? 0)
    .filter(Boolean);

  return (
    <div className={`relative ${merge.isSelectionMode ? 'pb-28' : ''}`}>
      {/* Canvas del plano de planta */}
      <MesasCanvasLayout
        mesas={mesas}
        mesasSeleccionadas={mesasSeleccionadas}
        mergeSelectedIds={merge.selectedIds}
        isSelectionMode={merge.isSelectionMode}
        mozoRequeridoIds={mozoRequeridoIds}
        gestures={gestures}
        onDelete={onDelete}
        onToggleSelectionMode={handleToggleSelectionMode}
      />

      {/* Leyenda de estados */}
      <MesaStatusLegend />

      {/* Menú contextual (long press) */}
      <AnimatePresence>
        {contextMenu && (
          <MesaContextMenu
            key="context-menu"
            mesa={contextMenu.mesa}
            triggerX={contextMenu.x}
            triggerY={contextMenu.y}
            onAction={handleContextAction}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* Resumen rápido (tap) */}
      <MesaQuickSummaryWrapper
        data={summary.data}
        triggerX={summaryPos.x}
        triggerY={summaryPos.y}
        onClose={summary.close}
        onAbrirPedido={handleOpenSummaryPedido}
        onSetComensales={handleSetComensales}
      />

      {/* Barra de confirmación de unión (visible durante todo el modo selección) */}
      <AnimatePresence>
        {merge.isSelectionMode && (
          <MesaMergeBar
            key="merge-bar"
            selectedNums={selectedNums}
            maxReached={merge.maxReached}
            onConfirm={handleConfirmMerge}
            onCancel={merge.exitSelectionMode}
            isLoading={mergeLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
});
