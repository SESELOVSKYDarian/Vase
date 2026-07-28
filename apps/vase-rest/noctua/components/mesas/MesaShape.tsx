'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { EstadoMesa } from '@/types/mesa';
import { MESA_ESTADO_HEX, getFormaVisual } from './mesaEstadoColors';

interface MesaShapeProps {
  capacidad: number;
  estado: EstadoMesa;
  /** ID único para el filtro SVG — evitar colisiones entre instancias */
  filterId: string;
}

/** Paleta de madera oscura para las mesas */
const MADERA_FILL   = '#2a1f14';
const MADERA_STROKE = '#4a3220';
const MADERA_VETA   = '#321c0d';

/** Cuadrada: 80×80 con granos de madera decorativos */
function FormaCuadrada({ filterId, glowColor }: { filterId: string; glowColor: string }) {
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={glowColor} floodOpacity="0.75" />
        </filter>
      </defs>
      {/* Sombra de estado */}
      <rect x="4" y="4" width="80" height="80" rx="10" fill={glowColor} opacity="0.15" />
      {/* Cuerpo de madera */}
      <rect x="4" y="4" width="80" height="80" rx="10" fill={MADERA_FILL} stroke={MADERA_STROKE} strokeWidth="2" filter={`url(#${filterId})`} />
      {/* Vetas decorativas */}
      <line x1="18" y1="4" x2="18" y2="84" stroke={MADERA_VETA} strokeWidth="1" opacity="0.4" />
      <line x1="34" y1="4" x2="34" y2="84" stroke={MADERA_VETA} strokeWidth="1" opacity="0.25" />
      <line x1="54" y1="4" x2="54" y2="84" stroke={MADERA_VETA} strokeWidth="1" opacity="0.3" />
      <line x1="70" y1="4" x2="70" y2="84" stroke={MADERA_VETA} strokeWidth="1" opacity="0.2" />
      {/* Borde de estado coloreado */}
      <rect x="4" y="4" width="80" height="80" rx="10" fill="none" stroke={glowColor} strokeWidth="2.5" opacity="0.85" />
    </svg>
  );
}

/** Rectangular: 124×72 con vetas horizontales */
function FormaRectangular({ filterId, glowColor }: { filterId: string; glowColor: string }) {
  return (
    <svg width="132" height="80" viewBox="0 0 132 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={glowColor} floodOpacity="0.75" />
        </filter>
      </defs>
      <rect x="4" y="4" width="124" height="72" rx="10" fill={glowColor} opacity="0.15" />
      <rect x="4" y="4" width="124" height="72" rx="10" fill={MADERA_FILL} stroke={MADERA_STROKE} strokeWidth="2" filter={`url(#${filterId})`} />
      {/* Vetas horizontales */}
      <line x1="4" y1="22" x2="128" y2="22" stroke={MADERA_VETA} strokeWidth="1" opacity="0.35" />
      <line x1="4" y1="40" x2="128" y2="40" stroke={MADERA_VETA} strokeWidth="1" opacity="0.25" />
      <line x1="4" y1="58" x2="128" y2="58" stroke={MADERA_VETA} strokeWidth="1" opacity="0.3" />
      <rect x="4" y="4" width="124" height="72" rx="10" fill="none" stroke={glowColor} strokeWidth="2.5" opacity="0.85" />
    </svg>
  );
}

/** Circular: ⌀ 82px con anillos de madera */
function FormaCircular({ filterId, glowColor }: { filterId: string; glowColor: string }) {
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={glowColor} floodOpacity="0.75" />
        </filter>
      </defs>
      <circle cx="44" cy="44" r="40" fill={glowColor} opacity="0.15" />
      <circle cx="44" cy="44" r="40" fill={MADERA_FILL} stroke={MADERA_STROKE} strokeWidth="2" filter={`url(#${filterId})`} />
      {/* Anillos de madera decorativos */}
      <circle cx="44" cy="44" r="28" fill="none" stroke={MADERA_VETA} strokeWidth="1" opacity="0.35" />
      <circle cx="44" cy="44" r="16" fill="none" stroke={MADERA_VETA} strokeWidth="1" opacity="0.25" />
      <circle cx="44" cy="44" r="6"  fill="none" stroke={MADERA_VETA} strokeWidth="1" opacity="0.2" />
      {/* Borde de estado */}
      <circle cx="44" cy="44" r="40" fill="none" stroke={glowColor} strokeWidth="2.5" opacity="0.85" />
    </svg>
  );
}

/**
 * MesaShape — Forma SVG de la mesa según capacidad y estado.
 * La forma se determina desde capacidad (no hay campo 'forma' en el tipo Mesa).
 */
export const MesaShape = memo(function MesaShape({ capacidad, estado, filterId }: MesaShapeProps) {
  const forma     = getFormaVisual(capacidad);
  const glowColor = MESA_ESTADO_HEX[estado];

  const svgNode =
    forma === 'circular'    ? <FormaCircular    filterId={filterId} glowColor={glowColor} /> :
    forma === 'rectangular' ? <FormaRectangular filterId={filterId} glowColor={glowColor} /> :
                              <FormaCuadrada    filterId={filterId} glowColor={glowColor} />;

  return (
    <motion.div
      className="relative flex items-center justify-center"
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
    >
      {svgNode}
    </motion.div>
  );
});
