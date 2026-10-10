import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT } from './theme';
import { Accent, AppWindow, Backdrop, SceneTitle, useSpring } from './ui';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/* 1. HOOK — el dolor del cliente */
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const lines = ['¿Seguís', 'vendiendo', 'por WhatsApp', 'y planillas?'];
  const strike = interpolate(frame, [52, 66], [0, 100], clamp);
  const shake = frame > 66 && frame < 74 ? Math.sin(frame * 3) * 10 : 0;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <div style={{ position: 'absolute', top: 470, left: 80, right: 60, transform: `translateX(${shake}px)` }}>
        {lines.map((line, i) => {
          const s = useSpring(i * 7, 11);
          const isLast = i === lines.length - 1;
          return (
            <div
              key={line}
              style={{
                position: 'relative',
                fontSize: 140,
                fontWeight: 900,
                lineHeight: 1.0,
                letterSpacing: -5,
                color: isLast ? C.neon : C.paper,
                transform: `translateY(${(1 - s) * 120}px) rotate(${(1 - s) * -6}deg)`,
                opacity: s,
                display: 'inline-block',
                width: '100%',
              }}
            >
              {line}
              {isLast && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '52%',
                    height: 16,
                    width: `${strike * 0.92}%`,
                    background: '#ff4d4f',
                    borderRadius: 8,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 2. MARCA — que es Vase Business */
export const Brand: React.FC = () => {
  const frame = useCurrentFrame();
  const s = useSpring(0, 10);
  const t = useSpring(10, 14);
  const sub = useSpring(20, 16);
  const ring = interpolate(frame, [0, 40], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
      <Backdrop light />
      <div
        style={{
          position: 'absolute',
          top: 420,
          width: 520,
          height: 520,
          borderRadius: 260,
          border: `6px solid ${C.neon}`,
          opacity: 1 - ring,
          transform: `scale(${0.6 + ring * 0.9})`,
        }}
      />
      <Img
        src={staticFile('vase-logo.png')}
        style={{ position: 'absolute', top: 470, width: 420, transform: `scale(${s})` }}
      />
      <div
        style={{
          position: 'absolute',
          top: 980,
          fontSize: 130,
          fontWeight: 900,
          letterSpacing: -5,
          color: C.ink,
          opacity: t,
          transform: `translateY(${(1 - t) * 60}px)`,
        }}
      >
        Vase <span style={{ color: C.brand }}>Business</span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1150,
          left: 100,
          right: 100,
          textAlign: 'center',
          fontSize: 52,
          lineHeight: 1.25,
          fontWeight: 600,
          color: '#2f4a3c',
          opacity: sub,
          transform: `translateY(${(1 - sub) * 40}px)`,
        }}
      >
        Tu tienda online y tu gestión,
        <br />
        en <b style={{ color: C.brand }}>un solo panel</b>.
      </div>
    </AbsoluteFill>
  );
};

/* 3. EDITOR — bloques que se reordenan y la tienda cambia en vivo */
const BLOCKS = ['Hero slider', 'Marcas', 'Destacados', 'Servicios'];
export const Editor: React.FC = () => {
  const frame = useCurrentFrame();
  // A los ~2s "Destacados" sube al segundo lugar.
  const swap = interpolate(frame, [70, 95], [0, 1], clamp);
  const order = [0, 1, 2, 3].map((i) => {
    if (i === 1) return 1 + swap;
    if (i === 2) return 2 - swap;
    return i;
  });
  const heroColor = frame < 110 ? C.ink : C.brand;
  const flash = interpolate(frame, [108, 112, 124], [0, 1, 0], clamp);
  const cursorX = interpolate(frame, [30, 70, 95, 130], [700, 300, 300, 820], clamp);
  const cursorY = interpolate(frame, [30, 70, 95, 130], [700, 420, 300, 120], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <SceneTitle kicker="Editor visual" title={<>Editá tu web <Accent>sin código</Accent></>} />
      <AppWindow top={640} height={980}>
        <div style={{ display: 'flex', height: '100%' }}>
          <div style={{ width: 380, padding: 26, background: '#fafbfa', borderRight: `2px solid ${C.line}` }}>
            <div style={{ fontSize: 20, letterSpacing: 3, color: C.muted, fontWeight: 700 }}>INICIO</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: C.ink, marginBottom: 20 }}>Bloques</div>
            <div style={{ position: 'relative', height: 600 }}>
              {BLOCKS.map((b, i) => {
                const active = i === 2 && frame > 60 && frame < 100;
                return (
                  <div
                    key={b}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: order[i] * 140,
                      height: 120,
                      borderRadius: 20,
                      background: '#fff',
                      border: `3px solid ${active ? C.neon : C.line}`,
                      boxShadow: active ? '0 20px 40px rgba(0,109,67,0.25)' : 'none',
                      transform: active ? 'scale(1.04)' : 'none',
                      padding: '22px 22px',
                    }}
                  >
                    <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, textTransform: 'uppercase' }}>{b}</div>
                    <div style={{ fontSize: 20, color: C.brand, fontWeight: 600, marginTop: 6 }}>● Visible</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ flex: 1, padding: 26, position: 'relative' }}>
            <div
              style={{
                height: 360,
                borderRadius: 24,
                background: heroColor,
                padding: 30,
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: -90,
                  top: 150,
                  width: 260,
                  height: 260,
                  borderRadius: 130,
                  background: C.neon,
                  opacity: 0.9,
                }}
              />
              <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 0.95, letterSpacing: -2, position: 'relative' }}>
                TU MARCA
                <br />
                LISTA PARA
                <br />
                VENDER
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 30,
                  bottom: 30,
                  padding: '14px 26px',
                  borderRadius: 14,
                  background: '#fff',
                  color: C.ink,
                  fontWeight: 800,
                  fontSize: 22,
                }}
              >
                VER CATÁLOGO →
              </div>
            </div>
            {[0, 1].map((row) => (
              <div key={row} style={{ display: 'flex', gap: 16, marginTop: 20 }}>
                {[0, 1].map((col) => (
                  <div key={col} style={{ flex: 1, height: 200, borderRadius: 20, background: '#f1f4f2', padding: 16 }}>
                    <div style={{ height: 110, borderRadius: 14, background: row === 0 && swap > 0.5 ? C.mint : '#e3e8e5' }} />
                    <div style={{ height: 16, width: '70%', background: '#d5dbd8', borderRadius: 8, marginTop: 14 }} />
                    <div style={{ height: 16, width: '40%', background: C.neon, borderRadius: 8, marginTop: 10 }} />
                  </div>
                ))}
              </div>
            ))}
            <AbsoluteFill style={{ background: C.neon, opacity: flash * 0.35, pointerEvents: 'none' }} />
          </div>
        </div>
        <Cursor x={cursorX} y={cursorY} pressed={frame > 70 && frame < 95} />
        <div
          style={{
            position: 'absolute',
            right: 26,
            top: 24,
            padding: '14px 26px',
            borderRadius: 14,
            background: frame > 120 ? C.brand : C.ink,
            color: '#fff',
            fontWeight: 800,
            fontSize: 22,
            transform: `scale(${frame > 120 && frame < 130 ? 0.92 : 1})`,
          }}
        >
          {frame > 125 ? '✓ PUBLICADO' : 'PUBLICAR'}
        </div>
      </AppWindow>
    </AbsoluteFill>
  );
};

