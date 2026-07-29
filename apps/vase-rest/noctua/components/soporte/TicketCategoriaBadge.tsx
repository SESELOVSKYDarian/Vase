'use client';

import { cn } from '@/hooks/lib/utils';
import type { TicketCategoria } from '@/types/soporte';

interface Props {
  categoria: TicketCategoria;
  className?: string;
}

const CONFIG: Record<TicketCategoria, { label: string; emoji: string; className: string }> = {
  bug:      { label: 'Bug',      emoji: '🐛', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
  consulta: { label: 'Consulta', emoji: '💬', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  mejora:   { label: 'Mejora',   emoji: '✨', className: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  urgente:  { label: 'Urgente',  emoji: '🚨', className: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
};

export function TicketCategoriaBadge({ categoria, className }: Props) {
  const { label, emoji, className: catClass } = CONFIG[categoria];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
        catClass,
        className
      )}
    >
      {emoji} {label}
    </span>
  );
}

/** Devuelve el color del borde izquierdo según categoría (para TicketCard) */
export function getCategoriaBorderColor(categoria: TicketCategoria): string {
  const map: Record<TicketCategoria, string> = {
    bug:      'border-l-red-500',
    consulta: 'border-l-blue-500',
    mejora:   'border-l-purple-500',
    urgente:  'border-l-orange-500',
  };
  return map[categoria];
}
