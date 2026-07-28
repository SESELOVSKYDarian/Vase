// Canvas arquitectónico del restaurante: mesas posicionadas absolutamente sobre un plano SVG.
'use client';

import { useRef, useEffect, useState, useCallback, memo, useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Move } from 'lucide-react';
import { MesaCard } from './MesaCard';
import { MesaSelectionToolbar } from './MesaSelectionToolbar';
import { getFormaVisual } from './mesaEstadoColors';
import { useMesasStore } from '@/store/mesasStore';
import type { Mesa, MesaGestureCallbacks } from '@/types/mesa';

/** Una mesa es elegible para unión si no forma parte ya de un grupo unido. */
function esElegibleParaUnir(mesa: Mesa): boolean {
  return !mesa.mesasUnidas || mesa.mesasUnidas.length === 0;
}

// ── Dimensiones del canvas ────────────────────────────────────────────────────
const CANVAS_W = 1600;
const CANVAS_H = 870;

// ── Definición de zonas sobre el canvas ──────────────────────────────────────
interface ZoneArea {
  id:       string;
  label:    string;
  x:        number;
  y:        number;
  w:        number;
  h:        number;
  outdoor?: boolean;
  service?: boolean;
}

const ZONE_AREAS: ZoneArea[] = [
  { id: 'TERRAZA EXTERIOR', label: 'TERRAZA EXTERIOR', x: 0,    y: 0,   w: 1600, h: 220, outdoor: true },
  { id: 'SALÓN PRINCIPAL',  label: 'SALÓN PRINCIPAL',  x: 0,    y: 220, w: 1120, h: 480 },
  { id: 'BAR',              label: 'BAR',              x: 1120, y: 220, w: 480,  h: 310 },
  { id: 'ZONA COCINA',      label: 'ZONA COCINA',      x: 1120, y: 530, w: 480,  h: 170, service: true },
  { id: 'ZONA SOFÁS',       label: 'ZONA SOFÁS',       x: 0,    y: 700, w: 620,  h: 170 },
];

const FALLBACK_ZONE = ZONE_AREAS[1]; // SALÓN PRINCIPAL como fallback

// ── Cálculo de posición por defecto en grilla dentro de la zona ───────────────
const SPACING_X = 205;
const SPACING_Y = 215;
const PAD_X     = 70;
const PAD_Y     = 40;

