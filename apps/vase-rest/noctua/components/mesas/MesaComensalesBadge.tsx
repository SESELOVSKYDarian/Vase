// Badge reutilizable de comensales (personas sentadas) para la tarjeta de mesa.
// Posición consistente en cualquier forma (cuadrada, rectangular, circular).
'use client';

import { memo } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/hooks/lib/utils';

interface MesaComensalesBadgeProps {
  count: number;
  /** Marca en ámbar si los comensales superan la capacidad de la mesa. */
  overCapacity?: boolean;
  className?: string;
}

export const MesaComensalesBadge = memo(function MesaComensalesBadge({
  count,
  overCapacity = false,
  className,
}: MesaComensalesBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full px-2 py-0.5 border shadow-sm',
        overCapacity
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
          : 'bg-zinc-900/80 border-white/10 text-white',
        className
      )}
    >
      <Users size={11} className="opacity-80" />
      <span className="text-[11px] font-bold leading-none tabular-nums">{count}</span>
    </div>
  );
});
