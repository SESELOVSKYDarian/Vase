'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Clock, AlertTriangle, Check } from 'lucide-react';
import { MesaShape } from './MesaShape';
import { MesaChairs } from './MesaChairs';
import { MesaTouchOverlay } from './MesaTouchOverlay';
import { MesaComensalesBadge } from './MesaComensalesBadge';
import { MESA_ESTADO_HEX, getFormaVisual } from './mesaEstadoColors';
import { TEXTO_ESTADO_MESA } from '@/hooks/lib/constants';
import { cn } from '@/hooks/lib/utils';
import { useNowTick, formatElapsedShort, isElapsedAlert } from '@/hooks/useMesaTimer';
import type { Mesa, MesaGestureCallbacks } from '@/types/mesa';

/** Dimensiones del contenedor de sillas según forma visual */
function getContenedorSize(capacidad: number): { w: number; h: number } {
  const forma = getFormaVisual(capacidad);
  return forma === 'rectangular' ? { w: 200, h: 160 } : { w: 160, h: 160 };
}

interface MesaCardProps {
  mesa:              Mesa;
  isSelected:        boolean;
  isMergeMode:       boolean;
  isMergeSelected:   boolean;
  isSelectable:      boolean;
  isMozoRequerido:   boolean;
  mesasUnidasNums?:  number[];
  gestures:          MesaGestureCallbacks;
  onDelete:          (id: string) => void;
}

