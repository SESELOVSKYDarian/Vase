import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import {
  Btn, C, CATALOG_TABS, Camera, Captions, Cursor, Intro, MAIN_X, Outro, PanelFrame, Ring, Toast, fade, money, s, tabCenter, typed,
} from './kit';

// Guía: Subir precios de un rubro (Catálogo › Cambiar precios).
const F = {
  intro: s(2.5),
  tab: s(3.6),
  scope: s(6), scopePick: s(7.2),
  cat: s(8.6), catPick: s(9.8),
  amount: s(11.4), preview: s(12.6),
  lock: s(18), apply: s(21), confirm: s(23),
  outro: s(27),
};
export const SUBIR_PRECIOS_FRAMES = F.outro + s(2.8);

const CARD_X = MAIN_X;
const CARD_W = 1140;
const C1 = 146;
const C2 = 332;
const SY = C1 + 96; // fila de la frase

type Part = { kind: 'slot' | 'word' | 'input'; text: string; w: number; id?: string };

function layout(parts: Part[]) {
  let x = CARD_X + 24;
  return parts.map((part) => {
    const item = { ...part, x };
    x += part.w + 8;
    return item;
  });
}

const ROWS: [string, number][] = [
  ['Helado Chocolate x 5 kg', 18500], ['Helado Dulce de leche x 5 kg', 18500], ['Helado Frutilla x 5 kg', 17900], ['Helado Limón x 5 kg', 17900],
];

function Menu({ x, y, options, pick, from, to }: { x: number; y: number; options: [string, number?][]; pick: number; from: number; to: number }) {
  const frame = useCurrentFrame();
  const o = Math.min(fade(frame, from, 6), 1 - fade(frame, to, 6));
  if (o <= 0) return null;
  const hot = frame >= to - 10;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 230, padding: 6, borderRadius: 14, background: C.card, border: `1px solid ${C.line2}`, boxShadow: `0 24px 60px ${C.shadow}`, opacity: o, transform: `translateY(${(1 - o) * -6}px)`, zIndex: 45 }}>
      {options.map(([label, depth = 0], index) => (
        <div key={label} style={{ height: 34, display: 'flex', alignItems: 'center', padding: `0 10px 0 ${10 + depth * 16}px`, borderRadius: 9, fontWeight: depth ? 600 : 700, color: depth ? C.mut : C.tx, background: hot && index === pick ? C.active : 'transparent' }}>{label}</div>
      ))}
    </div>
  );
}

