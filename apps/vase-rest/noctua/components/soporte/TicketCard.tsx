'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, User } from 'lucide-react';
import { TicketEstadoBadge } from './TicketEstadoBadge';
import { TicketCategoriaBadge, getCategoriaBorderColor } from './TicketCategoriaBadge';
import { cn } from '@/hooks/lib/utils';
import type { TicketSoporte } from '@/types/soporte';

interface Props {
  ticket: TicketSoporte;
  isAdmin: boolean;
  onClick: (ticket: TicketSoporte) => void;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export const TicketCard = memo(function TicketCard({ ticket, isAdmin, onClick }: Props) {
  const borderColor = getCategoriaBorderColor(ticket.categoria);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      onClick={() => onClick(ticket)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(ticket)}
      aria-label={`Ver ticket: ${ticket.asunto}`}
      className={cn(
        'group relative bg-zinc-900 border border-zinc-800 rounded-xl p-5 cursor-pointer',
        'border-l-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all duration-150 select-none',
        borderColor
      )}
    >
      {/* Badges: categoría + estado */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <TicketCategoriaBadge categoria={ticket.categoria} />
        <TicketEstadoBadge estado={ticket.estado} />
      </div>

      {/* Asunto */}
      <h3 className="text-white font-semibold text-[15px] leading-snug mb-2 group-hover:text-white/90 transition-colors">
        {ticket.asunto}
      </h3>

      {/* Descripción truncada */}
      <p className="text-zinc-500 text-sm line-clamp-2 leading-relaxed mb-4">
        {ticket.descripcion}
      </p>

      {/* Footer meta */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {/* Usuario — solo visible en vista admin */}
          {isAdmin && ticket.nombre_usuario && (
            <div className="flex items-center gap-1.5 text-zinc-600 text-xs">
              <User size={11} />
              <span>{ticket.nombre_usuario}</span>
              <span className="text-zinc-700">·</span>
              <span className="capitalize">{ticket.rol_usuario}</span>
            </div>
          )}
        </div>

        {/* Fecha */}
        <div className="flex items-center gap-1.5 text-zinc-600 text-xs">
          <Calendar size={11} />
          <span>{formatFecha(ticket.creado_en)}</span>
        </div>
      </div>
    </motion.div>
  );
});