export const MesaCard = memo(function MesaCard({
  mesa,
  isSelected,
  isMergeMode,
  isMergeSelected,
  isSelectable,
  isMozoRequerido,
  mesasUnidasNums = [],
  gestures,
  onDelete,
}: MesaCardProps) {
  const [hovered, setHovered] = useState(false);

  // Timer compartido: un solo intervalo global tickea "now" cada 60s
  const now = useNowTick();
  const elapsed = mesa.timerInicio ? formatElapsedShort(mesa.timerInicio, now) : '';
  const isOverdue = mesa.timerInicio ? isElapsedAlert(mesa.timerInicio) : false;

  const { w, h } = getContenedorSize(mesa.capacidad);
  const forma     = getFormaVisual(mesa.capacidad);
  const glowColor = MESA_ESTADO_HEX[mesa.estado];
  const filterId  = `glow-${mesa.id}`;
  const isUnited  = mesasUnidasNums.length > 0;

  // Comensales visibles en tarjeta solo si la mesa está ocupada (estado !== libre)
  const showComensales = mesa.estado !== 'libre' && !!mesa.personas && mesa.personas > 0;
  const overCapacity   = !!mesa.personas && mesa.personas > mesa.capacidad;

  // En modo selección: mesas no elegibles se atenúan
  const dimmed = isMergeMode && !isSelectable;

  // Anillo de selección: selección de fusión > unida > selección normal
  const ringStyle = isMergeSelected
    ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-950'
    : isUnited && !isMergeMode
    ? 'ring-1 ring-amber-600/60 ring-offset-1 ring-offset-zinc-950'
    : isSelected && !isMergeMode
    ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-950'
    : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: dimmed ? 0.4 : 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className="flex flex-col items-center gap-2 select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Contenedor principal de mesa + sillas */}
      <div
        aria-label={`Mesa ${mesa.numero}, ${TEXTO_ESTADO_MESA[mesa.estado]}${showComensales ? `, ${mesa.personas} comensales` : ''}`}
        className={cn('relative rounded-xl transition-all duration-200', ringStyle)}
        style={{ width: w, height: h }}
      >
        {/* SVG de sillas (absoluto, debajo visualmente) */}
        <MesaChairs capacidad={mesa.capacidad} estado={mesa.estado} />

        {/* SVG de la mesa (centrado sobre las sillas) */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <MesaShape capacidad={mesa.capacidad} estado={mesa.estado} filterId={filterId} />
        </div>

        {/* Número de mesa — superpuesto al centro */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[3]">
          <span
            className="font-black text-white leading-none drop-shadow-lg select-none"
            style={{
              fontSize:   forma === 'circular' ? '1.6rem' : '1.75rem',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            {mesa.numero}
          </span>
        </div>

        {/* Badge de comensales — esquina superior izquierda, consistente en toda forma */}
        {showComensales && !isMergeMode && (
          <div className="absolute top-1 left-1 z-[5] pointer-events-none">
            <MesaComensalesBadge count={mesa.personas!} overCapacity={overCapacity} />
          </div>
        )}

        {/* Overlay táctil — intercepta todos los gestos (desactivado si no es elegible) */}
        <MesaTouchOverlay
          mesa={mesa}
          isMergeMode={isMergeMode}
          isMergeSelected={isMergeSelected}
          disabled={dimmed}
          onTap={(x, y) => gestures.onTap(mesa.id, x, y)}
          onDoubleTap={() => gestures.onDoubleTap(mesa)}
          onLongPress={(x, y) => gestures.onLongPress(mesa.id, x, y)}
          onSwipeLeft={() => gestures.onSwipe(mesa.id, 'left')}
          onSwipeRight={() => gestures.onSwipe(mesa.id, 'right')}
        />

        {/* Checkbox de selección — visible en modo selección de fusión */}
        {isMergeMode && isSelectable && (
          <div
            className={cn(
              'absolute -top-2 -left-2 z-[9] w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all pointer-events-none',
              isMergeSelected
                ? 'bg-amber-500 border-amber-400 scale-100'
                : 'bg-zinc-900/90 border-zinc-500 scale-90'
            )}
          >
            {isMergeSelected && <Check size={15} className="text-black" strokeWidth={3} />}
          </div>
        )}

        {/* Botón eliminar — solo en hover desktop, fuera de modo selección */}
        <AnimatePresence>
          {hovered && !isMergeMode && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => { e.stopPropagation(); onDelete(mesa.id); }}
              className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-10 transition-colors"
              aria-label={`Eliminar mesa ${mesa.numero}`}
            >
              <Trash2 size={11} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Icono de alerta si hay problema */}
        {mesa.estado === 'problema' && (
          <div className="absolute -top-1 -left-1 bg-red-500 rounded-full p-0.5 z-10 pointer-events-none">
            <AlertTriangle size={10} className="text-white" />
          </div>
        )}

        {/* Glow de mesas unidas */}
        {isUnited && !isMergeMode && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none z-[4]"
            style={{ boxShadow: '0 0 0 1.5px rgba(217,119,6,0.5), 0 0 14px 3px rgba(217,119,6,0.18)' }}
          />
        )}

        {/* Anillo para_cobrar — pulso dorado */}
        {mesa.estado === 'para_cobrar' && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none z-[4] animate-pulse"
            style={{ boxShadow: '0 0 0 3px #d97706, 0 0 20px 4px rgba(217,119,6,0.4)' }}
          />
        )}

        {/* Anillo mozo requerido — pulso ámbar */}
        {isMozoRequerido && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none z-[4] animate-pulse"
            style={{ boxShadow: '0 0 0 3px #f59e0b, 0 0 24px 6px rgba(245,158,11,0.35)' }}
          />
        )}

        {/* Tooltip en hover (solo desktop, no en modo selección) */}
        <AnimatePresence>
          {hovered && !isMergeMode && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
            >
              <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: glowColor }}
                  />
                  <span className="text-[11px] font-semibold text-white">
                    Mesa {mesa.numero}
                  </span>
                  <span className="text-[10px] text-zinc-400">·</span>
                  <span className="text-[10px] text-zinc-400">{mesa.capacidad} pers.</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5 text-center">
                  {TEXTO_ESTADO_MESA[mesa.estado]}
                </p>
              </div>
              <div className="w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700 mx-auto rotate-45 -mt-1" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Timer — debajo del contenedor (formato escaneable Xh Ym) */}
      {elapsed && !isMergeMode && (
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold',
            isOverdue
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-zinc-800/60 text-zinc-400'
          )}
        >
          <Clock size={9} />
          <span>{elapsed}</span>
        </div>
      )}

      {/* Pill de mesas unidas — muestra el grupo completo */}
      {isUnited && !isMergeMode && (
        <div className="flex items-center gap-0.5 bg-amber-600/20 border border-amber-600/40 rounded-full px-2.5 py-0.5 shadow-sm">
          <span className="text-[9px] text-amber-400 font-black leading-none tracking-wide">
            M{mesa.numero}+{mesasUnidasNums.map(n => `M${n}`).join('+')}
          </span>
        </div>
      )}
    </motion.div>
  );
});
