// Piezas de interfaz que imitan apps/vase-management (glass-panel, page-title en Newsreader, metric-card,
// tablas con encabezado en mayusculas, badges redondeados, toasts abajo a la derecha).
// Todo esta escalado ~2x para que se lea en un celular (textos >= 26 px).
import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, MONO, SERIF } from './theme';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const useSpring = (delay = 0, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.7 } });
};

export const fade = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], clamp);
// Temblor corto (n cuadros) a partir de `at`
export const shake = (frame: number, at: number, n = 10, amp = 12) =>
  frame >= at && frame < at + n ? Math.sin((frame - at) * 2.6) * amp * (1 - (frame - at) / n) : 0;
// Pulso 0..1 que late `times` veces desde `at`
export const pulse = (frame: number, at: number, period = 10, times = 3) =>
  frame >= at && frame < at + period * times ? Math.sin(((frame - at) / period) * Math.PI) ** 2 : 0;

export const money = (n: number, dec = 2) =>
  '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

/* ---------- Iconos (trazos estilo lucide) ---------- */
const PATHS: Record<string, React.ReactNode> = {
  bell: (<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>),
  search: (<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>),
  check: <path d="M20 6 9 17l-5-5" />,
  x: (<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>),
  plus: (<><path d="M5 12h14" /><path d="M12 5v14" /></>),
  alert: (<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>),
  alertCircle: (<><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></>),
  checkCircle: (<><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>),
  trending: (<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>),
  wallet: (<><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>),
  file: (<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M16 13H8" /><path d="M16 17H8" /></>),
  users: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  globe: (<><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></>),
  cart: (<><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></>),
  box: (<><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>),
};
export const Icon: React.FC<{ name: keyof typeof PATHS; size?: number; color?: string; stroke?: number; style?: React.CSSProperties }> = ({ name, size = 32, color = 'currentColor', stroke = 2.2, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    {PATHS[name]}
  </svg>
);

/* ---------- Fondo: tinta azulada con brillo menta y grilla fina (como el body de la app) ---------- */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 800px at ${30 + Math.sin(frame / 70) * 6}% 18%, rgba(79,224,168,0.20), transparent 70%), radial-gradient(800px 700px at 90% 85%, rgba(0,107,67,0.35), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          backgroundPosition: `0 ${-frame * 0.6}px`,
        }}
      />
    </AbsoluteFill>
  );
};

