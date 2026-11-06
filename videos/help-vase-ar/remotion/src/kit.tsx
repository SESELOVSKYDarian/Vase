// Kit de los videos de help.vase.ar: réplica del panel nuevo (tema oscuro), cursor, cámara, subtítulos,
// apertura y cierre. Todo el panel se dibuja en un lienzo de 1440×810 y se escala a 1920×1080, así las
// coordenadas del cursor son las mismas que las de los elementos.
import React from 'react';
import { AbsoluteFill, Easing, Img, getInputProps, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Manrope';

const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin'] });
export const FONT = fontFamily;

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const PW = 1440;
export const PH = 810;
const K = W / PW;

// Tema: `--props='{"theme":"light"}'` al renderizar. Sin nada, oscuro (como el panel en modo oscuro).
export const THEME: 'light' | 'dark' = (getInputProps() as { theme?: string }).theme === 'light' ? 'light' : 'dark';

const DARK = {
  page: '#000000', card: '#0a0a0a', soft: '#121212', hover: '#161616', active: '#1a1a1a',
  line: '#1e1e1e', line2: '#2e2e2e', tx: '#f2f2f2', mut: '#9b9b9b', mut2: '#6e6e6e',
  acc: '#47e098', accOn: '#00260f', accTx: '#5ff0a8', accSoft: 'rgba(71, 224, 152, .12)',
  warn: '#f5c56b', warnSoft: 'rgba(245, 197, 107, .10)', red: '#ff6b5e', badge: 'rgba(240, 68, 56, .18)', badgeTx: '#ff8a80',
  inkOn: '#000000', knob: '#000000', imgbg: '#141414', scrim: 'rgba(0,0,0,.45)', capBg: 'rgba(14,14,14,.94)',
  glow: 'rgba(71,224,152,.10)', accLine: 'rgba(71,224,152,.35)', redLine: 'rgba(255,107,94,.4)', warnLine: 'rgba(245,197,107,.35)',
  shadow: 'rgba(0,0,0,.7)', logo: 'vase-logo-white.png',
};
// Mismos valores que el tema claro de panel.css.
const LIGHT: typeof DARK = {
  page: '#ffffff', card: '#ffffff', soft: '#f4f5f7', hover: '#f2f4f5', active: '#eceef0',
  line: '#eaecef', line2: '#d5d9de', tx: '#111418', mut: '#667085', mut2: '#98a2b3',
  acc: '#006d43', accOn: '#ffffff', accTx: '#006d43', accSoft: 'rgba(24, 195, 126, .10)',
  warn: '#93370d', warnSoft: '#fef6e7', red: '#d92d20', badge: '#ffd9d4', badgeTx: '#b42318',
  inkOn: '#ffffff', knob: '#ffffff', imgbg: '#f7f7f8', scrim: 'rgba(17,20,24,.32)', capBg: 'rgba(255,255,255,.96)',
  glow: 'rgba(24,195,126,.10)', accLine: 'rgba(0,109,67,.35)', redLine: 'rgba(217,45,32,.35)', warnLine: 'rgba(147,55,13,.25)',
  shadow: 'rgba(16,24,40,.18)', logo: 'vase-logo-green.png',
};
export const C = THEME === 'light' ? LIGHT : DARK;

// ---------------------------------------------------------------- tiempo

const ease = Easing.bezier(0.45, 0, 0.2, 1);

/** Valor animado por claves [frame, valor]: se queda quieto entre claves y se mueve con suavidad. */
export function track(frame: number, keys: [number, number][]) {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i += 1) {
    const [f1, v1] = keys[i];
    const [f0, v0] = keys[i - 1];
    if (frame <= f1) return interpolate(frame, [f0, f1], [v0, v1], { easing: ease });
  }
  return keys[keys.length - 1][1];
}

export const fade = (frame: number, start: number, dur = 10) => interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
export const typed = (frame: number, start: number, text: string, cps = 14) => text.slice(0, Math.max(0, Math.floor(((frame - start) / FPS) * cps)));
export const s = (seconds: number) => Math.round(seconds * FPS);

// ---------------------------------------------------------------- cámara y cursor

export type CamKey = [frame: number, x: number, y: number, zoom: number];

