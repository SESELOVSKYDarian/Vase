// Overlay de resumen rápido de una mesa: muestra pedido activo con items y total.
'use client';

import { useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, ChevronRight, X, Plus, Minus } from 'lucide-react';
import { TEXTO_ESTADO_MESA } from '@/hooks/lib/constants';
import { COLORES_ESTADO_MESA, COMENSALES_MIN, COMENSALES_MAX_ABSOLUTO } from '@/hooks/lib/constants';
import { formatARS } from '@/hooks/lib/utils';
import { useNowTick, formatElapsedShort } from '@/hooks/useMesaTimer';
import type { MesaQuickSummaryData } from '@/types/mesa';

const PANEL_W = 280;
const PANEL_H = 360;

interface MesaQuickSummaryProps {
  data:            MesaQuickSummaryData;
  triggerX:        number;
  triggerY:        number;
  onClose:         () => void;
  onAbrirPedido:   () => void;
  onSetComensales: (comensales: number) => void;
}

export const MesaQuickSummary = memo(function MesaQuickSummary({
  data,
  triggerX,
  triggerY,
  onClose,
  onAbrirPedido,
  onSetComensales,
}: MesaQuickSummaryProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const now = useNowTick();

  const safeX = triggerX + PANEL_W > window.innerWidth  ? triggerX - PANEL_W - 8 : triggerX + 8;
  const safeY = triggerY + PANEL_H > window.innerHeight ? triggerY - PANEL_H      : triggerY;

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose]);

  const tienePedido = data.items.length > 0;
  const esLibre     = data.estado === 'libre';
  const elapsed     = data.timerInicio ? formatElapsedShort(data.timerInicio, now) : undefined;
  const comensales  = data.comensales ?? 0;

  // Etiqueta del CTA según estado: libre invita a crear, no a ver un pedido inexistente
  const ctaLabel = esLibre
    ? 'Agregar pedido'
    : tienePedido
    ? 'Ver pedido completo'
    : 'Gestionar mesa';

  const setComensalesClamped = (next: number) => {
    onSetComensales(Math.max(COMENSALES_MIN, Math.min(COMENSALES_MAX_ABSOLUTO, next)));
  };

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="fixed z-[9997] rounded-2xl shadow-2xl overflow-hidden"
      style={{
        left:             safeX,
        top:              safeY,
        width:            PANEL_W,
        background:       'rgba(10,10,10,0.95)',
        backdropFilter:   'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border:           '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-baseline gap-2">
          <span className="text-amber-400 font-black text-2xl leading-none">
            {data.numero}
          </span>
          <span className="text-zinc-500 text-xs font-mono">Mesa</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
            ${COLORES_ESTADO_MESA[data.estado]} bg-opacity-20 text-white`}
          >
            {TEXTO_ESTADO_MESA[data.estado]}
          </span>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-white transition-colors p-0.5"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Capacidad + tiempo transcurrido */}
      <div className="flex items-center gap-1.5 px-4 py-2 text-zinc-500 text-xs">
        <Users size={12} />
        <span>Cap. {data.capacidad}</span>
        {elapsed && (
          <>
            <span className="mx-1 opacity-40">·</span>
            <Clock size={12} />
            <span>Hace {elapsed}</span>
          </>
        )}
      </div>

      {/* Comensales — editable en el acto (solo mesas ocupadas) */}
      {!esLibre && (
        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
            Comensales
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setComensalesClamped(comensales - 1)}
              disabled={comensales <= COMENSALES_MIN}
              className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center hover:bg-zinc-700 transition-colors disabled:opacity-30"
              aria-label="Quitar comensal"
            >
              <Minus size={14} />
            </button>
            <span className="text-white font-bold text-base w-6 text-center tabular-nums">
              {comensales || '—'}
            </span>
            <button
              onClick={() => setComensalesClamped(comensales + 1)}
              className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center hover:bg-zinc-700 transition-colors"
              aria-label="Agregar comensal"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Items del pedido */}
      <div className="px-4 pb-2">
        {tienePedido ? (
          <div className="space-y-0.5 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-amber-400/80 font-mono text-xs w-5 text-center flex-shrink-0">
                    {item.cantidad}×
                  </span>
                  <span className="text-zinc-300 text-xs truncate">{item.nombre}</span>
                </div>
                <span className="text-zinc-500 text-xs font-mono flex-shrink-0 ml-2">
                  {formatARS(item.subtotal)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-600 text-xs py-3 text-center font-mono tracking-wide">
            Sin pedido activo
          </p>
        )}
      </div>

      {/* Total + CTA */}
      <div className="border-t border-white/5 px-4 py-3">
        {tienePedido && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-500 text-xs uppercase tracking-widest">Total</span>
            <span className="text-white font-bold text-sm font-mono">
              {formatARS(data.total)}
            </span>
          </div>
        )}
        <button
          onClick={onAbrirPedido}
          className="w-full flex items-center justify-between bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/30 rounded-xl px-4 py-2.5 text-amber-400 text-sm font-semibold transition-colors min-h-[44px]"
        >
          <span>{ctaLabel}</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </motion.div>
  );
});

// Wrapper con AnimatePresence para usar desde el exterior
interface MesaQuickSummaryWrapperProps {
  data:            MesaQuickSummaryData | null;
  triggerX:        number;
  triggerY:        number;
  onClose:         () => void;
  onAbrirPedido:   () => void;
  onSetComensales: (comensales: number) => void;
}

export function MesaQuickSummaryWrapper(props: MesaQuickSummaryWrapperProps) {
  return (
    <AnimatePresence>
      {props.data && (
        <MesaQuickSummary {...props} data={props.data} />
      )}
    </AnimatePresence>
  );
}
