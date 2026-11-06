import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT, Intro, Outro, Thumb, Toggle, fade, money, s, track } from './kit';

// Guía FAQ: ¿Por qué volvió a cambiar un precio? Cuatro causas, cada una con su arreglo.
const INTRO = s(2.5);
const SCENE = s(6.6);
const RECAP = INTRO + SCENE * 4;
const OUTRO = RECAP + s(4.4);
export const POR_QUE_FRAMES = OUTRO + s(2.8);

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ borderRadius: 28, border: `1px solid ${C.line2}`, background: C.card, padding: 32, boxShadow: '0 30px 80px rgba(0,0,0,.6)', ...style }}>{children}</div>
);

const ProductHead = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
    <Thumb color="#5b3a29" size={64} />
    <div><b style={{ fontSize: 28, display: 'block' }}>Helado Chocolate x 5 kg</b><span style={{ color: C.mut, fontSize: 20 }}>SKU 201833</span></div>
  </div>
);

function Sync({ f }: { f: number }) {
  const back = f > s(1.6);
  const fixed = f > s(3.6);
  const price = fixed ? 19900 : back ? 18500 : 19900;
  return (
    <Card style={{ width: 640 }}>
      <ProductHead />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 26, color: C.mut, fontSize: 20, fontWeight: 600 }}>
        <i style={{ width: 10, height: 10, borderRadius: '50%', background: C.acc, transform: `scale(${1 + Math.sin(f / 5) * 0.2})` }} />Sincronizado · hace 1 min
      </div>
      <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-.03em', marginTop: 10, color: back && !fixed ? C.warn : C.tx }}>{money(price)}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 24, padding: '18px 20px', borderRadius: 18, border: `1px solid ${fixed ? 'rgba(71,224,152,.4)' : C.line}`, background: fixed ? C.accSoft : 'transparent', opacity: fade(f, s(2.6), 10) }}>
        <span style={{ flex: 1 }}><b style={{ fontSize: 22, display: 'block' }}>No pisar mis cambios</b><span style={{ color: C.mut, fontSize: 17 }}>Producto › Más</span></span>
        <div style={{ transform: 'scale(1.5)', transformOrigin: 'right center' }}><Toggle on={fixed} /></div>
      </div>
    </Card>
  );
}

function Offer({ f }: { f: number }) {
  const on = f > s(1.4);
  return (
    <Card style={{ width: 640 }}>
      <ProductHead />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 30 }}>
        <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-.03em', color: on ? C.accTx : C.tx }}>{money(on ? 15725 : 18500)}</span>
        {on ? <span style={{ fontSize: 30, color: C.mut, textDecoration: 'line-through', opacity: fade(f, s(1.4), 8) }}>{money(18500)}</span> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24, padding: '18px 20px', borderRadius: 18, border: `1px solid ${C.line}`, opacity: fade(f, s(1.2), 10) }}>
        <span style={{ fontSize: 34, fontWeight: 800, color: C.accTx }}>-15%</span>
        <span style={{ flex: 1 }}><b style={{ fontSize: 22, display: 'block' }}>Semana del helado</b><span style={{ color: C.mut, fontSize: 17 }}>Catálogo › Ofertas</span></span>
        <span style={{ padding: '6px 14px', borderRadius: 10, background: C.accSoft, color: C.accTx, fontWeight: 700, fontSize: 17 }}>Activa</span>
      </div>
    </Card>
  );
}

function Lists({ f }: { f: number }) {
  const rows: [string, number, boolean][] = [['Todos los clientes', 18500, false], ['Lista Mayorista', 15900, true]];
  return (
    <Card style={{ width: 640 }}>
      <ProductHead />
      <div style={{ marginTop: 26 }}>
        {rows.map(([who, price, hot], index) => (
          <div key={who} style={{ display: 'flex', alignItems: 'center', padding: '18px 20px', borderRadius: 18, marginTop: 12, border: `1px solid ${hot && f > s(2) ? 'rgba(71,224,152,.4)' : C.line}`, background: hot && f > s(2) ? C.accSoft : 'transparent', opacity: fade(f, s(0.6) + index * s(0.8), 10) }}>
            <span style={{ flex: 1, fontSize: 22, fontWeight: 700 }}>{who}</span>
            <b style={{ fontSize: 30 }}>{money(price)}</b>
          </div>
        ))}
      </div>
      <div style={{ color: C.mut, fontSize: 18, marginTop: 18, opacity: fade(f, s(2.4), 10) }}>Ajustes › Precios y listas</div>
    </Card>
  );
}