const Cursor: React.FC<{ x: number; y: number; pressed?: boolean }> = ({ x, y, pressed }) => (
  <svg
    width="56"
    height="56"
    viewBox="0 0 24 24"
    style={{ position: 'absolute', left: x, top: y, transform: `scale(${pressed ? 0.85 : 1})`, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.35))' }}
  >
    <path d="M4 2l16 9-7 2-3 7z" fill={C.ink} stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

/* 4. CATALOGO + ERP */
const PRODUCTS = [
  ['Grifería monocomando', 'SKU 10482', '$ 84.900'],
  ['Vanitory 60 cm', 'SKU 20317', '$ 212.500'],
  ['Inodoro largo', 'SKU 30941', '$ 158.300'],
  ['Ducha cromada', 'SKU 11208', '$ 39.990'],
  ['Espejo LED', 'SKU 41773', '$ 96.700'],
];
export const Catalog: React.FC = () => {
  const frame = useCurrentFrame();
  const count = Math.round(interpolate(frame, [15, 90], [0, 2480], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) }));
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <SceneTitle kicker="Catálogo + ERP" title={<>Tus productos, <Accent>sincronizados</Accent> solos</>} />
      <div style={{ position: 'absolute', top: 640, left: 80, right: 80, display: 'flex', alignItems: 'center', gap: 30 }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            background: C.neon,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 70,
            color: C.ink,
            transform: `rotate(${frame * 6}deg)`,
          }}
        >
          ⟳
        </div>
        <div>
          <div style={{ fontSize: 130, fontWeight: 900, color: C.paper, letterSpacing: -4, lineHeight: 1 }}>
            {count.toLocaleString('es-AR')}
          </div>
          <div style={{ fontSize: 36, color: C.mint, fontWeight: 600 }}>productos importados desde tu ERP</div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 900, left: 60, right: 60 }}>
        {PRODUCTS.map(([name, sku, price], i) => {
          const s = useSpring(20 + i * 8, 15);
          return (
            <div
              key={sku}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                background: '#fff',
                borderRadius: 26,
                padding: '22px 28px',
                marginBottom: 18,
                transform: `translateX(${(1 - s) * 900}px)`,
                opacity: s,
              }}
            >
              <div style={{ width: 84, height: 84, borderRadius: 18, background: i % 2 ? C.mint : '#e3e8e5' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 34, fontWeight: 800, color: C.ink }}>{name}</div>
                <div style={{ fontSize: 24, color: C.muted }}>{sku} · Stock actualizado</div>
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, color: C.brand }}>{price}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 5. PRECIOS MINORISTA / MAYORISTA + OFERTAS */
export const Pricing: React.FC = () => {
  const frame = useCurrentFrame();
  const wholesale = frame > 55;
  const knob = interpolate(frame, [50, 60], [0, 1], clamp);
  const badge = useSpring(75, 9);
  const price = wholesale ? '$ 67.920' : '$ 84.900';
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop light />
      <SceneTitle light kicker="Precios inteligentes" title={<>Minorista y <span style={{ color: C.brand }}>mayorista</span> en la misma tienda</>} />
      <div style={{ position: 'absolute', top: 760, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 28, alignItems: 'center' }}>
        <span style={{ fontSize: 40, fontWeight: 800, color: wholesale ? C.muted : C.ink }}>Minorista</span>
        <div style={{ width: 170, height: 90, borderRadius: 45, background: wholesale ? C.brand : '#cfd6d2', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 10, left: 10 + knob * 80, width: 70, height: 70, borderRadius: 35, background: '#fff' }} />
        </div>
        <span style={{ fontSize: 40, fontWeight: 800, color: wholesale ? C.ink : C.muted }}>Mayorista</span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 920,
          left: 140,
          right: 140,
          borderRadius: 40,
          background: '#fff',
          boxShadow: '0 40px 90px rgba(6,20,13,0.18)',
          padding: 40,
        }}
      >
        <div style={{ height: 360, borderRadius: 28, background: `linear-gradient(135deg, ${C.mint}, #e8efeb)` }} />
        <div style={{ fontSize: 44, fontWeight: 900, color: C.ink, marginTop: 28 }}>Grifería monocomando</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginTop: 10 }}>
          <div style={{ fontSize: 76, fontWeight: 900, color: C.brand, letterSpacing: -2 }}>{price}</div>
          {wholesale && <div style={{ fontSize: 34, color: C.muted, textDecoration: 'line-through' }}>$ 84.900</div>}
        </div>
        <div style={{ fontSize: 28, color: C.muted, marginTop: 6 }}>
          {wholesale ? 'Lista mayorista · cliente aprobado' : 'Precio público'}
        </div>
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -30,
            padding: '20px 30px',
            borderRadius: 24,
            background: '#ff4d4f',
            color: '#fff',
            fontSize: 44,
            fontWeight: 900,
            transform: `scale(${badge}) rotate(8deg)`,
          }}
        >
          -20% OFF
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 6. CHECKOUT + ENVIOS */
export const Checkout: React.FC = () => {
  const frame = useCurrentFrame();
  const chips = ['Transferencia', 'Pedido por WhatsApp', 'Retiro en sucursal'];
  const zones = [
    { r: 150, label: 'Gratis', color: C.neon },
    { r: 260, label: '$ 4.500', color: '#8fe8bd' },
    { r: 370, label: '$ 9.000', color: '#d3f7e4' },
  ];
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <SceneTitle kicker="Checkout y envíos" title={<>Cobrá y enviá <Accent>a tu manera</Accent></>} />
      <div style={{ position: 'absolute', top: 640, left: 80, right: 80, display: 'flex', flexWrap: 'wrap', gap: 18 }}>
        {chips.map((chip, i) => {
          const s = useSpring(8 + i * 6, 12);
          return (
            <div
              key={chip}
              style={{
                padding: '20px 30px',
                borderRadius: 999,
                background: i === 1 ? C.neon : 'rgba(255,255,255,0.1)',
                border: `2px solid ${C.neon}`,
                color: i === 1 ? C.ink : C.paper,
                fontSize: 34,
                fontWeight: 800,
                transform: `scale(${s})`,
              }}
            >
              ✓ {chip}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 900,
          left: 80,
          right: 80,
          height: 760,
          borderRadius: 40,
          background: '#e9f0ec',
          overflow: 'hidden',
        }}
      >
        {/* calles del "mapa" */}
        {[...Array(9)].map((_, i) => (
          <div key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: i * 90 + 20, height: 10, background: '#fff' }} />
        ))}
        {[...Array(10)].map((_, i) => (
          <div key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: i * 100 + 30, width: 10, background: '#fff' }} />
        ))}
        {zones
          .slice()
          .reverse()
          .map((z, idx) => {
            const i = zones.length - 1 - idx;
            const s = useSpring(25 + i * 10, 13);
            return (
              <div
                key={z.label}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: z.r * 2,
                  height: z.r * 2,
                  marginLeft: -z.r,
                  marginTop: -z.r,
                  borderRadius: z.r,
                  background: z.color,
                  opacity: 0.75,
                  border: `4px solid ${C.brand}`,
                  transform: `scale(${s})`,
                }}
              />
            );
          })}
        {zones.map((z, i) => {
          const s = useSpring(50 + i * 8, 14);
          return (
            <div
              key={`l${z.label}`}
              style={{
                position: 'absolute',
                left: '50%',
                top: `calc(50% - ${z.r - 30}px)`,
                transform: `translate(-50%, -50%) scale(${s})`,
                padding: '8px 20px',
                borderRadius: 14,
                background: C.ink,
                color: C.neon,
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              {z.label}
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 46,
            height: 46,
            marginLeft: -23,
            marginTop: -23,
            borderRadius: 23,
            background: C.ink,
            border: `8px solid ${C.neon}`,
            transform: `scale(${1 + Math.sin(frame / 5) * 0.1})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* 7. NOTIFICACIONES + DASHBOARD */
const BARS = [32, 48, 41, 63, 58, 79, 96];
export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const notes = [
    { t: 'Nuevo pedido #1042', d: '$ 312.400 · Transferencia', icon: '🛒' },
    { t: 'Cliente mayorista', d: 'Pendiente de aprobación', icon: '👤' },
    { t: 'Pago confirmado', d: 'Pedido #1039', icon: '✅' },
  ];
  const total = Math.round(interpolate(frame, [30, 110], [0, 4870000], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) }));
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop light />
      <SceneTitle light kicker="Todo bajo control" title={<>Pedidos, clientes y ventas <span style={{ color: C.brand }}>en tiempo real</span></>} />
      <div style={{ position: 'absolute', top: 730, left: 80, right: 80 }}>
        {notes.map((n, i) => {
          const s = useSpring(6 + i * 14, 13);
          return (
            <div
              key={n.t}
              style={{
                display: 'flex',
                gap: 22,
                alignItems: 'center',
                padding: '22px 28px',
                borderRadius: 28,
                background: '#fff',
                boxShadow: '0 20px 50px rgba(6,20,13,0.12)',
                marginBottom: 16,
                transform: `translateY(${(1 - s) * -80}px)`,
                opacity: s,
              }}
            >
              <div style={{ fontSize: 48 }}>{n.icon}</div>
              <div>
                <div style={{ fontSize: 34, fontWeight: 900, color: C.ink }}>{n.t}</div>
                <div style={{ fontSize: 26, color: C.muted }}>{n.d}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1230,
          left: 80,
          right: 80,
          height: 460,
          borderRadius: 36,
          background: C.ink,
          padding: 36,
        }}
      >
        <div style={{ fontSize: 26, color: C.mint, fontWeight: 700, letterSpacing: 2 }}>VENTAS TOTALES · ESTE MES</div>
        <div style={{ fontSize: 80, fontWeight: 900, color: C.paper, letterSpacing: -2 }}>
          $ {total.toLocaleString('es-AR')}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, height: 200, marginTop: 16 }}>
          {BARS.map((b, i) => {
            const s = useSpring(40 + i * 5, 15);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${b * s}%`,
                  borderRadius: 12,
                  background: i === BARS.length - 1 ? C.neon : 'rgba(71,224,152,0.4)',
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 8. DOMINIO PROPIO + SEO */
export const Domain: React.FC = () => {
  const frame = useCurrentFrame();
  const url = 'www.tumarca.com.ar';
  const typed = url.slice(0, Math.floor(interpolate(frame, [10, 45], [0, url.length], clamp)));
  const card = useSpring(50, 14);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <SceneTitle kicker="Dominio propio + SEO" title={<>Tu marca, <Accent>tu dominio</Accent>, en Google</>} />
      <div
        style={{
          position: 'absolute',
          top: 760,
          left: 80,
          right: 80,
          height: 120,
          borderRadius: 60,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          padding: '0 44px',
          gap: 20,
          fontSize: 50,
          fontWeight: 700,
          color: C.ink,
        }}
      >
        <span style={{ color: C.brand }}>🔒</span>
        {typed}
        <span style={{ width: 4, height: 60, background: C.brand, opacity: frame % 20 < 10 ? 1 : 0 }} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 960,
          left: 80,
          right: 80,
          borderRadius: 36,
          background: '#fff',
          padding: 40,
          transform: `translateY(${(1 - card) * 120}px)`,
          opacity: card,
        }}
      >
        <div style={{ fontSize: 26, color: C.muted }}>Google · resultado</div>
        <div style={{ fontSize: 28, color: '#3c4043', marginTop: 16 }}>tumarca.com.ar</div>
        <div style={{ fontSize: 44, color: '#1a0dab', fontWeight: 700, marginTop: 6 }}>Tu Marca | Tienda oficial</div>
        <div style={{ fontSize: 30, color: '#4d5156', marginTop: 10, lineHeight: 1.35 }}>
          Comprá online con envío a todo el país. Precios mayoristas para clientes registrados.
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1400, left: 80, right: 80, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {['SSL incluido', 'Meta tags', 'Google Tag Manager'].map((t, i) => {
          const s = useSpring(70 + i * 6, 12);
          return (
            <div
              key={t}
              style={{
                padding: '16px 26px',
                borderRadius: 999,
                border: `2px solid ${C.neon}`,
                color: C.neon,
                fontSize: 30,
                fontWeight: 800,
                transform: `scale(${s})`,
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 9b. Captura real del panel, para dar credibilidad antes del cierre. */
export const RealPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 75], [1.05, 1.25], clamp);
  const s = useSpring(0, 16);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <SceneTitle kicker="Así se ve" title={<>Un panel <Accent>real</Accent>, listo para usar</>} />
      <div
        style={{
          position: 'absolute',
          top: 760,
          left: 40,
          right: 40,
          height: 760,
          borderRadius: 32,
          overflow: 'hidden',
          boxShadow: '0 50px 120px rgba(0,0,0,.5), 0 0 0 3px rgba(71,224,152,.5)',
          transform: `scale(${0.85 + s * 0.15})`,
          opacity: s,
        }}
      >
        <Img
          src={staticFile('vase-business-dashboard.png')}
          style={{ height: '100%', transform: `scale(${zoom})`, transformOrigin: '30% 30%' }}
        />
      </div>
    </AbsoluteFill>
  );
};
