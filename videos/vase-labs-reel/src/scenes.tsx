import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT } from './theme';
import { Backdrop, Bubble, Glow, Title, Typing, clamp, useBeat, useSpring } from './ui';

const CHANNEL = {
  wa: { name: 'WhatsApp', color: C.wa, glyph: 'W' },
  ig: { name: 'Instagram', color: C.ig, glyph: 'IG' },
  fb: { name: 'Facebook', color: C.fb, glyph: 'f' },
} as const;
type Ch = keyof typeof CHANNEL;

const ChannelDot: React.FC<{ ch: Ch; size?: number }> = ({ ch, size = 64 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      background: CHANNEL[ch].color,
      color: '#fff',
      fontWeight: 700,
      fontSize: size * 0.4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    {CHANNEL[ch].glyph}
  </div>
);

/* 1. GANCHO — mensajes que se acumulan sin respuesta */
const NOTES: { ch: Ch; who: string; msg: string }[] = [
  { ch: 'wa', who: 'Martín', msg: '¿Tienen stock?' },
  { ch: 'ig', who: 'Lucía', msg: 'Precio por mayor?' },
  { ch: 'fb', who: 'Carlos', msg: '¿Hacen envíos?' },
  { ch: 'wa', who: 'Sofi', msg: 'Hola, sigue disponible?' },
  { ch: 'ig', who: 'Nico', msg: '¿Cuánto sale?' },
  { ch: 'wa', who: 'Ana', msg: 'Necesito para hoy 🙏' },
];
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const count = Math.round(interpolate(frame, [0, 70], [3, 127], { ...clamp, easing: (t) => t * t }));
  const head = useSpring(62, 12);
  const zoom = interpolate(frame, [104, 120], [1, 1.25], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, transform: `scale(${zoom})` }}>
      <Backdrop />
      <div style={{ position: 'absolute', top: 180, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 200, fontWeight: 700, color: '#ff5a5f', letterSpacing: -8, lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: 42, color: C.mist, fontWeight: 500 }}>mensajes sin responder</div>
      </div>
      <div style={{ position: 'absolute', top: 520, left: 90, right: 90 }}>
        {NOTES.map((n, i) => {
          const s = useSpring(4 + i * 9, 12);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                padding: '20px 26px',
                marginBottom: 16,
                borderRadius: 28,
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid rgba(255,255,255,0.12)',
                transform: `translateY(${(1 - s) * -120}px) rotate(${(i % 2 ? 1 : -1) * (1 - s) * 6}deg)`,
                opacity: s * (1 - head * 0.55),
              }}
            >
              <ChannelDot ch={n.ch} size={62} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: C.white }}>{n.who}</div>
                <div style={{ fontSize: 28, color: C.muted }}>{n.msg}</div>
              </div>
              <div style={{ fontSize: 24, color: '#ff5a5f', fontWeight: 700 }}>sin leer</div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1300,
          left: 70,
          right: 70,
          textAlign: 'center',
          fontSize: 100,
          fontWeight: 700,
          letterSpacing: -3,
          lineHeight: 1,
          color: C.white,
          opacity: head,
          transform: `scale(${0.7 + head * 0.3})`,
        }}
      >
        ¿Cuántas ventas
        <br />
        <Glow>se te escapan?</Glow>
      </div>
    </AbsoluteFill>
  );
};

