import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import {
  Btn, C, CATALOG_TABS, Camera, Captions, Cursor, Input, Intro, Label, MAIN_X, Outro, PW, PanelFrame, Ring, SIDE_X, SIDE_Y, Side, Toast, Toggle, s, tabCenter, track, typed,
} from './kit';

// Guía: Crear una oferta (Catálogo › Ofertas).
const F = {
  intro: s(2.5),
  tab: s(3.6), plus: s(5.4),
  name: s(7), kind: s(10.4), value: s(12), cartel: s(14.4),
  target: s(16.6), cat: s(18.2), audience: s(20.4),
  scroll: s(23), active: s(24.4), save: s(27.6), close: s(30.4),
  outro: s(34.4),
};
export const CREAR_OFERTA_FRAMES = F.outro + s(2.8);

const side = (x: number, y: number) => ({ x: SIDE_X + x, y: SIDE_Y + y });
const SEG_W = 372;

function Seg({ y, options, on }: { y: number; options: string[]; on: number }) {
  const w = SEG_W / options.length;
  return (
    <div style={{ position: 'absolute', left: 24, top: y, width: SEG_W, height: 38, borderRadius: 12, background: C.soft, padding: 3, display: 'flex' }}>
      {options.map((label, index) => (
        <span key={label} style={{ width: w - 2, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, background: index === on ? C.active : 'transparent', color: index === on ? C.tx : C.mut, boxShadow: index === on ? `0 0 0 1px ${C.line2}` : 'none' }}>{label}</span>
      ))}
    </div>
  );
}
const segCenter = (y: number, count: number, index: number) => side(24 + (SEG_W / count) * (index + 0.5), y + 19);

