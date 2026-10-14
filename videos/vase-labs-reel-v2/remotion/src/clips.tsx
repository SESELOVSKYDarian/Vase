// Clips de interfaz para el reel v2. No llevan texto de titulo: los subtitulos los pone HyperFrames.
// Cada clip recibe `ev` = cuadros (relativos al inicio del clip) de las palabras clave de la voz.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT } from './theme';
import { Backdrop, Bubble, Typing, clamp, useSpring } from './ui';

export type Ev = Record<string, number>;
export type ClipProps = { dur: number; ev: Ev };

const CH = {
  wa: { name: 'WhatsApp', color: C.wa, glyph: 'W' },
  ig: { name: 'Instagram', color: C.ig, glyph: 'IG' },
  fb: { name: 'Facebook', color: C.fb, glyph: 'f' },
} as const;
type Ch = keyof typeof CH;

const Dot: React.FC<{ ch: Ch; size?: number; glow?: number }> = ({ ch, size = 64, glow = 0 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      background: CH[ch].color,
      color: '#fff',
      fontWeight: 700,
      fontSize: size * 0.4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: glow ? `0 0 ${40 * glow}px ${CH[ch].color}` : 'none',
    }}
  >
    {CH[ch].glyph}
  </div>
);

// Telefono grande, centrado arriba (deja libre la zona de subtitulos).
const Phone: React.FC<{ children: React.ReactNode; header: React.ReactNode; tilt?: number; dark?: boolean }> = ({ children, header, tilt = 0, dark }) => {
  const s = useSpring(0, 15);
  return (
    <div
      style={{
        position: 'absolute',
        top: 150,
        left: 150,
        right: 150,
        height: 1100,
        borderRadius: 80,
        background: dark ? '#0b1220' : '#e9eeec',
        border: '16px solid #15191b',
        overflow: 'hidden',
        boxShadow: '0 70px 160px rgba(0,0,0,0.7), 0 0 0 3px rgba(168,230,169,0.25)',
        transform: `translateY(${(1 - s) * 300}px) rotate(${tilt * (1 - s)}deg)`,
        fontFamily: FONT,
      }}
    >
      {header}
      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>{children}</div>
    </div>
  );
};

const ChatHeader: React.FC<{ name: string; status: string; ch?: Ch }> = ({ name, status, ch = 'wa' }) => (
  <div style={{ height: 140, background: C.jade, display: 'flex', alignItems: 'center', gap: 20, padding: '34px 30px 0' }}>
    <Dot ch={ch} size={70} />
    <div>
      <div style={{ color: '#fff', fontSize: 34, fontWeight: 700 }}>{name}</div>
      <div style={{ color: C.glow, fontSize: 24 }}>{status}</div>
    </div>
  </div>
);