function Special({ f }: { f: number }) {
  const raised = f > s(1.6);
  return (
    <Card style={{ width: 640 }}>
      <ProductHead />
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 20px', borderRadius: 18, marginTop: 26, border: `1px solid ${C.line}` }}>
        <span style={{ flex: 1, fontSize: 22, fontWeight: 700 }}>Precio del producto</span>
        <b style={{ fontSize: 30, color: raised ? C.accTx : C.tx }}>{money(raised ? 19900 : 18500)}</b>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderRadius: 18, marginTop: 12, border: '1px solid rgba(245,197,107,.35)', background: C.warnSoft }}>
        <span style={{ fontSize: 26 }}>🔒</span>
        <span style={{ flex: 1 }}><b style={{ fontSize: 22, display: 'block' }}>Precio especial · Bar La Esquina</b><span style={{ color: C.mut, fontSize: 17 }}>Catálogo › Cambiar precios › Precios especiales</span></span>
        <b style={{ fontSize: 30 }}>{money(16650)}</b>
      </div>
      <div style={{ color: C.mut, fontSize: 18, marginTop: 18, opacity: fade(f, s(2.4), 10) }}>No se mueve aunque cambie el precio. Para sacarlo: Quitar.</div>
    </Card>
  );
}

const REASONS: { q: string; a: string; fix: string; Visual: React.FC<{ f: number }> }[] = [
  { q: 'Lo cambié y volvió al precio anterior', a: 'Lo pisó la sincronización con tu sistema de gestión.', fix: 'Abrí el producto y en Más activá “No pisar mis cambios”.', Visual: Sync },
  { q: 'En la tienda se ve más barato', a: 'Tiene una oferta activa.', fix: 'Mirá Catálogo › Ofertas. Si hay varias, gana la más barata.', Visual: Offer },
  { q: 'Un cliente ve otro precio', a: 'Está en una lista de precios, como Mayorista.', fix: 'Revisalo en Ajustes › Precios y listas.', Visual: Lists },
  { q: 'Subí el precio y a un cliente no le cambió', a: 'Tiene un precio especial fijo.', fix: 'Quitalo en Cambiar precios › Precios especiales.', Visual: Special },
];

function Reason({ index, start }: { index: number; start: number }) {
  const frame = useCurrentFrame();
  const f = frame - start;
  if (f < -10 || f > SCENE + 10) return null;
  const o = Math.min(fade(frame, start, 12), 1 - fade(frame, start + SCENE - 12, 12));
  const { q, a, fix, Visual } = REASONS[index];
  const slide = track(f, [[0, 40], [16, 0]]);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.tx, opacity: o, flexDirection: 'row', alignItems: 'center', padding: '0 140px', gap: 100 }}>
      <div style={{ flex: 1, transform: `translateX(${-slide}px)` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, color: C.accTx, fontWeight: 800, fontSize: 26 }}>
          <span style={{ width: 48, height: 48, borderRadius: 15, background: C.acc, color: C.accOn, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{index + 1}</span>
          Causa {index + 1} de 4
        </div>
        <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1.08, marginTop: 26 }}>“{q}”</div>
        <div style={{ fontSize: 32, color: C.mut, marginTop: 22, fontWeight: 600, opacity: fade(f, s(0.8), 10) }}>{a}</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 34, padding: '22px 26px', borderRadius: 22, background: C.accSoft, opacity: fade(f, s(2.4), 12) }}>
          <span style={{ color: C.accTx, fontWeight: 800, fontSize: 28 }}>✓</span>
          <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.35 }}>{fix}</span>
        </div>
      </div>
      <div style={{ transform: `translateX(${slide}px)` }}><Visual f={f} /></div>
    </AbsoluteFill>
  );
}

function Recap() {
  const frame = useCurrentFrame();
  const f = frame - RECAP;
  if (f < -10) return null;
  const o = fade(frame, RECAP, 12);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.tx, opacity: o, padding: '120px 160px', justifyContent: 'center' }}>
      <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-.035em' }}>Dónde mirar</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginTop: 40 }}>
        {[['Sincronización', 'Producto › Más › No pisar mis cambios'], ['Ofertas', 'Catálogo › Ofertas'], ['Listas', 'Ajustes › Precios y listas'], ['Precios especiales', 'Catálogo › Cambiar precios']].map(([title, where], index) => (
          <div key={title} style={{ padding: '28px 30px', borderRadius: 24, border: `1px solid ${C.line2}`, background: C.card, opacity: fade(f, 6 + index * 5, 10), transform: `translateY(${(1 - fade(f, 6 + index * 5, 10)) * 16}px)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 44, height: 44, borderRadius: 14, background: C.accSoft, color: C.accTx, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22 }}>{index + 1}</span>
              <b style={{ fontSize: 32 }}>{title}</b>
            </div>
            <div style={{ color: C.mut, fontSize: 26, marginTop: 12, fontWeight: 600 }}>{where}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

export function PorQueCambioPrecio() {
  return (
    <AbsoluteFill style={{ background: C.page }}>
      <AbsoluteFill style={{ background: 'radial-gradient(1000px 600px at 75% 50%, rgba(71,224,152,.07), transparent 70%)' }} />
      {REASONS.map((_, index) => <Reason key={index} index={index} start={INTRO + SCENE * index} />)}
      <Recap />
      <Intro kicker="Ayuda · Catálogo · Preguntas frecuentes" title="¿Por qué volvió a cambiar un precio?" time="4 causas" dur={INTRO} />
      <Outro start={OUTRO} title="Precio resuelto" />
    </AbsoluteFill>
  );
}