/** Encuadre: x/y en coordenadas del panel (1440×810), zoom 1 = panel entero. */
export function Camera({ keys, children }: { keys: CamKey[]; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const z = track(frame, keys.map(([f, , , zoom]) => [f, zoom]));
  const cx = track(frame, keys.map(([f, x]) => [f, x]));
  const cy = track(frame, keys.map(([f, , y]) => [f, y]));
  const half = (size: number) => size / (2 * z);
  const x = Math.min(Math.max(cx, half(PW)), PW - half(PW));
  const y = Math.min(Math.max(cy, half(PH)), PH - half(PH));
  const scale = K * z;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: C.page }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: PW, height: PH, transformOrigin: '0 0', transform: `translate(${W / 2 - x * scale}px, ${H / 2 - y * scale}px) scale(${scale})` }}>
        {children}
      </div>
    </AbsoluteFill>
  );
}

export type CursorKey = [frame: number, x: number, y: number];

export function Cursor({ keys, clicks = [], show = [0, 99999] }: { keys: CursorKey[]; clicks?: number[]; show?: [number, number] }) {
  const frame = useCurrentFrame();
  // Cada clave es "llega acá en este frame"; el viaje dura hasta 20 frames.
  const moves: [number, number][] = [];
  const xs: [number, number][] = [];
  const ys: [number, number][] = [];
  keys.forEach(([f, x, y], i) => {
    if (i > 0) {
      const start = Math.max(keys[i - 1][0], f - 20);
      xs.push([start, keys[i - 1][1]]); ys.push([start, keys[i - 1][2]]);
    }
    xs.push([f, x]); ys.push([f, y]); moves.push([f, 0]);
  });
  const x = track(frame, xs);
  const y = track(frame, ys);
  const opacity = Math.min(fade(frame, show[0], 8), 1 - fade(frame, show[1], 8));
  const last = clicks.filter((f) => f <= frame).pop();
  const since = last === undefined ? 99 : frame - last;
  const press = since < 6 ? 0.86 : 1;
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity, zIndex: 50, pointerEvents: 'none' }}>
      {since < 18 ? (
        <div style={{ position: 'absolute', left: -22, top: -22, width: 44, height: 44, borderRadius: '50%', border: `2px solid ${C.acc}`, opacity: 1 - since / 18, transform: `scale(${0.4 + since / 14})` }} />
      ) : null}
      <svg width="22" height="26" viewBox="0 0 22 26" style={{ transform: `scale(${press})`, transformOrigin: '2px 2px', filter: `drop-shadow(0 3px 6px ${C.shadow})` }}>
        <path d="M2 2 L2 21 L7 16.5 L10.5 24 L14 22.5 L10.5 15.2 L17.5 15.2 Z" fill="#fff" stroke="#000" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Anillo verde alrededor de lo que hay que mirar. */
export function Ring({ x, y, w, h, from, to, r = 12 }: { x: number; y: number; w: number; h: number; from: number; to: number; r?: number }) {
  const frame = useCurrentFrame();
  const o = Math.min(fade(frame, from, 8), 1 - fade(frame, to, 8));
  if (o <= 0) return null;
  const pulse = 1 + Math.sin((frame - from) / 6) * 0.015;
  return <div style={{ position: 'absolute', left: x - 5, top: y - 5, width: w + 10, height: h + 10, borderRadius: r + 4, border: `2px solid ${C.acc}`, boxShadow: `0 0 0 6px ${C.accSoft}`, opacity: o, transform: `scale(${pulse})`, zIndex: 40 }} />;
}

// ---------------------------------------------------------------- subtítulos, apertura y cierre

export type Step = [from: number, to: number, text: string, pos?: 'top'];

