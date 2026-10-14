import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from './theme';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const useSpring = (delay = 0, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.7 } });
};

// Pulso al ritmo: 1 en cada negra (15 cuadros) y cae rapido.
export const useBeat = () => {
  const frame = useCurrentFrame();
  const p = (frame % 15) / 15;
  return Math.exp(-p * 6);
};

// Puntos fijos pseudoaleatorios (deterministas) para el campo "neuronal".
const DOTS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return { x: r(1) * 1080, y: r(2) * 1920, s: 3 + r(3) * 5, sp: 0.2 + r(4) * 0.6, ph: r(5) * 6.28 };
});

export const Backdrop: React.FC<{ light?: boolean }> = ({ light }) => {
  const frame = useCurrentFrame();
  const beat = useBeat();
  const pts = DOTS.map((d) => ({
    x: d.x + Math.sin(frame / 50 + d.ph) * 30,
    y: (d.y - frame * d.sp * 2 + 1920 * 4) % 1920,
    s: d.s,
  }));
  const lineColor = light ? 'rgba(59,99,61,0.18)' : 'rgba(168,230,169,0.14)';
  return (
    <AbsoluteFill style={{ background: light ? C.mist : C.carbon }}>
      <AbsoluteFill
        style={{
          background: light
            ? `radial-gradient(1000px 900px at 50% 30%, rgba(115,147,116,0.35), transparent 70%)`
            : `radial-gradient(1000px 1000px at 50% ${35 + Math.sin(frame / 60) * 8}%, rgba(59,99,61,${0.55 + beat * 0.12}), transparent 70%)`,
        }}
      />
      <svg width={1080} height={1920} style={{ position: 'absolute' }}>
        {pts.map((a, i) =>
          pts.slice(i + 1, i + 4).map((b, j) => {
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d > 260) return null;
            return <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={lineColor} strokeWidth={2} opacity={1 - d / 260} />;
          })
        )}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.s} fill={light ? C.sage : C.glow} opacity={light ? 0.35 : 0.35 + beat * 0.25} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

export const Title: React.FC<{ kicker: string; children: React.ReactNode; light?: boolean; top?: number }> = ({
  kicker,
  children,
  light,
  top = 200,
}) => {
  const a = useSpring(0, 13);
  const b = useSpring(4, 13);
  return (
    <div style={{ position: 'absolute', top, left: 80, right: 80, fontFamily: FONT }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 14,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: light ? C.jade : C.glow,
          opacity: a,
          transform: `translateX(${(1 - a) * -60}px)`,
        }}
      >
        <span style={{ width: 16, height: 16, borderRadius: 8, background: light ? C.jade : C.glow }} />
        {kicker}
      </div>
      <div
        style={{
          marginTop: 22,
          fontSize: 94,
          lineHeight: 1.0,
          fontWeight: 700,
          letterSpacing: -3,
          color: light ? C.ink : C.white,
          opacity: b,
          transform: `translateY(${(1 - b) * 70}px)`,
          // efecto de "escaneo" al entrar
          clipPath: `inset(0 ${(1 - b) * 100}% 0 0)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const Glow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: C.glow }}>{children}</span>
);

export const Bubble: React.FC<{
  side: 'in' | 'out';
  children: React.ReactNode;
  delay: number;
  color?: string;
}> = ({ side, children, delay, color }) => {
  const s = useSpring(delay, 13);
  const isOut = side === 'out';
  return (
    <div
      style={{
        alignSelf: isOut ? 'flex-end' : 'flex-start',
        maxWidth: '82%',
        padding: '22px 28px',
        borderRadius: 30,
        borderBottomRightRadius: isOut ? 8 : 30,
        borderBottomLeftRadius: isOut ? 30 : 8,
        background: isOut ? color || C.jade : '#ffffff',
        color: isOut ? C.white : C.ink,
        fontSize: 34,
        lineHeight: 1.3,
        fontWeight: 500,
        opacity: s,
        transform: `translateY(${(1 - s) * 40}px) scale(${0.9 + s * 0.1})`,
        transformOrigin: isOut ? 'right bottom' : 'left bottom',
        boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
      }}
    >
      {children}
    </div>
  );
};

export const Typing: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  return (
    <div style={{ alignSelf: 'flex-start', padding: '24px 30px', borderRadius: 30, background: '#fff', display: 'flex', gap: 10 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            background: C.sage,
            transform: `translateY(${Math.sin((frame - from) / 3 - i) * 6}px)`,
          }}
        />
      ))}
    </div>
  );
};

export const fade = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], clamp);