/** Quita acentos y normaliza a minúsculas para comparaciones robustas */
function stripped(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Normaliza el nombre de zona: ignora mayúsculas/minúsculas y acentos.
 * Si no hay coincidencia, retorna FALLBACK_ZONE.id para que todas las mesas
 * desconocidas queden en un mismo grupo con posiciones secuenciales.
 */
function normalizeZoneId(zona: string | undefined): string {
  if (!zona) return FALLBACK_ZONE.id;
  const match = ZONE_AREAS.find((z) => stripped(z.id) === stripped(zona));
  return match?.id ?? FALLBACK_ZONE.id;
}

function computeDefaultPositions(mesas: Mesa[]): Map<string, { x: number; y: number }> {
  // Agrupar por zona normalizada — evita que cada mesa desconocida tenga su
  // propio grupo y caiga en la misma posición fallback (idx=0 de todas).
  const byZone = new Map<string, Mesa[]>();
  for (const m of mesas) {
    const zoneId = normalizeZoneId(m.zona);
    const list   = byZone.get(zoneId) ?? [];
    list.push(m);
    byZone.set(zoneId, list);
  }

  const positions = new Map<string, { x: number; y: number }>();

  for (const [zoneId, zoneMesas] of byZone) {
    const zone = ZONE_AREAS.find((z) => z.id === zoneId) ?? FALLBACK_ZONE;
    const cols = Math.max(1, Math.floor((zone.w - PAD_X * 2) / SPACING_X));

    zoneMesas.forEach((mesa, idx) => {
      // Usar posición guardada solo si es significativamente distinta del origen
      // (threshold > 50 para ignorar valores residuales del DB como pos_x=1)
      if (mesa.posicion.x > 50 || mesa.posicion.y > 50) {
        positions.set(mesa.id, mesa.posicion);
        return;
      }
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      positions.set(mesa.id, {
        x: zone.x + PAD_X + col * SPACING_X,
        y: zone.y + PAD_Y + row * SPACING_Y,
      });
    });
  }

  return positions;
}

// ── Tamaño del contenedor para calcular centros de conexión ──────────────────
function localGetContenedorSize(capacidad: number): { w: number; h: number } {
  return getFormaVisual(capacidad) === 'rectangular' ? { w: 200, h: 160 } : { w: 160, h: 160 };
}

// ── Gestos vacíos para modo edición ──────────────────────────────────────────
const NOOP_GESTURES: MesaGestureCallbacks = {
  onTap: () => {},
  onDoubleTap: () => {},
  onLongPress: () => {},
  onSwipe: () => {},
};

// ── Props del componente ──────────────────────────────────────────────────────
interface MesasCanvasLayoutProps {
  mesas:                 Mesa[];
  mesasSeleccionadas:    string[];
  mergeSelectedIds:      string[];
  isSelectionMode:       boolean;
  mozoRequeridoIds:      Set<string>;
  gestures:              MesaGestureCallbacks;
  onDelete:              (id: string) => void;
  onToggleSelectionMode: () => void;
}

export const MesasCanvasLayout = memo(function MesasCanvasLayout({
  mesas,
  mesasSeleccionadas,
  mergeSelectedIds,
  isSelectionMode,
  mozoRequeridoIds,
  gestures,
  onDelete,
  onToggleSelectionMode,
}: MesasCanvasLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale]       = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [resetting, setResetting] = useState(false);
  const moverMesa = useMesasStore((s) => s.moverMesa);

  // Escala responsive: ajusta el canvas al ancho del contenedor
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setScale(Math.min(1, w / CANVAS_W));
      }
    };
    update();
    const obs = new ResizeObserver(update);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Posiciones calculadas (se recalculan solo si cambian las mesas)
  const positions = useMemo(() => computeDefaultPositions(mesas), [mesas]);

  // Números de mesas unidas por cada mesa (para mostrar badge combinado)
  const getMesasUnidasNums = useCallback((mesa: Mesa): number[] => {
    if (!mesa.mesasUnidas || mesa.mesasUnidas.length === 0) return [];
    return mesa.mesasUnidas
      .map((id) => mesas.find((m) => m.id === id)?.numero ?? 0)
      .filter((n) => n > 0);
  }, [mesas]);

  // Líneas SVG conectoras entre mesas unidas (sin duplicados)
  const connectorLines = useMemo((): ReactNode[] => {
    const drawn = new Set<string>();
    const lines: ReactNode[] = [];

    for (const mesa of mesas) {
      if (!mesa.mesasUnidas || mesa.mesasUnidas.length === 0) continue;
      const pos1 = positions.get(mesa.id);
      if (!pos1) continue;
      const { w: w1, h: h1 } = localGetContenedorSize(mesa.capacidad);
      const cx1 = pos1.x + w1 / 2;
      const cy1 = pos1.y + h1 / 2;

      for (const otherId of mesa.mesasUnidas) {
        const pairKey = [mesa.id, otherId].sort().join('|');
        if (drawn.has(pairKey)) continue;
        drawn.add(pairKey);

        const other = mesas.find((m) => m.id === otherId);
        if (!other) continue;
        const pos2 = positions.get(otherId);
        if (!pos2) continue;
        const { w: w2, h: h2 } = localGetContenedorSize(other.capacidad);
        const cx2 = pos2.x + w2 / 2;
        const cy2 = pos2.y + h2 / 2;
        const mx = (cx1 + cx2) / 2;
        const my = (cy1 + cy2) / 2;

        lines.push(
          <g key={pairKey}>
            {/* Halo suave */}
            <line x1={cx1} y1={cy1} x2={cx2} y2={cy2}
              stroke="#d97706" strokeWidth="10" strokeOpacity="0.1" strokeLinecap="round" />
            {/* Línea punteada principal */}
            <line x1={cx1} y1={cy1} x2={cx2} y2={cy2}
              stroke="#d97706" strokeWidth="2" strokeDasharray="14 7"
              strokeOpacity="0.75" strokeLinecap="round" />
            {/* Ícono de enlace en el medio */}
            <circle cx={mx} cy={my} r={9} fill="#0f0f0f" stroke="#d97706" strokeWidth="1.5" opacity="0.9" />
            <line x1={mx - 4} y1={my} x2={mx + 4} y2={my} stroke="#d97706" strokeWidth="2" opacity="0.9" />
            <circle cx={mx - 4} cy={my} r={2} fill="#d97706" opacity="0.9" />
            <circle cx={mx + 4} cy={my} r={2} fill="#d97706" opacity="0.9" />
          </g>
        );
      }
    }
    return lines;
  }, [mesas, positions]);

  const handleDragEnd = useCallback(
    (mesaId: string, origPos: { x: number; y: number }, offsetX: number, offsetY: number) => {
      const newX = Math.max(8, Math.min(CANVAS_W - 200, origPos.x + offsetX));
      const newY = Math.max(8, Math.min(CANVAS_H - 200, origPos.y + offsetY));
      moverMesa(mesaId, { x: newX, y: newY });
    },
    [moverMesa]
  );

  // Restablece todas las posiciones a 0 → computeDefaultPositions las recalcula
  const handleResetPositions = useCallback(async () => {
    setResetting(true);
    try {
      await Promise.all(mesas.map((m) => moverMesa(m.id, { x: 0, y: 0 })));
    } finally {
      setResetting(false);
    }
  }, [mesas, moverMesa]);

  // Hay algo que restablecer si alguna mesa tiene posición personalizada guardada
  const canReset = useMemo(
    () => mesas.some((m) => m.posicion.x > 50 || m.posicion.y > 50),
    [mesas]
  );

  return (
    <div className="space-y-2">
      {/* Toolbar del plano — 3 acciones centradas */}
      <MesaSelectionToolbar
        mesaCount={mesas.length}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={onToggleSelectionMode}
        editMode={editMode}
        onToggleEditMode={() => setEditMode((v) => !v)}
        onReset={handleResetPositions}
        resetting={resetting}
        canReset={canReset}
      />

      {/* Canvas wrapper — escala responsive */}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          height:     CANVAS_H * scale,
          background: '#080808',
          border:     '1px solid #1a1a1a',
        }}
      >
        <div
          style={{
            width:           CANVAS_W,
            height:          CANVAS_H,
            transform:       `scale(${scale})`,
            transformOrigin: 'top left',
            position:        'relative',
          }}
        >
          {/* Plano SVG de fondo */}
          <FloorPlanSVG />

          {/* Líneas conectoras entre mesas unidas */}
          {connectorLines.length > 0 && (
            <svg
              width={CANVAS_W}
              height={CANVAS_H}
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 1 }}
            >
              {connectorLines}
            </svg>
          )}

          {/* Mesas posicionadas absolutamente */}
          {mesas.map((mesa) => {
            const pos = positions.get(mesa.id) ?? { x: 60, y: 260 };

            return (
              <motion.div
                key={mesa.id}
                drag={editMode}
                dragMomentum={false}
                dragElastic={0}
                onDragEnd={(_, info) =>
                  handleDragEnd(mesa.id, pos, info.offset.x, info.offset.y)
                }
                style={{
                  position: 'absolute',
                  left:     pos.x,
                  top:      pos.y,
                  cursor:   editMode ? 'grab' : 'default',
                  zIndex:   editMode ? 10 : 1,
                  touchAction: editMode ? 'none' : 'auto',
                }}
                whileDrag={{ scale: 1.06, zIndex: 20, cursor: 'grabbing' }}
              >
                <MesaCard
                  mesa={mesa}
                  isSelected={mesasSeleccionadas.includes(mesa.id)}
                  isMergeMode={isSelectionMode && !editMode}
                  isMergeSelected={mergeSelectedIds.includes(mesa.id)}
                  isSelectable={esElegibleParaUnir(mesa)}
                  isMozoRequerido={mozoRequeridoIds.has(mesa.id)}
                  mesasUnidasNums={getMesasUnidasNums(mesa)}
                  gestures={editMode ? NOOP_GESTURES : gestures}
                  onDelete={onDelete}
                />
              </motion.div>
            );
          })}

          {/* Overlay de modo edición */}
          {editMode && (
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none"
              style={{ zIndex: 30 }}
            >
              <div className="flex items-center gap-2 bg-amber-600/20 border border-amber-500/40 rounded-full px-4 py-1.5">
                <Move size={11} className="text-amber-400" />
                <span className="text-amber-400 text-xs font-semibold">
                  Arrastrá las mesas para reposicionarlas
                </span>
              </div>
            </div>
          )}

          {/* Modo selección de unión — banner indicador sobre las mesas */}
          {isSelectionMode && !editMode && (
            <div
              className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none"
              style={{ zIndex: 30 }}
            >
              <div className="flex items-center gap-2.5 bg-[#0d0d0d] border border-amber-500/60 rounded-2xl px-5 py-3 shadow-xl shadow-black/60">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 text-sm font-black">✓</span>
                </div>
                <div>
                  <p className="text-white text-sm font-bold leading-tight">
                    Modo selección: elegí las mesas a unir
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Tocá 2 o más mesas · las mesas ya unidas no se pueden seleccionar
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Plano SVG de fondo ────────────────────────────────────────────────────────
function FloorPlanSVG() {
  return (
    <svg
      width={CANVAS_W}
      height={CANVAS_H}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      className="absolute inset-0"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <defs>
        {/* Trama diagonal para terraza exterior */}
        <pattern id="terraza-hatch" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="24" stroke="rgba(255,255,255,0.018)" strokeWidth="10" />
        </pattern>

        {/* Trama de cocina */}
        <pattern id="cocina-hatch" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 14 L14 0" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
          <path d="M-7 7 L7 -7" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
          <path d="M7 21 L21 7" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
        </pattern>

        {/* Sombra de pared */}
        <filter id="wall-shadow">
          <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* ── Rellenos de zona ─────────────────────────────────────────────── */}

      {/* Terraza (exterior) */}
      <rect x={0} y={0} width={1600} height={220} fill="url(#terraza-hatch)" />
      <rect x={0} y={0} width={1600} height={220} fill="rgba(56,189,248,0.012)" />

      {/* Salón principal */}
      <rect x={0} y={220} width={1120} height={480} fill="rgba(255,255,255,0.008)" />

      {/* Bar */}
      <rect x={1120} y={220} width={480} height={310} fill="rgba(217,119,6,0.025)" />

      {/* Zona cocina (servicio — sin acceso) */}
      <rect x={1120} y={530} width={480} height={170} fill="rgba(0,0,0,0.45)" />
      <rect x={1120} y={530} width={480} height={170} fill="url(#cocina-hatch)" />

      {/* Zona sofás */}
      <rect x={0} y={700} width={620} height={170} fill="rgba(139,92,246,0.018)" />

      {/* ── Paredes exteriores ────────────────────────────────────────────── */}

      {/* Pared superior */}
      <line x1={0} y1={0} x2={1600} y2={0} stroke="#3f3f46" strokeWidth={5} />
      {/* Pared izquierda */}
      <line x1={0} y1={0} x2={0} y2={870} stroke="#3f3f46" strokeWidth={5} />
      {/* Pared derecha */}
      <line x1={1600} y1={0} x2={1600} y2={870} stroke="#3f3f46" strokeWidth={5} />
      {/* Pared inferior — con hueco de entrada */}
      <line x1={0} y1={870} x2={680} y2={870} stroke="#3f3f46" strokeWidth={5} />
      <line x1={820} y1={870} x2={1600} y2={870} stroke="#3f3f46" strokeWidth={5} />

      {/* ── Divisores internos ───────────────────────────────────────────── */}

      {/* Terraza / interior — línea punteada */}
      <line x1={0} y1={220} x2={1600} y2={220} stroke="#3f3f46" strokeWidth={2} strokeDasharray="10 5" />

      {/* Salón / BAR+COCINA vertical */}
      <line x1={1120} y1={220} x2={1120} y2={700} stroke="#3f3f46" strokeWidth={3} />

      {/* BAR / COCINA horizontal */}
      <line x1={1120} y1={530} x2={1600} y2={530} stroke="#3f3f46" strokeWidth={2.5} />

      {/* Sofás / salón sur */}
      <line x1={620} y1={700} x2={620} y2={870} stroke="#2d2d2d" strokeWidth={1.5} />
      <line x1={0} y1={700} x2={1120} y2={700} stroke="#2d2d2d" strokeWidth={1.5} strokeDasharray="6 4" />

      {/* ── Columnas estructurales ───────────────────────────────────────── */}
      {[
        [0, 220], [1120, 220], [1600, 220],
        [0, 700], [620, 700], [1120, 700],
      ].map(([cx, cy], i) => (
        <g key={i} transform={`translate(${cx}, ${cy})`}>
          <rect x={-8} y={-8} width={16} height={16} fill="#1a1a1a" stroke="#52525b" strokeWidth={1.5} />
        </g>
      ))}

      {/* ── Etiqueta de terraza ───────────────────────────────────────────── */}
      <text
        x={800} y={130}
        textAnchor="middle" fill="#2a2a2a"
        fontFamily="monospace" fontSize={13}
        letterSpacing={8} fontWeight={600}
      >
        TERRAZA EXTERIOR
      </text>
      {/* Línea decorativa bajo etiqueta terraza */}
      <line x1={600} y1={140} x2={1000} y2={140} stroke="#2a2a2a" strokeWidth={0.8} />

      {/* ── Etiqueta salón principal ─────────────────────────────────────── */}
      <text
        x={560} y={688}
        textAnchor="middle" fill="#2a2a2a"
        fontFamily="monospace" fontSize={10}
        letterSpacing={5}
      >
        SALÓN PRINCIPAL
      </text>

      {/* ── Etiqueta BAR ─────────────────────────────────────────────────── */}
      {/* Mostrador del bar */}
      <rect x={1140} y={480} width={440} height={18} rx={4} fill="#1a1a1a" stroke="#3f3f46" strokeWidth={1} />
      <text
        x={1360} y={510}
        textAnchor="middle" fill="#2a2a2a"
        fontFamily="monospace" fontSize={10}
        letterSpacing={5}
      >
        BAR
      </text>

      {/* ── Etiqueta ZONA COCINA ─────────────────────────────────────────── */}
      {/* Ícono de cocina */}
      <rect x={1230} y={570} width={260} height={100} rx={6} fill="#111" stroke="#2a2a2a" strokeWidth={1} />
      <text
        x={1360} y={612}
        textAnchor="middle" fill="#2a2a2a"
        fontFamily="monospace" fontSize={10}
        letterSpacing={4}
      >
        ZONA COCINA
      </text>
      <text
        x={1360} y={632}
        textAnchor="middle" fill="#222222"
        fontFamily="monospace" fontSize={8}
        letterSpacing={3}
      >
        (servicio)
      </text>

      {/* ── Etiqueta ZONA SOFÁS ──────────────────────────────────────────── */}
      <text
        x={310} y={858}
        textAnchor="middle" fill="#2a2a2a"
        fontFamily="monospace" fontSize={10}
        letterSpacing={5}
      >
        ZONA SOFÁS
      </text>

      {/* ── Indicador de entrada ─────────────────────────────────────────── */}
      {/* Arco de puerta */}
      <path
        d="M 680 870 Q 750 820 820 870"
        fill="none" stroke="#52525b" strokeWidth={1.5} strokeDasharray="5 3"
      />
      <text
        x={750} y={855}
        textAnchor="middle" fill="#3f3f46"
        fontFamily="monospace" fontSize={9}
        letterSpacing={4}
      >
        ENTRADA
      </text>
      {/* Flechas de entrada */}
      <line x1={750} y1={862} x2={750} y2={840} stroke="#3f3f46" strokeWidth={1} />
      <polygon points="750,870 745,862 755,862" fill="#3f3f46" opacity={0.6} />

      {/* ── Ventanas en terraza ───────────────────────────────────────────── */}
      {[120, 420, 720, 1020, 1320].map((wx) => (
        <g key={wx}>
          <rect x={wx} y={0} width={80} height={8} fill="#1e293b" stroke="#334155" strokeWidth={1} />
          <line x1={wx + 40} y1={0} x2={wx + 40} y2={8} stroke="#334155" strokeWidth={0.8} />
        </g>
      ))}

      {/* ── Barra de escala ──────────────────────────────────────────────── */}
      <g transform="translate(28, 845)" opacity={0.4}>
        <line x1={0} y1={0} x2={80} y2={0} stroke="#52525b" strokeWidth={1} />
        <line x1={0} y1={-4} x2={0} y2={4} stroke="#52525b" strokeWidth={1} />
        <line x1={80} y1={-4} x2={80} y2={4} stroke="#52525b" strokeWidth={1} />
        <text x={40} y={-7} textAnchor="middle" fill="#52525b" fontFamily="monospace" fontSize={7} letterSpacing={1}>
          ESC.
        </text>
      </g>

      {/* ── Norte indicador ──────────────────────────────────────────────── */}
      <g transform="translate(1555, 32)" opacity={0.4}>
        <circle cx={0} cy={0} r={14} fill="none" stroke="#52525b" strokeWidth={1} />
        <polygon points="0,-12 -5,4 0,1 5,4" fill="#52525b" />
        <text x={0} y={25} textAnchor="middle" fill="#52525b" fontFamily="monospace" fontSize={8}>N</text>
      </g>
    </svg>
  );
}