export function Captions({ steps }: { steps: Step[] }) {
  const frame = useCurrentFrame();
  const index = steps.findIndex(([from, to]) => frame >= from && frame < to);
  if (index < 0) return null;
  const [from, to, text, pos] = steps[index];
  const o = Math.min(fade(frame, from, 8), 1 - fade(frame, to - 8, 8));
  const lift = (1 - fade(frame, from, 10)) * 14;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, ...(pos === 'top' ? { top: 130 } : { bottom: 54 }), display: 'flex', justifyContent: 'center', opacity: o, transform: `translateY(${lift}px)`, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 30px 18px 18px', borderRadius: 26, background: C.capBg, border: `1px solid ${C.line2}`, boxShadow: `0 24px 60px ${C.shadow}`, fontFamily: FONT, maxWidth: 1500 }}>
        <span style={{ width: 52, height: 52, borderRadius: 16, background: C.acc, color: C.accOn, fontWeight: 800, fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{index + 1}</span>
        <span style={{ color: C.tx, fontSize: 34, fontWeight: 700, letterSpacing: '-.01em' }}>{text}</span>
      </div>
    </div>
  );
}

export function Intro({ kicker, title, time, dur }: { kicker: string; title: string; time: string; dur: number }) {
  const frame = useCurrentFrame();
  const out = 1 - fade(frame, dur - 12, 12);
  return (
    <AbsoluteFill style={{ background: C.page, fontFamily: FONT, alignItems: 'center', justifyContent: 'center', opacity: out, zIndex: 200 }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(900px 500px at 50% 60%, ${C.glow}, transparent 70%)` }} />
      <div style={{ textAlign: 'center', transform: `translateY(${(1 - fade(frame, 4, 16)) * 24}px)`, opacity: fade(frame, 4, 16) }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, color: C.accTx, fontSize: 30, fontWeight: 700 }}>
          <Img src={staticFile(C.logo)} style={{ width: 40, height: 40 }} />{kicker}
        </div>
        <div style={{ color: C.tx, fontSize: 92, fontWeight: 800, letterSpacing: '-.04em', marginTop: 22, lineHeight: 1.05 }}>{title}</div>
        <div style={{ display: 'inline-block', marginTop: 30, padding: '10px 22px', borderRadius: 14, background: C.soft, color: C.mut, fontSize: 28, fontWeight: 700, opacity: fade(frame, 14, 12) }}>{time}</div>
      </div>
    </AbsoluteFill>
  );
}

export function Outro({ start, title }: { start: number; title: string }) {
  const frame = useCurrentFrame();
  const o = fade(frame, start, 14);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ background: C.page, fontFamily: FONT, alignItems: 'center', justifyContent: 'center', opacity: o, zIndex: 200 }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(900px 500px at 50% 60%, ${C.glow}, transparent 70%)` }} />
      <div style={{ textAlign: 'center', transform: `translateY(${(1 - fade(frame, start + 4, 16)) * 20}px)` }}>
        <div style={{ width: 96, height: 96, borderRadius: 30, background: C.acc, color: C.accOn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, fontWeight: 800 }}>✓</div>
        <div style={{ color: C.tx, fontSize: 76, fontWeight: 800, letterSpacing: '-.035em', marginTop: 28 }}>{title}</div>
        <div style={{ color: C.mut, fontSize: 34, fontWeight: 600, marginTop: 18 }}>Más guías en <span style={{ color: C.accTx }}>help.vase.ar</span></div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------- panel

const MENU: [string, string, string?][] = [
  ['Principal', ''], ['Resumen', 'grid'], ['Pedidos', 'bag'], ['Clientes', 'user', '4'],
  ['Tu tienda', ''], ['Catálogo', 'box'], ['Imágenes', 'image'], ['Envíos', 'truck'], ['Diseño de la tienda', 'layout'],
  ['Cuenta', ''], ['Ajustes', 'sliders'], ['Ayuda y soporte', 'help'],
];

const ICON: Record<string, string> = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  bag: 'M6 8h12l-1 12H7zM9 8a3 3 0 0 1 6 0',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  box: 'M12 3 4 7v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4',
  truck: 'M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  layout: 'M4 4h16v16H4zM4 9h16M9 9v11',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h0',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5',
};

export function Icon({ name, size = 18, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICON[name]} /></svg>;
}

export const SIDE_W = 236;
export const MAIN_X = 268;

/** Marco del panel: menú, título de la sección y pestañas del Catálogo. */
export function PanelFrame({ active = 'Catálogo', title, subtitle, tabs, tab, counts = {}, children }: {
  active?: string; title: string; subtitle: string; tabs?: TabDef[]; tab?: string; counts?: Record<string, number>; children?: React.ReactNode;
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.page, color: C.tx, fontFamily: FONT, fontSize: 13.5, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDE_W, borderRight: `1px solid ${C.line}`, padding: '20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 8px 18px' }}>
          <Img src={staticFile(C.logo)} style={{ width: 26, height: 26 }} />
          <b style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.03em' }}>business</b>
        </div>
        {MENU.map(([label, icon, badge]) => icon ? (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 11, height: 39, padding: '0 12px', borderRadius: 12, marginBottom: 2, color: label === active ? C.tx : C.mut, background: label === active ? C.active : 'transparent', fontWeight: label === active ? 800 : 600 }}>
            <Icon name={icon} size={17} color={label === active ? C.acc : 'currentColor'} />{label}
            {badge ? <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, minWidth: 22, height: 20, borderRadius: 10, background: C.badge, color: C.badgeTx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span> : null}
          </div>
        ) : <div key={label} style={{ fontSize: 11.5, fontWeight: 600, color: C.mut2, padding: '12px 10px 5px' }}>{label}</div>)}
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, background: C.card, border: `1px solid ${C.line}` }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: C.accSoft, color: C.accTx, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>T</span>
          <span><b style={{ display: 'block', fontSize: 13 }}>Tu tienda</b><small style={{ color: C.mut, fontSize: 11.5 }}>Administrador</small></span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: MAIN_X, top: 18 }}>
        <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.025em' }}>{title}</div>
        <div style={{ color: C.mut, fontSize: 13, marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ position: 'absolute', right: 32, top: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.mut, fontSize: 12.5, fontWeight: 600 }}><i style={{ width: 7, height: 7, borderRadius: '50%', background: C.acc }} />Todo publicado</span>
        <span style={{ height: 34, padding: '0 14px', borderRadius: 11, background: C.acc, color: C.accOn, fontWeight: 800, display: 'flex', alignItems: 'center' }}>Publicar</span>
        <span style={{ width: 34, height: 34, borderRadius: 11, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.mut, fontWeight: 800 }}>?</span>
      </div>
      {tabs ? (
        <div style={{ position: 'absolute', left: SIDE_W, right: 0, top: 82, height: 46, borderBottom: `1px solid ${C.line}` }}>
          {tabs.map((item) => (
            <div key={item.id} style={{ position: 'absolute', left: item.x, top: 0, width: item.w, height: 46, display: 'flex', alignItems: 'center', gap: 8, color: tab === item.id ? C.tx : C.mut, fontWeight: tab === item.id ? 800 : 600, fontSize: 14 }}>
              {item.label}{counts[item.id] !== undefined ? <em style={{ fontStyle: 'normal', color: C.mut2, fontSize: 12, fontWeight: 700 }}>{counts[item.id]}</em> : null}
              {tab === item.id ? <span style={{ position: 'absolute', left: 0, right: 14, bottom: -1, height: 2, background: C.acc, borderRadius: 2 }} /> : null}
            </div>
          ))}
          <span style={{ position: 'absolute', right: 32, top: 12, display: 'flex', alignItems: 'center', gap: 7, color: C.mut, fontSize: 12.5, fontWeight: 600 }}><i style={{ width: 7, height: 7, borderRadius: '50%', background: C.acc }} />Sincronizado · hace 5 min</span>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export type TabDef = { id: string; label: string; x: number; w: number };
// x relativo al área principal (empieza en SIDE_W).
export const CATALOG_TABS: TabDef[] = [
  { id: 'productos', label: 'Productos', x: 32, w: 130 },
  { id: 'categorias', label: 'Rubros y categorías', x: 172, w: 190 },
  { id: 'marcas', label: 'Marcas', x: 372, w: 100 },
  { id: 'ofertas', label: 'Ofertas', x: 482, w: 90 },
  { id: 'precios', label: 'Cambiar precios', x: 582, w: 150 },
];
export const tabCenter = (id: string) => {
  const item = CATALOG_TABS.find((tab) => tab.id === id)!;
  return { x: SIDE_W + item.x + 40, y: 105 };
};

// ---------------------------------------------------------------- piezas sueltas

export const Btn = ({ x, y, w, h = 34, kind = 'ink', children, style }: { x: number; y: number; w: number; h?: number; kind?: 'ink' | 'acc' | 'soft' | 'red' | 'line'; children: React.ReactNode; style?: React.CSSProperties }) => {
  const look = { ink: [C.tx, C.inkOn], acc: [C.acc, C.accOn], soft: [C.soft, C.tx], red: [C.soft, C.red], line: ['transparent', C.tx] }[kind];
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 11, background: look[0], color: look[1], border: kind === 'line' ? `1px solid ${C.line2}` : 'none', fontWeight: 800, fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>{children}</div>;
};

export const Toggle = ({ on }: { on: boolean }) => (
  <span style={{ width: 38, height: 22, borderRadius: 11, background: on ? C.acc : C.line2, position: 'relative', display: 'inline-block', flex: 'none' }}>
    <span style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: on ? C.knob : C.mut }} />
  </span>
);

