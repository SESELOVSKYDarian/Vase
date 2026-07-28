'use client';

import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { COLORES_ESTADO_MESA, TEXTO_ESTADO_MESA } from '@/hooks/lib/constants';
import { formatElapsed, elapsedMinutes, cn } from '@/hooks/lib/utils';
import type { Mesa } from '@/types/mesa';

interface MesaCardProps {
  mesa: Mesa;
  isSelected: boolean;
  onSingleClick: (id: string) => void;
  onDoubleClick: (mesa: Mesa) => void;
  onDelete: (id: string) => void;
}

export const MesaCard = memo(function MesaCard({
  mesa,
  isSelected,
  onSingleClick,
  onDoubleClick,
  onDelete,
}: MesaCardProps) {  const [elapsed, setElapsed] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (!mesa.timerInicio) { setElapsed(''); return; }
    const tick = () => {
      setElapsed(formatElapsed(mesa.timerInicio!));
      setIsOverdue(elapsedMinutes(mesa.timerInicio!) >= 90);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mesa.timerInicio]);

  const colorClass = COLORES_ESTADO_MESA[mesa.estado];
  const isLibre = mesa.estado === 'libre';

  let clickTimer: ReturnType<typeof setTimeout> | null = null;

  const handleClick = () => {
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
    clickTimer = setTimeout(() => { onSingleClick(mesa.id); clickTimer = null; }, 200);
  };

  const handleDoubleClick = () => {
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    onDoubleClick(mesa);
  };

 return (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
    onClick={handleClick}
    onDoubleClick={handleDoubleClick}
    role="button"
    aria-label={`Mesa ${mesa.numero}, ${TEXTO_ESTADO_MESA[mesa.estado]}${
      mesa.personas ? `, ${mesa.personas} personas` : ""
    }`}
    className={cn(
      "relative w-24 h-24 rounded-xl cursor-pointer select-none flex flex-col items-center justify-center gap-1",
      "border-2 transition-all duration-200",
      colorClass,
      isSelected
        ? "border-white ring-2 ring-white ring-offset-2 ring-offset-black"
        : "border-transparent",
      isLibre ? "opacity-60" : "opacity-100"
    )}
  >
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onDelete(mesa.id);
      }}
      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-10"
      aria-label={`Eliminar mesa ${mesa.numero}`}
    >
      <Trash2 size={12} />
    </button>

    <span className="font-display text-3xl font-black text-white leading-none drop-shadow">
      {mesa.numero}
    </span>

    {mesa.personas && (
      <div className="flex items-center gap-0.5 text-white/80">
        <Users size={10} />
        <span className="text-xs font-semibold">{mesa.personas}</span>
      </div>
    )}

    {elapsed && (
      <div
        className={cn(
          "flex items-center gap-0.5 text-white/90",
          isOverdue && "animate-pulse-red"
        )}
      >
        <Clock size={9} />
        <span className="text-[10px] font-mono font-semibold">
          {elapsed}
        </span>
      </div>
    )}

    {isOverdue && (
      <div className="absolute -top-1 -left-1 bg-red-500 rounded-full p-0.5">
        <AlertTriangle size={10} className="text-white" />
      </div>
    )}

    {mesa.mesasUnidas && mesa.mesasUnidas.length > 0 && (
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-500 rounded-full w-3 h-3 flex items-center justify-center">
        <span className="text-[8px] text-white font-bold">
          {mesa.mesasUnidas.length + 1}
        </span>
      </div>
    )}
  </motion.div>
);})