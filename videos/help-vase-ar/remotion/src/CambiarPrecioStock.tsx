import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import {
  Btn, C, CATALOG_TABS, Camera, Captions, Cursor, Input, Intro, Label, Outro, PanelFrame, Ring, SIDE_X, SIDE_Y, Side, Toast, Toggle, s, typed,
} from './kit';
import { ProductTable, productName, stockPlus, T } from './ProductTable';

// Guía: Cambiar precio o stock (Catálogo › Productos).
const F = {
  intro: s(2.5),
  search: s(3.6), type: s(4),
  plus: [s(8.4), s(9.1), s(9.8)],
  openRow: s(13.2),
  priceClick: s(17.4), priceType: s(18),
  save: s(23.6),
  tabMas: s(27.4), lock: s(30.4), save2: s(32.4),
  outro: s(35.2),
};
export const CAMBIAR_PRECIO_FRAMES = F.outro + s(2.8);

const side = (x: number, y: number) => ({ x: SIDE_X + x, y: SIDE_Y + y });
const P = {
  price: side(24 + 89, 246 + 20),
  save: side(286 + 55, 734 + 18),
  tabMas: side(270 + 16, 104),
  lock: side(352 + 19, 316 + 50),
};

export function CambiarPrecioStock() {
  const frame = useCurrentFrame();
  const query = typed(frame, F.type, 'chocolate');
  const stock = 12 + F.plus.filter((f) => frame >= f).length;
  const priceSaved = frame >= F.save;
  const masTab = frame >= F.tabMas;
  const locked = frame >= F.lock;
  const priceText = frame < F.priceClick ? '18.500' : frame < F.priceType ? '' : typed(frame, F.priceType, '19.900', 10);
  const plus = stockPlus(0);
  const row = productName(0);

  return (
    <AbsoluteFill style={{ background: C.page }}>
      <Camera keys={[
        [F.intro, 720, 405, 1], [F.search - 6, 560, 300, 1.45], [F.plus[0] - 30, 560, 300, 1.45],
        [F.plus[0] - 4, 980, 300, 1.6], [F.plus[2] + 30, 980, 300, 1.6],
        [F.openRow + 10, 720, 405, 1], [F.priceClick - 10, 1180, 330, 1.55], [F.save + 20, 1180, 560, 1.35],
        [F.tabMas - 8, 1180, 300, 1.4], [F.save2 + 30, 1180, 420, 1.4], [F.outro, 720, 405, 1],
      ]}>
        <PanelFrame title="Catálogo" subtitle="Productos, categorías, marcas, ofertas y precios" tabs={CATALOG_TABS} tab="productos" counts={{ productos: 8, categorias: 6, marcas: 3 }}>
          <ProductTable
            query={query}
            focusSearch={frame >= F.search && frame < F.plus[0] - 20}
            caret={frame >= F.search && frame < F.plus[0] - 20}
            rows={{ p1: { stock, price: priceSaved ? 19900 : 18500 } }}
            activeId={frame >= F.openRow ? 'p1' : undefined}
          />
          <Ring x={T.searchX} y={T.barY} w={T.searchW} h={40} from={F.search - 14} to={F.type + s(1.6)} />
          <Ring x={plus.x - 82} y={plus.y - 15} w={96} h={30} from={F.plus[0] - 16} to={F.plus[2] + 24} r={10} />

          <Side
            from={F.openRow + 4}
            to={F.outro + 40}
            kicker="Producto"
            title="Helado Chocolate x 5 kg"
            footer={<>
              <Btn x={24} y={18} w={96} h={36} kind="red">Eliminar</Btn>
              <Btn x={286} y={18} w={110} h={36} kind="acc">Guardar</Btn>
            </>}
          >
            <div style={{ position: 'absolute', left: 24, top: 92, display: 'flex', gap: 22, fontWeight: 700, fontSize: 13.5 }}>
              {['Datos', 'Fotos y descripción', 'Más'].map((label) => {
                const on = masTab ? label === 'Más' : label === 'Datos';
                return <span key={label} style={{ color: on ? C.tx : C.mut, paddingBottom: 8, borderBottom: `2px solid ${on ? C.acc : 'transparent'}`, width: label === 'Datos' ? 44 : undefined }}>{label}</span>;
              })}
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 122, height: 1, background: C.line }} />
            {!masTab ? (
              <>
                <Label x={24} y={146}>Nombre</Label>
                <Input x={24} y={166} w={372} value="Helado Chocolate x 5 kg" />
                <Label x={24} y={226}>Precio</Label>
                <Input x={24} y={246} w={178} value={priceText} focus={frame >= F.priceClick && frame < F.save} caret={frame >= F.priceClick && frame < F.save} />
                <Label x={218} y={226}>Stock</Label>
                <div style={{ position: 'absolute', left: 218, top: 246, width: 178, height: 40, borderRadius: 11, border: `1px solid ${C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', fontWeight: 800 }}>
                  <span style={{ color: C.mut }}>−</span>{stock}<span style={{ color: C.mut }}>+</span>
                </div>
                <div style={{ position: 'absolute', left: 24, top: 300, width: 372, color: C.mut, fontSize: 12.5, lineHeight: 1.5 }}>
                  Precio y stock llegan de tu sistema: si cambiás el precio acá, la próxima sincronización pone el del sistema, salvo que actives “No pisar mis cambios” (en Más).
                </div>
                <div style={{ position: 'absolute', left: 24, top: 380, width: 372, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: `1px solid ${C.line}` }}>
                  <span style={{ flex: 1 }}><b style={{ display: 'block' }}>3 precios del sistema</b><span style={{ color: C.mut, fontSize: 12 }}>Lista 1 $18.500 · Mayorista $15.900 · …</span></span>
                  <span style={{ height: 30, padding: '0 12px', borderRadius: 10, border: `1px solid ${C.line2}`, display: 'flex', alignItems: 'center', fontWeight: 800, fontSize: 12.5 }}>Ver precios</span>
                </div>
                {[['Visible en la tienda', 'Apagalo para ocultarlo sin borrarlo', true], ['Destacado en Inicio', 'Sale en los productos destacados', false]].map(([title, sub, on], index) => (
                  <div key={title as string} style={{ position: 'absolute', left: 24, top: 470 + index * 62, width: 372, display: 'flex', alignItems: 'center' }}>
                    <span style={{ flex: 1 }}><b style={{ display: 'block' }}>{title}</b><span style={{ color: C.mut, fontSize: 12 }}>{sub}</span></span>
                    <Toggle on={on as boolean} />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div style={{ position: 'absolute', left: 24, top: 146, width: 372 }}>
                  <b style={{ display: 'block' }}>Variantes</b>
                  <span style={{ color: C.mut, fontSize: 12.5 }}>Productos iguales con distinto sabor o tamaño.</span>
                </div>
                <div style={{ position: 'absolute', left: 24, top: 214, width: 372 }}>
                  <b style={{ display: 'block' }}>Ficha técnica</b>
                  <span style={{ color: C.mut, fontSize: 12.5 }}>Subí un PDF y aparece “Descargar ficha técnica”.</span>
                </div>
                <div style={{ position: 'absolute', left: 24, top: 290, color: C.mut, fontSize: 12, fontWeight: 700 }}>Sistema de gestión</div>
                <div style={{ position: 'absolute', left: 24, top: 316, width: 372, minHeight: 58, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 14, border: `1px solid ${locked ? C.accLine : C.line}`, background: locked ? C.accSoft : 'transparent' }}>
                  <span style={{ flex: 1 }}><b style={{ display: 'block' }}>No pisar mis cambios</b><span style={{ color: C.mut, fontSize: 12 }}>La sincronización no cambia nombre, SKU, descripción, marca ni precio. El stock se sigue actualizando.</span></span>
                  <Toggle on={locked} />
                </div>
              </>
            )}
          </Side>
          <Ring x={SIDE_X + 24} y={SIDE_Y + 246} w={178} h={40} from={F.priceClick - 16} to={F.save - 20} r={11} />
          <Ring x={SIDE_X + 24} y={SIDE_Y + 316} w={372} h={100} from={F.lock - 24} to={F.save2 - 8} r={14} />

          <Cursor
            show={[F.intro, F.outro]}
            keys={[
              [F.intro, 760, 520], [F.search, T.searchX + 120, T.barY + 20],
              [F.plus[0], plus.x, plus.y], [F.plus[2] + 20, plus.x, plus.y],
              [F.openRow, row.x, row.y], [F.priceClick, P.price.x, P.price.y],
              [F.save, P.save.x, P.save.y], [F.tabMas, P.tabMas.x, P.tabMas.y],
              [F.lock, P.lock.x, P.lock.y], [F.save2, P.save.x, P.save.y],
            ]}
            clicks={[F.search, ...F.plus, F.openRow, F.priceClick, F.save, F.tabMas, F.lock, F.save2]}
          />
        </PanelFrame>
      </Camera>
      <Toast text="Producto guardado" from={F.save + 4} />
      <Toast text="Producto guardado" from={F.save2 + 4} />

      <Captions steps={[
        [F.intro + 6, s(7.4), 'Entrá a Catálogo y buscá el producto por nombre, SKU o marca'],
        [s(7.4), s(12.4), 'Tocá + o − en Stock: se guarda al instante'],
        [s(12.4), s(16.6), 'Para cambiar el precio, tocá el producto'],
        [s(16.6), s(22.8), 'Escribí el precio nuevo en Datos'],
        [s(22.8), s(26.6), 'Tocá Guardar y ya se ve en la tienda', 'top'],
        [s(26.6), F.outro, '¿Viene de tu sistema? En Más, activá “No pisar mis cambios”', 'top'],
      ]} />
      <Intro kicker="Ayuda · Catálogo" title="Cambiar precio o stock" time="6 pasos" dur={F.intro} />
      <Outro start={F.outro} title="Precio y stock al día" />
    </AbsoluteFill>
  );
}
