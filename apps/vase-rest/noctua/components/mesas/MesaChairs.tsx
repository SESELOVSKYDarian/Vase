'use client';

import React, { memo } from 'react';
import type { EstadoMesa } from '@/types/mesa';
import { ESTADOS_CON_PERSONAS, getFormaVisual } from './mesaEstadoColors';

interface MesaChairsProps {
  capacidad: number;
  estado: EstadoMesa;
}

/** Silla vacía vs. silla con persona */
const SILLA_VACIA  = '#3d3028';
const SILLA_LLENA  = '#7a5c40';
const SILLA_STROKE = '#251a10';

/** SVG de una silla individual (pequeño rectángulo con respaldo) */
function Silla({ x, y, angle, llena }: { x: number; y: number; angle: number; llena: boolean }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      {/* Asiento */}
      <rect x="-7" y="-5" width="14" height="9" rx="2" fill={llena ? SILLA_LLENA : SILLA_VACIA} stroke={SILLA_STROKE} strokeWidth="1" />
      {/* Respaldo */}
      <rect x="-6" y="-9" width="12" height="5" rx="2" fill={llena ? SILLA_LLENA : SILLA_VACIA} stroke={SILLA_STROKE} strokeWidth="1" opacity="0.8" />
    </g>
  );
}

/** Distribuye sillas en los 4 lados de una mesa cuadrada (80×80, centrada en 0,0) */
function SillasCuadrada({ count, llena }: { count: number; llena: boolean }) {
  const MARGEN = 54;
  const sillas: React.ReactElement[] = [];

  // top: 2 sillas centradas
  const top    = Math.min(2, Math.ceil(count / 4));
  // bottom: 2
  const bottom = Math.min(2, Math.floor(count / 4) + (count % 4 > 2 ? 1 : 0));
  // left: 1
  const left   = Math.min(1, count > 4 ? 1 : 0);
  // right: 1
  const right  = Math.min(1, count > 5 ? 1 : 0);

  const distribucion = [top, bottom, left, right];
  const configs = [
    { angle: 0,   axis: 'x', y: -MARGEN, spacingX: 18 },  // top
    { angle: 180, axis: 'x', y:  MARGEN, spacingX: 18 },  // bottom
    { angle: 90,  axis: 'y', x: -MARGEN, spacingY: 18 },  // left
    { angle: -90, axis: 'y', x:  MARGEN, spacingY: 18 },  // right
  ];

  distribucion.forEach((n, lado) => {
    for (let i = 0; i < n; i++) {
      const cfg = configs[lado];
      const offset = (i - (n - 1) / 2) * 20;
      const sx = cfg.axis === 'x' ? offset : (cfg.x ?? 0);
      const sy = cfg.axis === 'x' ? (cfg.y ?? 0) : offset;
      sillas.push(
        <Silla key={`${lado}-${i}`} x={sx} y={sy} angle={cfg.angle} llena={llena} />
      );
    }
  });

  return <>{sillas}</>;
}

/** Distribuye sillas en los lados largo/corto de una mesa rectangular (124×72, centrada en 0,0) */
function SillasRectangular({ count, llena }: { count: number; llena: boolean }) {
  const sillas: React.ReactElement[] = [];
  // Lado largo (top/bottom): hasta 3 c/u; lado corto (left/right): 1 c/u
  const topN    = Math.min(3, Math.ceil(count / 2));
  const bottomN = Math.min(3, Math.floor(count / 2));
  const leftN   = count > 6 ? 1 : 0;
  const rightN  = count > 7 ? 1 : 0;

  const layouts = [
    { n: topN,    y: -50, angle: 0,    spacingX: 22 },
    { n: bottomN, y:  50, angle: 180,  spacingX: 22 },
    { n: leftN,   x: -72, angle: 90,   spacingY: 0  },
    { n: rightN,  x:  72, angle: -90,  spacingY: 0  },
  ];

  layouts.forEach(({ n, y, x, angle, spacingX }, lado) => {
    for (let i = 0; i < n; i++) {
      const offset = (i - (n - 1) / 2) * (spacingX ?? 20);
      const sx = x !== undefined ? x : offset;
      const sy = y !== undefined ? y : 0;
      sillas.push(
        <Silla key={`${lado}-${i}`} x={sx} y={sy} angle={angle} llena={llena} />
      );
    }
  });

  return <>{sillas}</>;
}

/** Distribuye sillas radialmente alrededor de un círculo (r=40, centrado en 0,0) */
function SillasCircular({ count, llena }: { count: number; llena: boolean }) {
  const r = 56; // radio de posición de sillas (exterior al círculo)
  const sillas: React.ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i - 90; // empieza desde arriba
    const rad   = (angle * Math.PI) / 180;
    const sx    = r * Math.cos(rad);
    const sy    = r * Math.sin(rad);
    sillas.push(
      <Silla key={i} x={sx} y={sy} angle={angle + 90} llena={llena} />
    );
  }
  return <>{sillas}</>;
}

/**
 * MesaChairs — Sillas SVG distribuidas alrededor de la mesa.
 * La forma se determina desde capacidad, igual que MesaShape.
 * Si capacidad > 12, muestra badge +N en lugar de sillas extra.
 */
export const MesaChairs = memo(function MesaChairs({ capacidad, estado }: MesaChairsProps) {
  const forma  = getFormaVisual(capacidad);
  const llena  = ESTADOS_CON_PERSONAS.has(estado);
  const maxSillas = 12;
  const count  = Math.min(capacidad, maxSillas);
  const extras = capacidad - maxSillas;

  // Dimensiones del SVG según forma (deben coincidir con MesaShape)
  const { w, h } = forma === 'rectangular'
    ? { w: 200, h: 160 }
    : { w: 160, h: 160 };

  const cx = w / 2;
  const cy = h / 2;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform={`translate(${cx},${cy})`}>
        {forma === 'cuadrada'    && <SillasCuadrada    count={count} llena={llena} />}
        {forma === 'rectangular' && <SillasRectangular count={count} llena={llena} />}
        {forma === 'circular'    && <SillasCircular    count={count} llena={llena} />}

        {/* Badge de exceso de capacidad */}
        {extras > 0 && (
          <g>
            <circle cx="36" cy="-36" r="12" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <text x="36" y="-32" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="bold">
              +{extras}
            </text>
          </g>
        )}
      </g>
    </svg>
  );
});