/* 1. "En visto": el cliente escribe y nadie contesta */
export const Visto: React.FC<ClipProps> = ({ ev }) => {
  const frame = useCurrentFrame();
  const stamp = useSpring(ev.visto ?? 50, 8);
  const shake = frame > (ev.visto ?? 50) && frame < (ev.visto ?? 50) + 8 ? Math.sin(frame * 4) * 12 : 0;
  return (
    <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
      <Backdrop />
      <Phone header={<ChatHeader name="Martín" status="últ. vez hoy 14:32" />} tilt={-8}>
        <Bubble side="in" delay={2}>Hola! ¿Está disponible? 😊</Bubble>
        <Bubble side="in" delay={10}>¿Me pasás precio?</Bubble>
        <Bubble side="in" delay={18}>Hola??</Bubble>
        <div style={{ alignSelf: 'flex-end', fontSize: 26, color: '#34b7f1', fontWeight: 700, opacity: interpolate(frame, [22, 28], [0, 1], clamp) }}>
          ✓✓ Visto 14:32
        </div>
      </Phone>
      <div
        style={{
          position: 'absolute',
          top: 760,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT,
          opacity: stamp,
          transform: `scale(${2.4 - stamp * 1.4}) rotate(-12deg)`,
        }}
      >
        <span style={{ display: 'inline-block', padding: '20px 50px', border: '12px solid #ff3b3b', borderRadius: 30, color: '#ff3b3b', fontSize: 130, fontWeight: 700, letterSpacing: 8, background: 'rgba(0,0,0,0.35)' }}>
          VISTO
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* 2. Las 3 de la mañana: entra un pedido y no hay nadie */
export const Noche: React.FC<ClipProps> = ({ ev }) => {
  const frame = useCurrentFrame();
  const flip = frame >= (ev.tres ?? 10);
  const notif = useSpring(ev.comprar ?? 40, 11);
  const buzz = frame > (ev.comprar ?? 40) && frame < (ev.comprar ?? 40) + 10 ? Math.sin(frame * 5) * 8 : 0;
  return (
    <AbsoluteFill style={{ background: '#03060f', fontFamily: FONT }}>
      <AbsoluteFill style={{ background: 'radial-gradient(900px 700px at 70% 15%, rgba(80,110,200,0.35), transparent 70%)' }} />
      {/* luna y estrellas */}
      <div style={{ position: 'absolute', top: 140, right: 140, width: 150, height: 150, borderRadius: 75, boxShadow: 'inset -36px -10px 0 0 #f4f1d0', transform: 'rotate(-20deg)' }} />
      {Array.from({ length: 30 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: (i * 337) % 1080, top: (i * 211) % 700, width: 5, height: 5, borderRadius: 3, background: '#fff', opacity: 0.3 + 0.5 * Math.abs(Math.sin(frame / 10 + i)) }} />
      ))}
      <div style={{ position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 230, fontWeight: 700, letterSpacing: -8 }}>
        {flip ? '03:00' : '02:59'}
      </div>
      <div style={{ position: 'absolute', top: 560, left: 0, right: 0, textAlign: 'center', color: '#8ea0c8', fontSize: 40 }}>martes · tu local está cerrado</div>
      <div
        style={{
          position: 'absolute',
          top: 760,
          left: 90,
          right: 90,
          padding: 34,
          borderRadius: 40,
          background: 'rgba(255,255,255,0.14)',
          border: '2px solid rgba(255,255,255,0.2)',
          display: 'flex',
          gap: 26,
          alignItems: 'center',
          opacity: notif,
          transform: `translateY(${(1 - notif) * -200}px) translateX(${buzz}px)`,
        }}
      >
        <Dot ch="ig" size={96} />
        <div style={{ color: '#fff' }}>
          <div style={{ fontSize: 30, color: '#c9d3ea' }}>Instagram · ahora</div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>Lucía P.</div>
          <div style={{ fontSize: 36 }}>Quiero comprar 3 unidades 🙏</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 3. Bandeja: cada canal se enciende cuando la voz lo nombra */
const ROWS: { ch: Ch; who: string; last: string }[] = [
  { ch: 'wa', who: 'Martín G.', last: '¿Está disponible?' },
  { ch: 'ig', who: 'Lucía P.', last: 'Quiero comprar 3 unidades' },
  { ch: 'fb', who: 'Carlos R.', last: '¿Envían a Mar del Plata?' },
  { ch: 'wa', who: 'Sofía M.', last: '¿Aceptan transferencia?' },
];
export const Bandeja: React.FC<ClipProps> = ({ ev, dur }) => {
  const frame = useCurrentFrame();
  const on = (k: Ch) => interpolate(frame, [ev[k] ?? 0, (ev[k] ?? 0) + 6], [0, 1], clamp);
  const answeredFrom = ev.bandeja ?? ev.fb ?? dur * 0.6;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <div style={{ position: 'absolute', top: 170, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 60 }}>
        {(['wa', 'ig', 'fb'] as Ch[]).map((ch) => {
          const o = on(ch);
          return (
            <div key={ch} style={{ textAlign: 'center', opacity: 0.25 + o * 0.75, transform: `scale(${0.8 + o * 0.35})` }}>
              <Dot ch={ch} size={130} glow={o} />
              <div style={{ color: '#fff', fontSize: 30, marginTop: 12, fontWeight: 700 }}>{CH[ch].name}</div>
            </div>
          );
        })}
      </div>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        {(['wa', 'ig', 'fb'] as Ch[]).map((ch, i) => {
          const x = [345, 540, 735][i];
          const p = on(ch);
          return <path key={ch} d={`M ${x} 400 C ${x} 470, 540 450, 540 520`} stroke={CH[ch].color} strokeWidth={8} fill="none" strokeDasharray={260} strokeDashoffset={260 * (1 - p)} />;
        })}
      </svg>
      <div style={{ position: 'absolute', top: 520, left: 70, right: 70, borderRadius: 40, background: C.mist, padding: 28, boxShadow: '0 50px 120px rgba(0,0,0,0.55)' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.jade, letterSpacing: 3, marginBottom: 16 }}>VASE LABS · INBOX</div>
        {ROWS.map((r, i) => {
          const s = useSpring(4 + i * 5, 14);
          const done = frame > answeredFrom + i * 6;
          return (
            <div key={r.who} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 18px', borderRadius: 24, background: '#fff', marginBottom: 14, borderLeft: `12px solid ${CH[r.ch].color}`, opacity: s, transform: `translateX(${(1 - s) * 220}px)` }}>
              <Dot ch={r.ch} size={62} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: C.ink }}>{r.who}</div>
                <div style={{ fontSize: 26, color: '#5b6660', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.last}</div>
              </div>
              <div style={{ padding: '10px 18px', borderRadius: 999, fontSize: 24, fontWeight: 700, whiteSpace: 'nowrap', background: done ? C.jade : '#ffe3e3', color: done ? '#fff' : '#d33', transform: `scale(${done ? 1.06 : 1})` }}>
                {done ? '✓ IA respondió' : 'Nuevo'}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 4. La IA responde con precio y stock */
export const Respuesta: React.FC<ClipProps> = ({ ev }) => {
  const frame = useCurrentFrame();
  const reply = ev.segundos ?? ev.precios ?? 22;
  const badge = useSpring(ev.stock ?? 40, 9);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Phone header={<ChatHeader name="Tu negocio" status={frame < reply ? 'escribiendo…' : 'en línea'} ch="ig" />}>
        <Bubble side="in" delay={0}>Quiero comprar 3 unidades 🙏 ¿Precio?</Bubble>
        <Typing from={4} to={reply} />
        {frame >= reply && (
          <Bubble side="out" delay={reply}>
            ¡Hola Lucía! Las 3 te quedan en <b>$ 637.500</b>. Hay <b>12 en stock</b> y te las enviamos mañana 🚚
          </Bubble>
        )}
      </Phone>
      <div style={{ position: 'absolute', top: 1110, right: 110, padding: '22px 34px', borderRadius: 999, background: C.glow, color: C.carbon, fontSize: 40, fontWeight: 700, fontFamily: FONT, transform: `scale(${badge}) rotate(-5deg)` }}>
        ⚡ Respondió en 3 s
      </div>
    </AbsoluteFill>
  );
};

/* 5. Señales de compra */
export const Senales: React.FC<ClipProps> = ({ ev, dur }) => {
  const frame = useCurrentFrame();
  const end = ev.comprar ?? dur * 0.8;
  const hot = useSpring(end, 8);
  const meters = [
    ['Intención de compra', 94],
    ['Urgencia', 81],
    ['Producto definido', 100],
  ] as const;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <div style={{ position: 'absolute', top: 200, left: 80, right: 80, borderRadius: 44, background: C.mist, padding: 46, boxShadow: '0 50px 120px rgba(0,0,0,0.55)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Dot ch="ig" size={100} />
          <div>
            <div style={{ fontSize: 48, fontWeight: 700, color: C.ink }}>Lucía P.</div>
            <div style={{ fontSize: 30, color: '#5b6660' }}>Instagram · 3 unidades</div>
          </div>
        </div>
        {meters.map(([label, value], i) => {
          const p = interpolate(frame, [2 + i * 5, end - 4], [0, value], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
          return (
            <div key={label} style={{ marginTop: 44 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 36, fontWeight: 700, color: C.ink }}>
                <span>{label}</span>
                <span style={{ color: C.jade }}>{Math.round(p)}%</span>
              </div>
              <div style={{ height: 26, borderRadius: 13, background: '#d8dfdb', marginTop: 14, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${p}%`, background: `linear-gradient(90deg, ${C.sage}, ${C.jade})` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', top: 1000, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', padding: '28px 50px', borderRadius: 999, background: '#ff6a3d', color: '#fff', fontSize: 56, fontWeight: 700, transform: `scale(${hot}) rotate(-3deg)`, boxShadow: '0 0 60px rgba(255,106,61,0.6)' }}>
          🔥 Lista para comprar
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* 6. Pedido armado solo */
export const Pedido: React.FC<ClipProps> = ({ ev, dur }) => {
  const frame = useCurrentFrame();
  const at = ev.pedido ?? 10;
  const card = useSpring(at - 6, 11);
  const ok = useSpring(ev.solita ?? dur * 0.7, 8);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <div style={{ position: 'absolute', top: 190, left: 100, right: 100, borderRadius: 44, background: '#fff', padding: 48, boxShadow: '0 60px 140px rgba(0,0,0,0.6)', opacity: card, transform: `scale(${0.6 + card * 0.4}) rotate(${(1 - card) * 8}deg)` }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.jade, letterSpacing: 3 }}>PEDIDO CREADO POR IA</div>
        <div style={{ fontSize: 84, fontWeight: 700, color: C.ink, letterSpacing: -3 }}>#2087</div>
        {[
          ['Producto', '3 × Vanitory 60 cm'],
          ['Cliente', 'Lucía P. · Instagram'],
          ['Pago', 'Transferencia'],
          ['Envío', 'Mañana · 48 hs'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 34, padding: '16px 0', borderBottom: '2px solid #e6ebe8' }}>
            <span style={{ color: '#5b6660' }}>{k}</span>
            <span style={{ color: C.ink, fontWeight: 700 }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 48, fontWeight: 700, marginTop: 22 }}>
          <span>Total</span>
          <span style={{ color: C.jade }}>$ 637.500</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1040, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 18, padding: '24px 44px', borderRadius: 999, background: C.glow, color: C.carbon, fontSize: 46, fontWeight: 700, transform: `scale(${ok})` }}>
          ✓ Sincronizado con tu sistema
        </span>
      </div>
      <AbsoluteFill style={{ background: '#fff', opacity: interpolate(frame, [at - 6, at - 3, at + 4], [0, 0.6, 0], clamp), pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

/* 7. La entrenas con tu negocio: cada fuente entra cuando la voz la nombra */
const FUENTES = [
  { key: 'start', icon: '🔗', label: 'tutienda.com.ar', x: -250, y: -330 },
  { key: 'catalogo', icon: '📦', label: 'Catálogo', x: 270, y: -300 },
  { key: 'preguntas', icon: '❓', label: 'Preguntas frecuentes', x: -230, y: 320 },
  { key: 'forma', icon: '💬', label: 'Tu forma de hablar', x: 250, y: 300 },
];
export const Conocimiento: React.FC<ClipProps> = ({ ev, dur }) => {
  const frame = useCurrentFrame();
  const done = ev.hablar ?? dur * 0.8;
  const pct = Math.round(interpolate(frame, [6, done], [0, 100], clamp));
  const cx = 540;
  const cy = 700;
  const pulse = 1 + Math.sin(frame / 4) * 0.02;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop light />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        {FUENTES.map((s) => {
          const at = s.key === 'start' ? 4 : ev[s.key] ?? 30;
          const p = interpolate(frame, [at + 4, at + 18], [0, 1], clamp);
          return <line key={s.key} x1={cx + s.x} y1={cy + s.y} x2={cx + s.x * (1 - p)} y2={cy + s.y * (1 - p)} stroke={C.jade} strokeWidth={6} strokeDasharray="16 12" strokeDashoffset={-frame * 2} />;
        })}
      </svg>
      {FUENTES.map((s) => {
        const at = s.key === 'start' ? 4 : ev[s.key] ?? 30;
        const a = useSpring(at, 11);
        return (
          <div
            key={s.key}
            style={{
              position: 'absolute',
              left: cx + s.x,
              top: cy + s.y,
              transform: `translate(-50%, -50%) scale(${a})`,
              padding: '22px 28px',
              borderRadius: 26,
              background: '#fff',
              boxShadow: '0 20px 50px rgba(13,17,23,0.18)',
              fontSize: 32,
              fontWeight: 700,
              color: C.ink,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span style={{ fontSize: 44 }}>{s.icon}</span>
            {s.label}
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: cx - 170,
          top: cy - 170,
          width: 340,
          height: 340,
          borderRadius: 170,
          background: `radial-gradient(circle at 35% 30%, ${C.sage}, ${C.jade} 60%, #1f3a21)`,
          boxShadow: `0 0 ${pct >= 100 ? 120 : 60}px rgba(59,99,61,0.6)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          transform: `scale(${pulse})`,
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 4 }}>TU IA</div>
        <div style={{ fontSize: 90, fontWeight: 700, letterSpacing: -2 }}>{pct}%</div>
        <div style={{ fontSize: 26, color: C.glow }}>{pct < 100 ? 'aprendiendo…' : '✓ lista'}</div>
      </div>
    </AbsoluteFill>
  );
};