function OfferCard({ x, badge, state, name, scope, extra, opacity = 1 }: { x: number; badge: string; state: [string, boolean]; name: string; scope: string; extra?: string; opacity?: number }) {
  return (
    <div style={{ position: 'absolute', left: x, top: 210, width: 300, height: 138, borderRadius: 18, border: `1px solid ${C.line}`, background: C.card, padding: 18, opacity, transform: `translateY(${(1 - opacity) * 12}px)` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: C.accTx, letterSpacing: '-.02em' }}>{badge}</span>
        <span style={{ height: 24, padding: '0 9px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, background: state[1] ? C.accSoft : C.soft, color: state[1] ? C.accTx : C.mut }}>
          <i style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />{state[0]}
        </span>
      </div>
      <b style={{ display: 'block', fontSize: 15, marginTop: 12 }}>{name}</b>
      <span style={{ display: 'block', color: C.mut, fontSize: 12.5, marginTop: 2 }}>{scope}</span>
      {extra ? <span style={{ display: 'block', color: C.mut, fontSize: 12.5 }}>{extra}</span> : null}
    </div>
  );
}

export function CrearOferta() {
  const frame = useCurrentFrame();
  const onOfertas = frame >= F.tab;
  const name = typed(frame, F.name + 6, 'Semana del helado', 16);
  const value = typed(frame, F.value + 6, '15', 8);
  const byCategory = frame >= F.target;
  const helados = frame >= F.cat;
  const saved = frame >= F.save;
  const scroll = track(frame, [[F.scroll, 0], [F.scroll + 18, 250]]);
  const tab = tabCenter('ofertas');
  const plus = { x: PW - 32 - 48, y: 166 };
  const P = {
    name: side(200, 136),
    kind: segCenter(192, 3, 0),
    value: side(200, 286),
    cartel: side(200, 362),
    target: segCenter(418, 3, 1),
    cat: side(44, 466 + 15),
    audience: segCenter(622, 2, 0),
    active: side(377, 792 - 250),
    save: side(286 + 55, 734 + 18),
    close: side(420 - 38, 40),
  };

  return (
    <AbsoluteFill style={{ background: C.page }}>
      <Camera keys={[
        [F.intro, 720, 405, 1], [F.tab - 4, 720, 300, 1.25], [F.plus + 8, 900, 300, 1.25],
        [F.name - 6, 1180, 260, 1.5], [F.value + 30, 1180, 300, 1.5], [F.target - 10, 1180, 470, 1.5], [F.audience + 10, 1180, 520, 1.5],
        [F.scroll + 10, 1180, 470, 1.5], [F.save - 10, 1180, 560, 1.35], [F.close + 12, 720, 405, 1], [F.close + 34, 560, 300, 1.45], [F.outro, 560, 300, 1.45],
      ]}>
        <PanelFrame title="Catálogo" subtitle="Productos, categorías, marcas, ofertas y precios" tabs={CATALOG_TABS} tab={onOfertas ? 'ofertas' : 'productos'} counts={{ productos: 8, categorias: 6, marcas: 3 }}>
          {onOfertas ? (
            <>
              <div style={{ position: 'absolute', left: MAIN_X, top: 156, color: C.mut, fontSize: 13 }}>Si un producto tiene más de una oferta, se aplica la que le deja el precio más bajo al cliente.</div>
              <Btn x={PW - 32 - 96} y={149} w={96}>+ Oferta</Btn>
              {saved ? <OfferCard x={MAIN_X} badge="-15%" state={['Activa', true]} name="Semana del helado" scope="Categorías: Helados" extra="Todos los clientes" opacity={Math.min(1, (frame - F.save) / 12)} /> : null}
              <OfferCard x={saved ? MAIN_X + 316 : MAIN_X} badge="-$ 2.000" state={['Pausada', false]} name="Liquidación panadería" scope="Categorías: Panadería" />
            </>
          ) : (
            <div style={{ position: 'absolute', left: MAIN_X, top: 146, width: 1140, height: 400, borderRadius: 18, border: `1px solid ${C.line}`, background: C.card }} />
          )}
          <Ring x={MAIN_X} y={210} w={300} h={138} from={F.close + 20} to={F.outro} r={18} />

          <Side
            from={F.plus + 4}
            to={F.close}
            kicker="Oferta nueva"
            title={name || 'Oferta nueva'}
            footer={<Btn x={286} y={18} w={110} h={36} kind="acc">Guardar</Btn>}
          >
            <div style={{ position: 'absolute', left: 0, right: 0, top: 80, bottom: 70, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: -80 - scroll, height: 1000 }}>
                <Label x={24} y={96}>Nombre (solo lo ves vos)</Label>
                <Input x={24} y={116} w={372} value={name} placeholder="Ej.: Semana del helado" focus={frame >= F.name && frame < F.kind} caret={frame >= F.name && frame < F.kind} />
                <Label x={24} y={172}>Tipo de descuento</Label>
                <Seg y={192} options={['% de descuento', '$ de descuento', 'Precio fijo']} on={0} />
                <Label x={24} y={246}>Porcentaje</Label>
                <Input x={24} y={266} w={372} value={value} placeholder="15" focus={frame >= F.value && frame < F.cartel} caret={frame >= F.value && frame < F.cartel} />
                <Label x={24} y={322}>Cartel en la tienda</Label>
                <Input x={24} y={342} w={372} value="Oferta" />
                <Label x={24} y={398}>¿A qué productos?</Label>
                <Seg y={418} options={['Todo', 'Categorías', 'Productos']} on={byCategory ? 1 : 0} />
                {byCategory ? (
                  <>
                    <div style={{ position: 'absolute', left: 24, top: 466, width: 372, borderRadius: 12, border: `1px solid ${C.line}`, padding: '4px 0' }}>
                      {['Helados', 'Insumos', 'Panadería'].map((label, index) => {
                        const on = index === 0 && helados;
                        return (
                          <div key={label} style={{ height: 30, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', fontSize: 13.5, fontWeight: 600 }}>
                            <span style={{ width: 17, height: 17, borderRadius: 5, border: `1.5px solid ${on ? C.acc : C.line2}`, background: on ? C.acc : 'transparent', color: C.accOn, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on ? '✓' : ''}</span>{label}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ position: 'absolute', left: 24, top: 570, color: C.mut, fontSize: 12 }}>Incluye lo que está dentro de cada categoría elegida.</div>
                  </>
                ) : null}
                <Label x={24} y={602}>¿Para quién?</Label>
                <Seg y={622} options={['Todos los clientes', 'Clientes elegidos']} on={0} />
                <Label x={24} y={678}>¿Cuándo? (opcional)</Label>
                <Input x={24} y={698} w={180} value="" placeholder="dd/mm/aaaa" />
                <Input x={216} y={698} w={180} value="" placeholder="dd/mm/aaaa" />
                <div style={{ position: 'absolute', left: 24, top: 744, color: C.mut, fontSize: 12 }}>Sin fechas, dura hasta que la pauses.</div>
                <div style={{ position: 'absolute', left: 24, top: 774, width: 372, display: 'flex', alignItems: 'center' }}>
                  <span style={{ flex: 1 }}><b style={{ display: 'block' }}>Oferta activa</b><span style={{ color: C.mut, fontSize: 12 }}>Apagala para pausarla sin borrarla</span></span>
                  <Toggle on />
                </div>
              </div>
            </div>
          </Side>
          <Ring x={SIDE_X + 24} y={SIDE_Y + 192} w={372} h={38} from={F.kind - 14} to={F.value - 4} r={12} />
          <Ring x={SIDE_X + 24} y={SIDE_Y + 342} w={372} h={40} from={F.cartel - 8} to={F.target - 8} r={11} />
          <Ring x={SIDE_X + 24} y={SIDE_Y + 622} w={372} h={38} from={F.audience - 10} to={F.scroll} r={12} />
          <Ring x={SIDE_X + 24} y={SIDE_Y + 678 - 250} w={372} h={130} from={F.active - 10} to={F.save - 10} r={14} />

          <Cursor
            show={[F.intro, F.outro]}
            keys={[
              [F.intro, 760, 520], [F.tab, tab.x, tab.y], [F.plus, plus.x, plus.y],
              [F.name, P.name.x, P.name.y], [F.kind, P.kind.x, P.kind.y], [F.value, P.value.x, P.value.y],
              [F.cartel, P.cartel.x, P.cartel.y], [F.target, P.target.x, P.target.y], [F.cat, P.cat.x, P.cat.y],
              [F.audience, P.audience.x, P.audience.y], [F.active, P.active.x + 0, P.active.y + 0],
              [F.save, P.save.x, P.save.y], [F.close, P.close.x, P.close.y], [F.close + 30, MAIN_X + 200, 300],
            ]}
            clicks={[F.tab, F.plus, F.name, F.kind, F.value, F.target, F.cat, F.save, F.close]}
          />
        </PanelFrame>
      </Camera>
      <Toast text="Oferta creada" from={F.save + 4} />

      <Captions steps={[
        [F.intro + 6, F.name - 4, 'Entrá a Catálogo › Ofertas y tocá + Oferta'],
        [F.name - 4, F.value - 4, 'Poné un nombre (solo lo ves vos) y el tipo de descuento'],
        [F.value - 4, F.target - 8, 'Escribí el valor y el cartel que ve el cliente'],
        [F.target - 8, F.audience - 8, 'Elegí a qué productos: todo, categorías o productos'],
        [F.audience - 8, F.scroll + 4, 'Para todos los clientes o solo para algunos'],
        [F.scroll + 4, F.save - 6, 'Las fechas son opcionales: sin fechas, dura hasta que la pauses'],
        [F.save - 6, F.close, 'Tocá Guardar', 'top'],
        [F.close, F.outro, 'Si un producto entra en varias ofertas, gana el precio más bajo'],
      ]} />
      <Intro kicker="Ayuda · Catálogo" title="Crear una oferta" time="8 pasos" dur={F.intro} />
      <Outro start={F.outro} title="Tu oferta ya está en la tienda" />
    </AbsoluteFill>
  );
}