export const Input = ({ x, y, w, h = 40, value, placeholder, focus, caret }: { x: number; y: number; w: number; h?: number; value: string; placeholder?: string; focus?: boolean; caret?: boolean }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 11, border: `1px solid ${focus ? C.acc : C.line2}`, background: C.card, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 14, color: value ? C.tx : C.mut2 }}>
    {value || placeholder}{caret ? <span style={{ width: 1.5, height: 18, background: C.acc, marginLeft: 1 }} /> : null}
  </div>
);

export const Label = ({ x, y, children }: { x: number; y: number; children: React.ReactNode }) => (
  <div style={{ position: 'absolute', left: x, top: y, color: C.mut, fontSize: 12.5, fontWeight: 700 }}>{children}</div>
);

/** Panel lateral que entra desde la derecha. */
export function Side({ from, to = 99999, kicker, title, children, footer }: { from: number; to?: number; kicker: string; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const frame = useCurrentFrame();
  const inn = fade(frame, from, 12) * (1 - fade(frame, to, 10));
  if (inn <= 0) return null;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: C.scrim, opacity: inn, zIndex: 20 }} />
      <div style={{ position: 'absolute', top: 12, right: 12, bottom: 12, width: 420, borderRadius: 22, background: C.card, border: `1px solid ${C.line}`, boxShadow: `0 30px 90px ${C.shadow}`, transform: `translateX(${(1 - inn) * 460}px)`, zIndex: 30, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 24, top: 22, color: C.mut, fontSize: 12, fontWeight: 700 }}>{kicker}</div>
        <div style={{ position: 'absolute', left: 24, top: 40, fontSize: 21, fontWeight: 800, letterSpacing: '-.02em', width: 330, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ position: 'absolute', right: 22, top: 24, width: 32, height: 32, borderRadius: 10, border: `1px solid ${C.line2}`, color: C.mut, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</div>
        {children}
        {footer ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, borderTop: `1px solid ${C.line}` }}>{footer}</div> : null}
      </div>
    </>
  );
}