/* ---------- Ventana de la app: barra oscura (sidebar) + lienzo claro ---------- */
export const BrandMark: React.FC<{ section: string }> = ({ section }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
    <div style={{ width: 60, height: 60, borderRadius: 18, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px -14px rgba(24,195,126,.8)' }}>
      <Img src={staticFile('vase-logo.png')} style={{ width: 34, filter: 'invert(1) brightness(2)' }} />
    </div>
    <div>
      <div style={{ color: '#e6efe9', fontSize: 28, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}>Vase Management</div>
      <div style={{ color: 'rgba(230,239,233,0.55)', fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>{section}</div>
    </div>
  </div>
);

export const AppWindow: React.FC<{
  section: string;
  children: React.ReactNode;
  bell?: number; // cuadro en que suena la campana
  badge?: number; // numero en la campana
  zoom?: number;
  side?: number; // margen lateral de la ventana
  pad?: number; // padding horizontal del lienzo
}> = ({ section, children, bell = -99, badge, zoom = 1, side = 28, pad = 32 }) => {
  const frame = useCurrentFrame();
  const s = useSpring(0, 16);
  const ring = frame >= bell && frame < bell + 18 ? Math.sin((frame - bell) * 1.6) * 22 * (1 - (frame - bell) / 18) : 0;
  return (
    <div
      style={{
        position: 'absolute',
        top: 130,
        left: side,
        right: side,
        height: 1110,
        borderRadius: 40,
        overflow: 'hidden',
        background: C.bg,
        boxShadow: '0 60px 140px rgba(0,0,0,0.6), 0 0 0 2px rgba(79,224,168,0.22)',
        fontFamily: FONT,
        color: C.fg,
        opacity: s,
        transform: `translateY(${(1 - s) * 160}px) scale(${(0.94 + s * 0.06) * zoom})`,
      }}
    >
      <div style={{ height: 104, background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', borderBottom: `1px solid ${C.inkLine}` }}>
        <BrandMark section={section} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative', width: 60, height: 60, borderRadius: 16, background: C.ink2, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${ring}deg)` }}>
            <Icon name="bell" size={32} color="#e6efe9" />
            {badge ? (
              <div style={{ position: 'absolute', top: -6, right: -6, minWidth: 30, height: 30, borderRadius: 15, background: '#ef4444', color: '#fff', fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{badge}</div>
            ) : null}
          </div>
          <div style={{ width: 60, height: 60, borderRadius: 30, background: 'rgba(79,224,168,0.15)', border: '2px solid rgba(79,224,168,0.35)', color: C.mint, fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>M</div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 104,
          left: 0,
          right: 0,
          bottom: 0,
          padding: `34px ${pad}px`,
          backgroundImage: `radial-gradient(circle at 10% -10%, rgba(0,107,67,0.08), transparent 520px), linear-gradient(rgba(15,23,42,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.025) 1px, transparent 1px)`,
          backgroundSize: 'auto, 40px 40px, 40px 40px',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const PageHeader: React.FC<{ title: string; subtitle: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => {
  const a = useSpring(3, 15);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26, opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>
      <div>
        <div style={{ fontFamily: SERIF, fontSize: 62, fontWeight: 600, lineHeight: 1, letterSpacing: -1, color: C.fg }}>{title}</div>
        <div style={{ marginTop: 10, fontSize: 26, fontWeight: 600, color: C.muted }}>{subtitle}</div>
      </div>
      {right}
    </div>
  );
};

export const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 28, boxShadow: '0 18px 60px -30px rgba(16,55,35,.35), 0 0 0 1px rgba(15,23,42,0.06)', ...style }}>{children}</div>
);

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
const TONES: Record<Tone, { bg: string; fg: string; bd: string }> = {
  success: { bg: 'rgba(0,107,67,0.10)', fg: C.primary, bd: 'rgba(0,107,67,0.22)' },
  warning: { bg: C.amberSoft, fg: C.amber, bd: 'rgba(194,65,12,0.22)' },
  danger: { bg: C.redSoft, fg: C.red, bd: 'rgba(239,68,68,0.28)' },
  info: { bg: 'rgba(16,185,129,0.12)', fg: '#065f46', bd: 'rgba(16,185,129,0.25)' },
  neutral: { bg: C.surface, fg: C.muted, bd: C.border },
};
export const Badge: React.FC<{ tone: Tone; children: React.ReactNode; style?: React.CSSProperties }> = ({ tone, children, style }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, border: `1.5px solid ${TONES[tone].bd}`, background: TONES[tone].bg, color: TONES[tone].fg, fontSize: 26, fontWeight: 700, whiteSpace: 'nowrap', ...style }}>
    {children}
  </span>
);

/* Tarjeta de metrica (metric-card / warehouse-kpi) */
export const Kpi: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: keyof typeof PATHS;
  tone: Tone;
  delay?: number;
  glow?: number; // 0..1 resaltado
  style?: React.CSSProperties;
  valueSize?: number;
}> = ({ label, value, sub, icon, tone, delay = 0, glow = 0, style, valueSize = 46 }) => {
  const a = useSpring(delay, 14);
  const t = TONES[tone];
  return (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 26,
        padding: '22px 24px',
        border: `2px solid ${glow > 0.01 ? t.fg : 'rgba(15,23,42,0.07)'}`,
        boxShadow: `0 18px 48px -36px rgba(0,0,0,.55), 0 0 ${glow * 50}px ${glow * 6}px ${t.bg}`,
        opacity: a,
        transform: `translateY(${(1 - a) * 40}px) scale(${1 + glow * 0.04})`,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: t.bg, border: `1.5px solid ${t.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={28} color={t.fg} />
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.muted, lineHeight: 1.15 }}>{label}</div>
      </div>
      <div style={{ marginTop: 14, fontSize: valueSize, fontWeight: 800, letterSpacing: -1, color: C.fg, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</div>
      {sub ? <div style={{ marginTop: 4, fontSize: 26, fontWeight: 600, color: C.muted }}>{sub}</div> : null}
    </div>
  );
};

/* Toast (components/ui/Toaster.tsx: abajo a la derecha, borde segun tipo) */
export const Toast: React.FC<{ at: number; type: 'success' | 'error'; title: string; desc: string; until?: number; top?: number }> = ({ at, type, title, desc, until = 9999, top = 1110 }) => {
  const frame = useCurrentFrame();
  const a = useSpring(at, 13);
  const out = fade(frame, until, until + 6);
  if (frame < at) return null;
  const ok = type === 'success';
  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        right: 90,
        top,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: '24px 30px',
        borderRadius: 26,
        background: '#fff',
        border: `3px solid ${ok ? 'rgba(0,107,67,0.45)' : 'rgba(196,31,31,0.55)'}`,
        boxShadow: `0 30px 80px -20px rgba(0,0,0,0.55), 0 0 0 8px ${ok ? 'rgba(79,224,168,0.25)' : 'rgba(239,68,68,0.22)'}`,
        fontFamily: FONT,
        opacity: a * (1 - out),
        transform: `translateY(${(1 - a) * 120 + out * 40}px)`,
        zIndex: 50,
      }}
    >
      <Icon name={ok ? 'checkCircle' : 'alertCircle'} size={52} color={ok ? C.green : '#ef4444'} />
      <div>
        <div style={{ fontSize: 34, fontWeight: 800, color: C.fg }}>{title}</div>
        <div style={{ fontSize: 28, fontWeight: 600, color: C.muted, fontFamily: ok ? MONO : FONT }}>{desc}</div>
      </div>
    </div>
  );
};

/* Puntero del mouse que viaja y hace clic */
export const Cursor: React.FC<{ path: { f: number; x: number; y: number }[]; clicks?: number[] }> = ({ path, clicks = [] }) => {
  const frame = useCurrentFrame();
  const fs = path.map((p) => p.f);
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const x = interpolate(frame, fs, path.map((p) => p.x), { ...clamp, easing: ease });
  const y = interpolate(frame, fs, path.map((p) => p.y), { ...clamp, easing: ease });
  const press = clicks.some((c) => frame >= c && frame < c + 4);
  const ripple = clicks.map((c) => frame - c).filter((d) => d >= 0 && d < 14)[0];
  return (
    <>
      {ripple !== undefined && (
        <div style={{ position: 'absolute', left: x - 50, top: y - 50, width: 100, height: 100, borderRadius: 50, border: `5px solid ${C.mint}`, opacity: 1 - ripple / 14, transform: `scale(${0.4 + ripple / 10})`, zIndex: 80 }} />
      )}
      <svg width={54} height={54} viewBox="0 0 24 24" style={{ position: 'absolute', left: x - 6, top: y - 4, transform: `scale(${press ? 0.85 : 1})`, zIndex: 81, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))' }}>
        <path d="M4 2 L4 20 L9 15.5 L12.5 22.5 L15.5 21 L12 14 L19 14 Z" fill="#0f172a" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </>
  );
};
