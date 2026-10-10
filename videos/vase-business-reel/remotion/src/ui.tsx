import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from './theme';

export const useSpring = (delay = 0, damping = 14, durationInFrames?: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.7 }, durationInFrames });
};

// Fondo verde profundo con grilla sutil y un halo que se mueve lento.
export const Backdrop: React.FC<{ light?: boolean }> = ({ light }) => {
  const frame = useCurrentFrame();
  const x = 50 + Math.sin(frame / 40) * 18;
  const y = 35 + Math.cos(frame / 55) * 12;
  const base = light ? C.paper : C.ink;
  const grid = light ? 'rgba(6,20,13,0.05)' : 'rgba(71,224,152,0.07)';
  return (
    <AbsoluteFill style={{ background: base }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 900px at ${x}% ${y}%, ${light ? 'rgba(71,224,152,0.25)' : 'rgba(0,109,67,0.55)'}, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${grid} 2px, transparent 2px), linear-gradient(90deg, ${grid} 2px, transparent 2px)`,
          backgroundSize: '90px 90px',
          backgroundPosition: `0 ${frame * 0.6}px`,
        }}
      />
    </AbsoluteFill>
  );
};

// Titulo de escena: chip + titular grande, siempre en la zona segura superior del reel.
export const SceneTitle: React.FC<{ kicker: string; title: React.ReactNode; light?: boolean; delay?: number }> = ({
  kicker,
  title,
  light,
  delay = 0,
}) => {
  const s = useSpring(delay);
  const s2 = useSpring(delay + 5);
  return (
    <div style={{ position: 'absolute', top: 210, left: 80, right: 80, fontFamily: FONT }}>
      <div
        style={{
          display: 'inline-block',
          padding: '12px 26px',
          borderRadius: 999,
          background: light ? C.ink : C.neon,
          color: light ? C.neon : C.ink,
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: 3,
          textTransform: 'uppercase',
          transform: `translateY(${(1 - s) * 40}px)`,
          opacity: s,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          marginTop: 28,
          fontSize: 92,
          lineHeight: 1.02,
          fontWeight: 900,
          letterSpacing: -3,
          color: light ? C.ink : C.paper,
          transform: `translateY(${(1 - s2) * 60}px)`,
          opacity: s2,
        }}
      >
        {title}
      </div>
    </div>
  );
};

export const Accent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: C.neon }}>{children}</span>
);

// Ventana de "app" con barra superior, usada para mockups del panel.
export const AppWindow: React.FC<{
  children: React.ReactNode;
  top?: number;
  height?: number;
  label?: string;
  delay?: number;
}> = ({ children, top = 700, height = 900, label = 'business.vase.ar/admin', delay = 6 }) => {
  const s = useSpring(delay, 16);
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top,
        height,
        borderRadius: 36,
        background: '#fff',
        boxShadow: '0 60px 120px rgba(0,0,0,0.45), 0 0 0 2px rgba(71,224,152,0.35)',
        overflow: 'hidden',
        transform: `translateY(${(1 - s) * 260}px) scale(${0.9 + s * 0.1})`,
        opacity: s,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          height: 64,
          background: '#f1f4f2',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 26px',
          borderBottom: `2px solid ${C.line}`,
        }}
      >
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />
        ))}
        <div
          style={{
            marginLeft: 18,
            flex: 1,
            height: 38,
            borderRadius: 19,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            fontSize: 22,
            color: C.muted,
          }}
        >
          {label}
        </div>
      </div>
      <div style={{ position: 'relative', height: height - 64 }}>{children}</div>
    </div>
  );
};

export const fadeOut = (frame: number, end: number, len = 8) =>
  interpolate(frame, [end - len, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
