'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { COLORES_ESTADO_MESA, TEXTO_ESTADO_MESA } from '@/hooks/lib/constants';
import type { EstadoMesa } from '@/types/mesa';

const ESTADOS_LEYENDA: EstadoMesa[] = [
  'libre',
  'ocupada',
  'esperando_pedido',
  'pedido_listo',
  'esperando_pago',
  'problema',
  'para_cobrar',
];

const COLOR_MAP: Record<string, string> = {
  gray:   '#6b7280',
  orange: '#f97316',
  yellow: '#facc15',
  green:  '#22c55e',
  blue:   '#3b82f6',
  red:    '#ef4444',
  amber:  '#d97706',
};

function stateDot(tailwindBg: string): string {
  const key = Object.keys(COLOR_MAP).find((k) => tailwindBg.includes(k));
  return COLOR_MAP[key ?? ''] ?? '#6b7280';
}

function Dot({ estado }: { estado: EstadoMesa }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: stateDot(COLORES_ESTADO_MESA[estado]) }}
    />
  );
}

/** Leyenda colapsable centrada en la parte inferior, sin cubrir el plano. */
export function MesaStatusLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 pointer-events-none">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="pointer-events-auto bg-[#0a0a0a]/95 border border-zinc-800/60 rounded-2xl px-5 py-3 shadow-2xl backdrop-blur-sm mb-0.5"
          >
            <div className="grid grid-cols-4 gap-x-6 gap-y-1.5 min-w-max">
              {ESTADOS_LEYENDA.map((estado) => (
                <div key={estado} className="flex items-center gap-1.5">
                  <Dot estado={estado} />
                  <span className="text-[11px] text-zinc-400 whitespace-nowrap">
                    {TEXTO_ESTADO_MESA[estado]}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-zinc-700 text-[10px] font-mono mt-2.5 text-center tracking-wide">
              Tap · 2× tap · Mantener pulsado
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chip toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-medium transition-all shadow-lg
          ${open
            ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
            : 'bg-[#0a0a0a]/80 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 backdrop-blur-sm'
          }`}
      >
        <div className="flex items-center gap-0.5">
          {ESTADOS_LEYENDA.map((e) => (
            <Dot key={e} estado={e} />
          ))}
        </div>
        <span>Estados</span>
        <ChevronUp
          size={11}
          className={`transition-transform duration-200 ${open ? '' : 'rotate-180'}`}
        />
      </button>
    </div>
  );
}