export function SubirPreciosRubro() {
  const frame = useCurrentFrame();
  const onTab = frame >= F.tab;
  const byCat = frame >= F.scopePick;
  const catChosen = frame >= F.catPick;
  const applied = frame >= F.confirm;
  const amount = applied ? '' : typed(frame, F.amount + 6, '8', 6);
  const showPreview = frame >= F.preview && !applied;
  const locked = frame >= F.lock && !applied;
  const confirming = frame >= F.apply && !applied;

  const parts = layout([
    { kind: 'slot', text: 'Subir', w: 82 },
    { kind: 'word', text: 'el', w: 16 },
    { kind: 'slot', text: 'precio minorista', w: 160 },
    { kind: 'word', text: 'un', w: 22 },
    { kind: 'input', text: amount, w: 58, id: 'amount' },
    { kind: 'slot', text: '%', w: 50 },
    { kind: 'word', text: 'de', w: 22 },
    { kind: 'slot', text: byCat && !applied ? 'un rubro o categoría' : 'todo el catálogo', w: byCat && !applied ? 190 : 150, id: 'scope' },
    ...(byCat && !applied ? [{ kind: 'slot' as const, text: catChosen ? 'Heladería' : 'elegí…', w: 110, id: 'cat' }] : []),
    { kind: 'word', text: 'para', w: 36 },
    { kind: 'slot', text: 'todos los clientes', w: 170 },
  ]);
  const at = (id: string) => {
    const part = parts.find((item) => item.id === id);
    return part ? { x: part.x + part.w / 2, y: SY + 19, left: part.x } : { x: 0, y: 0, left: 0 };
  };
  // posiciones finales (después de elegir rubro) para el cursor
  const scopeAt = { x: CARD_X + 24 + (82 + 16 + 160 + 22 + 58 + 50 + 22 + 7 * 8) + 75, y: SY + 19 };
  const catLeft = CARD_X + 24 + (82 + 16 + 160 + 22 + 58 + 50 + 22 + 190 + 8 * 8);
  const amountAt = at('amount');
  const tab = tabCenter('precios');
  const lockBox = { x: CARD_X + 24, y: C2 + 82 };
  const checkAt = { x: lockBox.x + 26, y: lockBox.y + 60 };
  const applyAt = { x: CARD_X + CARD_W - 24 - 50, y: C2 + 422 };
  const confirmAt = { x: CARD_X + CARD_W - 24 - 105, y: C2 + 422 };

  return (
    <AbsoluteFill style={{ background: C.page }}>
      <Camera keys={[
        [F.intro, 720, 405, 1], [F.tab - 4, 720, 300, 1.2], [F.scope - 8, 760, 300, 1.45], [F.amount + 20, 760, 300, 1.45],
        [F.preview + 24, 820, 560, 1.3], [F.lock - 30, 820, 560, 1.3], [F.lock - 6, 700, 470, 1.55], [F.lock + 34, 700, 470, 1.55],
        [F.apply - 8, 1100, 680, 1.5], [F.confirm + 30, 1000, 600, 1.2], [F.outro, 720, 405, 1],
      ]}>
        <PanelFrame title="Catálogo" subtitle="Productos, categorías, marcas, ofertas y precios" tabs={CATALOG_TABS} tab={onTab ? 'precios' : 'productos'} counts={{ productos: 8, categorias: 6, marcas: 3 }}>
          {!onTab ? <div style={{ position: 'absolute', left: MAIN_X, top: 146, width: 1140, height: 400, borderRadius: 18, border: `1px solid ${C.line}`, background: C.card }} /> : (
            <>
              <div style={{ position: 'absolute', left: CARD_X, top: C1, width: CARD_W, height: 170, borderRadius: 18, border: `1px solid ${C.line}`, background: C.card }}>
                <div style={{ position: 'absolute', left: 24, top: 20, fontSize: 17, fontWeight: 800 }}>Cambiar precios de muchos productos a la vez</div>
                <div style={{ position: 'absolute', left: 24, top: 48, color: C.mut, fontSize: 13.5 }}>Armá la frase. Abajo ves cómo quedan; no se cambia nada hasta que toques Aplicar.</div>
                <div style={{ position: 'absolute', left: 24, top: 140, color: C.mut, fontSize: 12.5 }}>Cambia el precio del producto: lo ven todos los clientes.</div>
              </div>
              {parts.map((part) => part.kind === 'word' ? (
                <span key={part.text} style={{ position: 'absolute', left: part.x, top: SY + 9, width: part.w, color: C.mut, fontWeight: 600, fontSize: 15, textAlign: 'center' }}>{part.text}</span>
              ) : (
                <span key={part.id || part.text} style={{ position: 'absolute', left: part.x, top: SY, width: part.w, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 800, fontSize: 14.5, color: part.text === 'elegí…' ? C.mut : C.accTx, background: C.accSoft, border: `1px solid ${part.kind === 'input' && frame >= F.amount && frame < F.preview + 10 ? C.acc : C.accLine}` }}>
                  {part.kind === 'input' ? (part.text || <span style={{ color: C.mut2 }}>8</span>) : part.text}{part.kind === 'slot' ? <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span> : null}
                </span>
              ))}
              <Menu x={scopeAt.x - 75} y={SY + 44} options={[['todo el catálogo'], ['un rubro o categoría'], ['una marca']]} pick={1} from={F.scope + 2} to={F.scopePick} />
              <Menu x={catLeft} y={SY + 44} options={[['Heladería'], ['Helados', 1], ['Salsas y toppings', 1], ['Panadería'], ['Congelados', 1]]} pick={0} from={F.cat + 2} to={F.catPick} />

              <div style={{ position: 'absolute', left: CARD_X, top: C2, width: CARD_W, height: 460, borderRadius: 18, border: `1px solid ${C.line}`, background: C.card }}>
                <div style={{ position: 'absolute', left: 24, top: 20, fontSize: 17, fontWeight: 800 }}>Cómo quedan</div>
                {!showPreview ? (
                  <div style={{ position: 'absolute', left: 24, top: 52, color: C.mut, fontSize: 13.5 }}>{frame >= F.amount + 8 && !applied ? 'Calculando…' : 'Escribí cuánto querés cambiar.'}</div>
                ) : (
                  <div style={{ opacity: fade(frame, F.preview, 10) }}>
                    <div style={{ position: 'absolute', left: 24, top: 52, fontSize: 14 }}>Cambia el precio de <b>6</b> de 6 productos.</div>
                    <div style={{ position: 'absolute', left: 24, top: 82, width: CARD_W - 48, padding: '12px 16px', borderRadius: 14, background: C.warnSoft, fontSize: 13.5, lineHeight: 1.5 }}>
                      <b>6</b> de estos productos vienen de tu sistema de gestión.
                      {locked ? ' Van a quedar fijos en el precio nuevo: la sincronización ya no les cambia el precio.' : ' En la próxima sincronización vuelven al precio del sistema, salvo los que tengan activado “No pisar mis cambios”.'}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, fontWeight: 700 }}>
                        <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${locked ? C.acc : C.line2}`, background: locked ? C.acc : 'transparent', color: C.accOn, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{locked ? '✓' : ''}</span>
                        Mantener fijos estos precios aunque cambien en el sistema de gestión
                      </div>
                    </div>
                    <div style={{ position: 'absolute', left: 24, top: 186, width: CARD_W - 48 }}>
                      <div style={{ display: 'flex', height: 34, alignItems: 'center', color: C.mut, fontSize: 12.5, fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>
                        <span style={{ width: 520 }}>Producto</span><span>Minorista</span>
                      </div>
                      {ROWS.map(([name, price], index) => (
                        <div key={name} style={{ display: 'flex', height: 38, alignItems: 'center', borderBottom: `1px solid ${C.line}`, fontSize: 14, opacity: fade(frame, F.preview + index * 3, 8) }}>
                          <b style={{ width: 520 }}>{name}</b>
                          <span style={{ color: C.mut }}>{money(price)} → <b style={{ color: C.accTx }}>{money(price * 1.08)}</b></span>
                        </div>
                      ))}
                      <div style={{ color: C.mut, fontSize: 12.5, marginTop: 8 }}>y 2 productos más.</div>
                    </div>
                  </div>
                )}
                {confirming ? <span style={{ position: 'absolute', right: 24 + 210 + 10 + 100 + 14, top: 412, color: C.mut, fontSize: 12.5 }}>Se cambia enseguida en la tienda.</span> : null}
              </div>
              {confirming ? (
                <>
                  <Btn x={CARD_X + CARD_W - 24 - 210 - 10 - 100} y={C2 + 404} w={100} h={36} kind="soft">Cancelar</Btn>
                  <Btn x={CARD_X + CARD_W - 24 - 210} y={C2 + 404} w={210} h={36} kind="acc">Sí, aplicar a 6 productos</Btn>
                </>
              ) : (
                <>
                  <Btn x={CARD_X + CARD_W - 24 - 100 - 10 - 100} y={C2 + 404} w={100} h={36} kind="soft">Cancelar</Btn>
                  <Btn x={CARD_X + CARD_W - 24 - 100} y={C2 + 404} w={100} h={36} kind="acc" style={{ opacity: showPreview ? 1 : 0.4 }}>Aplicar</Btn>
                </>
              )}
              <Ring x={amountAt.left} y={SY} w={58} h={38} from={F.amount - 10} to={F.preview + 6} r={11} />
              <Ring x={CARD_X + 24} y={C2 + 186} w={CARD_W - 48} h={190} from={F.preview + 20} to={F.lock - 30} r={12} />
              <Ring x={lockBox.x} y={lockBox.y} w={CARD_W - 48} h={92} from={F.lock - 20} to={F.apply - 16} r={14} />
            </>
          )}

          <Cursor
            show={[F.intro, F.outro]}
            keys={[
              [F.intro, 760, 520], [F.tab, tab.x, tab.y],
              [F.scope, CARD_X + 24 + (82 + 16 + 160 + 22 + 58 + 50 + 22 + 7 * 8) + 60, SY + 19],
              [F.scopePick, scopeAt.x - 20, SY + 44 + 6 + 34 + 17],
              [F.cat, catLeft + 55, SY + 19], [F.catPick, catLeft + 50, SY + 44 + 6 + 17],
              [F.amount, amountAt.x, amountAt.y], [F.lock, checkAt.x, checkAt.y],
              [F.apply, applyAt.x, applyAt.y], [F.confirm, confirmAt.x, confirmAt.y], [F.confirm + 30, confirmAt.x - 60, confirmAt.y - 80],
            ]}
            clicks={[F.tab, F.scope, F.scopePick, F.cat, F.catPick, F.amount, F.lock, F.apply, F.confirm]}
          />
        </PanelFrame>
      </Camera>
      <Toast text="Listo: cambiaste el precio de 6 productos y 6 quedaron fijos" from={F.confirm + 4} dur={s(2.8)} />

      <Captions steps={[
        [F.intro + 6, F.scope - 4, 'Entrá a Catálogo › Cambiar precios'],
        [F.scope - 4, F.amount - 6, 'Armá la frase: elegí el rubro tocando cada parte'],
        [F.amount - 6, F.preview + 20, 'Escribí cuánto: en % o en pesos'],
        [F.preview + 20, F.lock - 24, 'Abajo ves el precio de antes y el de después. Todavía no cambió nada'],
        [F.lock - 24, F.apply - 10, '¿Vienen de tu sistema? Tildá “Mantener fijos” para que no vuelvan'],
        [F.apply - 10, F.confirm, 'Tocá Aplicar y confirmá', 'top'],
        [F.confirm + 6, F.outro, 'Listo: el precio nuevo ya se ve en la tienda'],
      ]} />
      <Intro kicker="Ayuda · Catálogo" title="Subir precios de un rubro" time="7 pasos" dur={F.intro} />
      <Outro start={F.outro} title="Precios actualizados" />
    </AbsoluteFill>
  );
}
