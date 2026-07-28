// Toolbar del plano de planta: agrupa las 3 acciones (Unir / Restablecer / Mover)
// centradas y con área táctil generosa (tablet-first), manteniendo visible la
// etiqueta "Plano de planta · N mesas".
'use client';

import { memo } from 'react';
import { Link2, X, RotateCcw, Move, Lock } from 'lucide-react';
import { cn } from '@/hooks/lib/utils';

interface MesaSelectionToolbarProps {
  mesaCount:             number;
  isSelectionMode:       boolean;
  onToggleSelectionMode: () => void;
  editMode:              boolean;
  onToggleEditMode:      () => void;
  onReset:               () => void;
  resetting:             boolean;
  canReset:              boolean;
}

// Botón base: alto mínimo 44px (accesibilidad táctil), sólido y con estados claros.
const BTN_BASE =
  'flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-5 rounded-xl text-sm font-semibold ' +
  'border transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100';

export const MesaSelectionToolbar = memo(function MesaSelectionToolbar({
  mesaCount,
  isSelectionMode,
  onToggleSelectionMode,
  editMode,
  onToggleEditMode,
  onReset,
  resetting,
  canReset,
}: MesaSelectionToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      {/* Etiqueta del plano — siempre visible */}
      <div className="flex items-center gap-2 sm:justify-self-start">
        <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500">
          Plano de planta
        </span>
        <span className="text-zinc-700 text-[10px]">·</span>
        <span className="text-[10px] font-mono text-zinc-600">{mesaCount} mesas</span>
      </div>

      {/* Grupo de acciones centrado */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 sm:justify-self-center">
        {/* Unir mesas / Cancelar unión */}
        <button
          onClick={onToggleSelectionMode}
          disabled={editMode}
          aria-pressed={isSelectionMode}
          className={cn(
            BTN_BASE,
            isSelectionMode
              ? 'bg-red-500/15 border-red-500/50 text-red-400 hover:bg-red-500/25'
              : 'bg-amber-600/15 border-amber-600/40 text-amber-300 hover:bg-amber-600/25'
          )}
        >
          {isSelectionMode ? <X size={16} /> : <Link2 size={16} />}
          <span>{isSelectionMode ? 'Cancelar' : 'Unir mesas'}</span>
        </button>

        {/* Restablecer posiciones */}
        <button
          onClick={onReset}
          disabled={resetting || isSelectionMode || editMode || !canReset}
          title="Restablecer todas las posiciones a la grilla automática"
          className={cn(
            BTN_BASE,
            'bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
          )}
        >
          <RotateCcw size={16} className={resetting ? 'animate-spin' : ''} />
          <span>Restablecer</span>
        </button>

        {/* Mover mesas */}
        <button
          onClick={onToggleEditMode}
          disabled={isSelectionMode}
          aria-pressed={editMode}
          className={cn(
            BTN_BASE,
            editMode
              ? 'bg-amber-600/15 border-amber-500/40 text-amber-400'
              : 'bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
          )}
        >
          {editMode ? <Lock size={16} /> : <Move size={16} />}
          <span>{editMode ? 'Posicionando' : 'Mover mesas'}</span>
        </button>
      </div>

      {/* Spacer para mantener el grupo centrado en pantallas anchas */}
      <div className="hidden sm:block" />
    </div>
  );
});