/** Coordenadas de un elemento dentro del panel lateral, en coordenadas del lienzo. */
export const SIDE_X = PW - 12 - 420;
export const SIDE_Y = 12;

/** Aviso de confirmación. Va fuera de la cámara: siempre se ve arriba, aunque haya zoom. */
export function Toast({ text, from, dur = s(2.2) }: { text: string; from: number; dur?: number }) {
  const frame = useCurrentFrame();
  const o = Math.min(fade(frame, from, 8), 1 - fade(frame, from + dur, 10));
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: '50%', top: 40, transform: `translate(-50%, ${(1 - o) * -20}px)`, opacity: o, zIndex: 150, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 26px 16px 16px', borderRadius: 20, background: C.soft, border: `1px solid ${C.line2}`, boxShadow: `0 24px 60px ${C.shadow}`, fontFamily: FONT, fontWeight: 700, fontSize: 26, color: C.tx, whiteSpace: 'nowrap' }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: C.acc, color: C.accOn, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>✓</span>{text}
    </div>
  );
}

export const money = (value: number) => `$ ${Math.round(value).toLocaleString('es-AR')}`;

// ---------------------------------------------------------------- productos de demo

export type Product = { id: string; name: string; sku: string; cat: string; price: number; stock: number; tiers?: number; img: string };
export const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Helado Chocolate x 5 kg', sku: '201833', cat: 'Helados', price: 18500, stock: 12, tiers: 3, img: '#5b3a29' },
  { id: 'p2', name: 'Helado Dulce de leche x 5 kg', sku: '201834', cat: 'Helados', price: 18500, stock: 9, tiers: 3, img: '#b07a43' },
  { id: 'p3', name: 'Helado Frutilla x 5 kg', sku: '201837', cat: 'Helados', price: 17900, stock: 0, img: '#d4566e' },
  { id: 'p4', name: 'Helado Limón x 5 kg', sku: '201841', cat: 'Helados', price: 17900, stock: 7, img: '#e8d86a' },
  { id: 'p5', name: 'Cucuruchos x 100 u.', sku: '301120', cat: 'Insumos', price: 6200, stock: 40, img: '#caa26a' },
  { id: 'p6', name: 'Salsa de chocolate 1 kg', sku: '301245', cat: 'Insumos', price: 7800, stock: 15, img: '#3d2418' },
  { id: 'p7', name: 'Medialunas congeladas x 48', sku: '402010', cat: 'Panadería', price: 21000, stock: 6, img: '#d9a65a' },
  { id: 'p8', name: 'Pan de molde x 12', sku: '402044', cat: 'Panadería', price: 9400, stock: 22, img: '#c9b18a' },
];

export const Thumb = ({ color, size = 36 }: { color: string; size?: number }) => (
  <span style={{ width: size, height: size, borderRadius: 10, background: C.imgbg, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
    <span style={{ width: size * 0.5, height: size * 0.56, borderRadius: `${size * 0.12}px ${size * 0.12}px ${size * 0.2}px ${size * 0.2}px`, background: color, boxShadow: 'inset 0 -4px 0 rgba(0,0,0,.25)' }} />
  </span>
);