/* 2. MARCA — entra el beat */
export const Brand: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = useBeat();
  const logo = useSpring(0, 9);
  const name = useSpring(8, 12);
  const sub = useSpring(18, 14);
  const rings = [0, 15, 30, 45];
  return (
    <AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
      <Backdrop />
      {rings.map((r) => {
        const p = interpolate(frame, [r, r + 40], [0, 1], clamp);
        return (
          <div
            key={r}
            style={{
              position: 'absolute',
              top: 560 - 300,
              width: 600,
              height: 600,
              borderRadius: 300,
              border: `4px solid ${C.glow}`,
              opacity: (1 - p) * 0.8,
              transform: `scale(${0.3 + p * 1.4})`,
            }}
          />
        );
      })}
      <Img
        src={staticFile('vase-logo.png')}
        style={{
          position: 'absolute',
          top: 400,
          width: 340,
          filter: 'invert(1) brightness(2)',
          transform: `scale(${logo * (1 + beat * 0.04)})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 860,
          fontSize: 150,
          fontWeight: 700,
          letterSpacing: -6,
          color: C.white,
          opacity: name,
          transform: `translateY(${(1 - name) * 80}px)`,
        }}
      >
        Vase <Glow>Labs</Glow>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1070,
          left: 90,
          right: 90,
          textAlign: 'center',
          fontSize: 54,
          lineHeight: 1.25,
          color: C.mist,
          opacity: sub,
          transform: `translateY(${(1 - sub) * 40}px)`,
        }}
      >
        IA que <b style={{ color: C.glow }}>atiende</b>, <b style={{ color: C.glow }}>vende</b> y{' '}
        <b style={{ color: C.glow }}>ordena</b> tus conversaciones.
      </div>
    </AbsoluteFill>
  );
};

/* 3. BANDEJA UNIFICADA */
const THREADS: { ch: Ch; who: string; last: string }[] = [
  { ch: 'wa', who: 'Martín G.', last: '¿Tienen stock del modelo negro?' },
  { ch: 'ig', who: 'Lucía P.', last: 'Quiero precio por mayor' },
  { ch: 'fb', who: 'Carlos R.', last: '¿Envían a Mar del Plata?' },
  { ch: 'wa', who: 'Sofía M.', last: 'Perfecto, lo reservo' },
  { ch: 'ig', who: 'Nicolás T.', last: '¿Aceptan transferencia?' },
];
export const Inbox: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <Title kicker="Bandeja unificada">
        Todos tus canales,
        <br />
        <Glow>una sola bandeja</Glow>
      </Title>
      <div style={{ position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 50 }}>
        {(['wa', 'ig', 'fb'] as Ch[]).map((ch, i) => {
          const s = useSpring(6 + i * 5, 10);
          return (
            <div key={ch} style={{ textAlign: 'center', transform: `scale(${s})` }}>
              <ChannelDot ch={ch} size={110} />
              <div style={{ color: C.mist, fontSize: 26, marginTop: 10 }}>{CHANNEL[ch].name}</div>
            </div>
          );
        })}
      </div>
      {/* lineas que bajan de cada canal hacia la bandeja */}
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        {[380, 540, 700].map((x, i) => {
          const p = interpolate(frame, [18 + i * 4, 40 + i * 4], [0, 1], clamp);
          return (
            <path
              key={x}
              d={`M ${x} 740 C ${x} 820, 540 800, 540 880`}
              stroke={[C.wa, C.ig, C.fb][i]}
              strokeWidth={6}
              fill="none"
              strokeDasharray={300}
              strokeDashoffset={300 * (1 - p)}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 880,
          left: 70,
          right: 70,
          borderRadius: 36,
          background: C.mist,
          padding: '26px 26px 10px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, color: C.jade, letterSpacing: 3, marginBottom: 14 }}>INBOX · 5 CONVERSACIONES</div>
        {THREADS.map((t, i) => {
          const s = useSpring(30 + i * 6, 14);
          const answered = frame > 62 + i * 9;
          return (
            <div
              key={t.who}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '18px 16px',
                borderRadius: 22,
                background: '#fff',
                marginBottom: 14,
                borderLeft: `10px solid ${CHANNEL[t.ch].color}`,
                opacity: s,
                transform: `translateX(${(1 - s) * 200}px)`,
              }}
            >
              <ChannelDot ch={t.ch} size={58} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: C.ink }}>{t.who}</div>
                <div style={{ fontSize: 25, color: '#5b6660', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.last}</div>
              </div>
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontSize: 22,
                  fontWeight: 700,
                  background: answered ? C.jade : '#ffe3e3',
                  color: answered ? '#fff' : '#d33',
                  whiteSpace: 'nowrap',
                }}
              >
                {answered ? '✓ IA respondió' : 'Nuevo'}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 4. LA IA RESPONDE */
export const Answer: React.FC = () => {
  const frame = useCurrentFrame();
  const badge = useSpring(88, 9);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <Title kicker="Atención con IA">
        Responde en segundos.
        <br />
        <Glow>24/7.</Glow>
      </Title>
      <div
        style={{
          position: 'absolute',
          top: 560,
          left: 130,
          right: 130,
          height: 1150,
          borderRadius: 70,
          background: '#e9eeec',
          border: '14px solid #1b1f1d',
          overflow: 'hidden',
          boxShadow: '0 60px 140px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ height: 130, background: C.jade, display: 'flex', alignItems: 'center', gap: 20, padding: '30px 30px 0' }}>
          <ChannelDot ch="wa" size={66} />
          <div>
            <div style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>Tu negocio</div>
            <div style={{ color: C.glow, fontSize: 24 }}>{frame > 32 && frame < 62 ? 'escribiendo…' : 'en línea'}</div>
          </div>
        </div>
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Bubble side="in" delay={4}>
            Hola! ¿Tienen el vanitory de 60 en blanco? ¿Envían a Mar del Plata?
          </Bubble>
          <Typing from={30} to={62} />
          {frame >= 62 && (
            <Bubble side="out" delay={62}>
              ¡Sí! Está en stock a <b>$ 212.500</b>. Enviamos a Mar del Plata en 48 hs 🚚 ¿Te lo reservo?
            </Bubble>
          )}
          {frame >= 76 && (
            <div style={{ alignSelf: 'flex-end', width: '78%', opacity: interpolate(frame, [76, 86], [0, 1], clamp) }}>
              <div style={{ background: '#fff', borderRadius: 24, padding: 18, display: 'flex', gap: 18, alignItems: 'center' }}>
                <div style={{ width: 100, height: 100, borderRadius: 16, background: `linear-gradient(135deg, ${C.glow}, ${C.sage})` }} />
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: C.ink }}>Vanitory 60 cm</div>
                  <div style={{ fontSize: 26, color: C.jade, fontWeight: 700 }}>$ 212.500 · En stock</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1480,
          right: 80,
          padding: '20px 30px',
          borderRadius: 999,
          background: C.glow,
          color: C.carbon,
          fontSize: 38,
          fontWeight: 700,
          transform: `scale(${badge}) rotate(-4deg)`,
        }}
      >
        ⚡ Respondió en 3 s
      </div>
    </AbsoluteFill>
  );
};

/* 5. BASE DE CONOCIMIENTO */
const SOURCES = [
  { icon: '📄', label: 'Lista de precios.pdf', x: -270, y: -330 },
  { icon: '🔗', label: 'tutienda.com.ar', x: 270, y: -300 },
  { icon: '❓', label: 'FAQ: envíos y pagos', x: -250, y: 330 },
  { icon: '📦', label: 'Catálogo', x: 280, y: 300 },
];
export const Knowledge: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = useBeat();
  const pct = Math.round(interpolate(frame, [20, 100], [0, 100], clamp));
  const cx = 540;
  const cy = 1180;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop light />
      <Title light kicker="Conocimiento">
        Entrenala con
        <br />
        <span style={{ color: C.jade }}>tu negocio</span>
      </Title>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        {SOURCES.map((s, i) => {
          const p = interpolate(frame, [16 + i * 12, 40 + i * 12], [0, 1], clamp);
          return (
            <line
              key={s.label}
              x1={cx + s.x}
              y1={cy + s.y}
              x2={cx + s.x * (1 - p)}
              y2={cy + s.y * (1 - p)}
              stroke={C.jade}
              strokeWidth={5}
              strokeDasharray="14 12"
              strokeDashoffset={-frame * 2}
            />
          );
        })}
      </svg>
      {SOURCES.map((s, i) => {
        const a = useSpring(4 + i * 6, 12);
        const absorb = interpolate(frame, [40 + i * 12, 52 + i * 12], [0, 1], clamp);
        return (
          <div
            key={s.label}
            style={{
              position: 'absolute',
              left: cx + s.x * (1 - absorb * 0.25),
              top: cy + s.y * (1 - absorb * 0.25),
              transform: `translate(-50%, -50%) scale(${a * (1 - absorb * 0.2)})`,
              padding: '20px 26px',
              borderRadius: 24,
              background: '#fff',
              boxShadow: '0 20px 50px rgba(13,17,23,0.15)',
              fontSize: 27,
              fontWeight: 700,
              color: C.ink,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 40 }}>{s.icon}</span>
            {s.label}
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: cx - 150,
          top: cy - 150,
          width: 300,
          height: 300,
          borderRadius: 150,
          background: `radial-gradient(circle at 35% 30%, ${C.sage}, ${C.jade} 60%, #1f3a21)`,
          boxShadow: `0 0 ${60 + beat * 50}px rgba(59,99,61,0.6)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          transform: `scale(${1 + beat * 0.04})`,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>IA</div>
        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>{pct}%</div>
        <div style={{ fontSize: 22, color: C.glow }}>{pct < 100 ? 'aprendiendo…' : 'lista'}</div>
      </div>
    </AbsoluteFill>
  );
};

/* 6. SEÑALES DE COMPRA */
const METERS = [
  { label: 'Intención de compra', value: 92 },
  { label: 'Profundidad de interacción', value: 78 },
  { label: 'Urgencia', value: 85 },
];
export const Signals: React.FC = () => {
  const frame = useCurrentFrame();
  const card = useSpring(6, 14);
  const hot = useSpring(84, 8);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <Title kicker="Señales de venta">
        Detecta quién está
        <br />
        <Glow>listo para comprar</Glow>
      </Title>
      <div
        style={{
          position: 'absolute',
          top: 620,
          left: 80,
          right: 80,
          borderRadius: 40,
          background: C.mist,
          padding: 44,
          opacity: card,
          transform: `translateY(${(1 - card) * 160}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <ChannelDot ch="ig" size={90} />
          <div>
            <div style={{ fontSize: 44, fontWeight: 700, color: C.ink }}>Lucía P.</div>
            <div style={{ fontSize: 28, color: '#5b6660' }}>Instagram · hace 2 min</div>
          </div>
        </div>
        {METERS.map((m, i) => {
          const p = interpolate(frame, [20 + i * 10, 55 + i * 10], [0, m.value], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
          return (
            <div key={m.label} style={{ marginTop: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 32, fontWeight: 700, color: C.ink }}>
                <span>{m.label}</span>
                <span style={{ color: C.jade }}>{Math.round(p)}%</span>
              </div>
              <div style={{ height: 22, borderRadius: 11, background: '#d8dfdb', marginTop: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${p}%`, borderRadius: 11, background: `linear-gradient(90deg, ${C.sage}, ${C.jade})` }} />
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 40 }}>
          {['✓ Producto definido', '✓ Aceptó presupuesto'].map((t, i) => {
            const s = useSpring(62 + i * 7, 11);
            return (
              <div key={t} style={{ padding: '14px 24px', borderRadius: 999, background: C.jade, color: '#fff', fontSize: 28, fontWeight: 700, transform: `scale(${s})` }}>
                {t}
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1470,
          left: 0,
          right: 0,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '24px 44px',
            borderRadius: 999,
            background: '#ff6a3d',
            color: '#fff',
            fontSize: 50,
            fontWeight: 700,
            transform: `scale(${hot}) rotate(-3deg)`,
          }}
        >
          🔥 Cliente listo para cerrar
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* 7. DEL CHAT AL PEDIDO */
export const Orders: React.FC = () => {
  const frame = useCurrentFrame();
  const morph = interpolate(frame, [28, 44], [0, 1], clamp);
  const order = useSpring(40, 13);
  const flow = interpolate(frame, [62, 86], [0, 1], clamp);
  const sync = useSpring(86, 9);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop light />
      <Title light kicker="Pedidos automáticos">
        Del chat al pedido,
        <br />
        <span style={{ color: C.jade }}>sin doble carga</span>
      </Title>
      <div style={{ position: 'absolute', top: 600, left: 90, right: 90, display: 'flex', flexDirection: 'column', opacity: 1 - morph }}>
        <Bubble side="in" delay={4}>
          Dale, lo quiero 👍 Pago por transferencia.
        </Bubble>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 600,
          left: 110,
          right: 110,
          borderRadius: 36,
          background: '#fff',
          padding: 40,
          boxShadow: '0 40px 90px rgba(13,17,23,0.18)',
          opacity: order,
          transform: `scale(${0.7 + order * 0.3})`,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, color: C.jade, letterSpacing: 3 }}>PEDIDO CREADO POR IA</div>
        <div style={{ fontSize: 64, fontWeight: 700, color: C.ink, letterSpacing: -2 }}>#2087</div>
        {[
          ['Producto', 'Vanitory 60 cm'],
          ['Cliente', 'Lucía P. · Instagram'],
          ['Pago', 'Transferencia'],
          ['Envío', 'Mar del Plata · 48 hs'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, padding: '14px 0', borderBottom: '2px solid #e6ebe8' }}>
            <span style={{ color: '#5b6660' }}>{k}</span>
            <span style={{ color: C.ink, fontWeight: 700 }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 40, fontWeight: 700, marginTop: 20 }}>
          <span>Total</span>
          <span style={{ color: C.jade }}>$ 212.500</span>
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <line x1={540} y1={1250} x2={540} y2={1250 + 170 * flow} stroke={C.jade} strokeWidth={8} strokeDasharray="18 14" strokeDashoffset={-frame * 3} />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 1440,
          left: 150,
          right: 150,
          padding: '30px 36px',
          borderRadius: 30,
          background: C.ink,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          opacity: flow,
          transform: `translateY(${(1 - flow) * 60}px)`,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            background: C.glow,
            color: C.carbon,
            fontSize: 46,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${sync})`,
          }}
        >
          ✓
        </div>
        <div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>Vase Business / tu sistema</div>
          <div style={{ fontSize: 26, color: C.glow }}>Pedido sincronizado</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 8. CIERRE */
export const WHATSAPP = '+54 9 223 449-6403';
export const Cta: React.FC = () => {
  const beat = useBeat();
  const a = useSpring(0, 12);
  const b = useSpring(10, 12);
  const c = useSpring(22, 10);
  const plans = ['⚡ Económico', '🚀 Profesional', '👑 Enterprise'];
  return (
    <AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
      <Backdrop />
      <Img src={staticFile('vase-logo.png')} style={{ position: 'absolute', top: 230, width: 180, filter: 'invert(1) brightness(2)', opacity: a }} />
      <div
        style={{
          position: 'absolute',
          top: 470,
          left: 70,
          right: 70,
          textAlign: 'center',
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: -4,
          lineHeight: 1,
          color: C.white,
          opacity: a,
          transform: `translateY(${(1 - a) * 80}px)`,
        }}
      >
        Tu atención,
        <br />
        <Glow>en piloto automático.</Glow>
      </div>
      <div style={{ position: 'absolute', top: 820, display: 'flex', gap: 16, opacity: b }}>
        {plans.map((p) => (
          <div key={p} style={{ padding: '14px 24px', borderRadius: 999, border: `2px solid ${C.sage}`, color: C.mist, fontSize: 28, fontWeight: 700 }}>
            {p}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 960, left: 100, right: 100, textAlign: 'center', color: C.mist, fontSize: 48, opacity: b }}>
        Probá <b style={{ color: C.glow }}>Vase Labs</b> en tu negocio.
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1140,
          padding: '34px 60px',
          borderRadius: 999,
          background: C.glow,
          color: C.carbon,
          textAlign: 'center',
          transform: `scale(${c * (1 + beat * 0.035)})`,
          boxShadow: `0 0 ${30 + beat * 40}px rgba(168,230,169,0.5)`,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4 }}>CONSULTANOS POR WHATSAPP</div>
        <div style={{ fontSize: 58, fontWeight: 700 }}>{WHATSAPP}</div>
      </div>
      <div style={{ position: 'absolute', top: 1380, color: C.white, fontSize: 50, fontWeight: 700, opacity: c }}>vase.ar</div>
    </AbsoluteFill>
  );
};
