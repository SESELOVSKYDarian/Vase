import React from 'react';
import { C, Icon, MAIN_X, PRODUCTS, Product, Thumb, Toggle, money } from './kit';

// Geometría de la tabla de Productos (coordenadas del lienzo 1440×810).
export const T = {
  barY: 146,
  searchX: MAIN_X, searchW: 270,
  tableY: 204, headH: 44, rowH: 58,
  left: MAIN_X, width: 1140,
};
export const rowY = (index: number) => T.tableY + T.headH + T.rowH * index + T.rowH / 2;
export const COL = { check: 20, product: 66, cat: 520, priceEnd: 770, stock: 830, visible: 1030 };
export const stockPlus = (index: number) => ({ x: T.left + COL.stock + 82, y: rowY(index) });
export const productName = (index: number) => ({ x: T.left + COL.product + 150, y: rowY(index) });

export function ProductTable({ query = '', rows: overrides = {}, focusSearch = false, caret = false, activeId }: {
  query?: string; rows?: Record<string, Partial<Product>>; focusSearch?: boolean; caret?: boolean; activeId?: string;
}) {
  const q = query.trim().toLowerCase();
  const list = PRODUCTS.map((product) => ({ ...product, ...(overrides[product.id] || {}) })).filter((product) => !q || `${product.name} ${product.sku}`.toLowerCase().includes(q));
  const filters: [string, number][] = [['Todos', PRODUCTS.length], ['Helados', 4], ['Insumos', 2], ['Panadería', 2]];
  return (
    <>
      <div style={{ position: 'absolute', left: T.searchX, top: T.barY, width: T.searchW, height: 40, borderRadius: 12, border: `1px solid ${focusSearch ? C.acc : C.line}`, background: C.card, display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px', color: query ? C.tx : C.mut2, fontSize: 14 }}>
        <Icon name="search" size={15} color={C.mut} />{query || 'Nombre, SKU o marca'}{caret ? <span style={{ width: 1.5, height: 17, background: C.acc }} /> : null}
      </div>
      <div style={{ position: 'absolute', left: T.searchX + T.searchW + 12, top: T.barY, display: 'flex', gap: 8 }}>
        {filters.map(([label, count], index) => (
          <span key={label} style={{ height: 40, padding: '0 15px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13.5, background: index === 0 ? C.active : 'transparent', border: `1px solid ${index === 0 ? C.line2 : C.line}`, color: index === 0 ? C.tx : C.mut }}>
            {label}<em style={{ fontStyle: 'normal', color: C.mut2, fontSize: 12 }}>{count}</em>
          </span>
        ))}
      </div>
      <div style={{ position: 'absolute', right: 32, top: T.barY + 3, height: 34, padding: '0 14px', borderRadius: 11, background: C.tx, color: C.inkOn, fontWeight: 800, display: 'flex', alignItems: 'center' }}>+ Producto</div>

      <div style={{ position: 'absolute', left: T.left, top: T.tableY, width: T.width, height: T.headH + T.rowH * Math.max(list.length, 1), borderRadius: 18, border: `1px solid ${C.line}`, background: C.card, overflow: 'hidden' }}>
        <div style={{ position: 'relative', height: T.headH, color: C.mut, fontSize: 12.5, fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>
          {[['Elegir', COL.check], ['Producto', COL.product], ['Categoría', COL.cat], ['Stock', COL.stock], ['Visible', COL.visible]].map(([label, x]) => (
            <span key={label as string} style={{ position: 'absolute', left: x as number, top: 14 }}>{label}</span>
          ))}
          <span style={{ position: 'absolute', right: T.width - COL.priceEnd, top: 14 }}>Precio</span>
        </div>
        {list.map((product) => (
          <div key={product.id} style={{ position: 'relative', height: T.rowH, borderBottom: `1px solid ${C.line}`, background: product.id === activeId ? C.hover : 'transparent' }}>
            <span style={{ position: 'absolute', left: COL.check, top: 19, width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${C.line2}` }} />
            <span style={{ position: 'absolute', left: COL.product, top: 11, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Thumb color={product.img} />
              <span><b style={{ display: 'block', fontSize: 14 }}>{product.name}</b><span style={{ color: C.mut, fontSize: 12 }}>SKU {product.sku}</span></span>
            </span>
            <span style={{ position: 'absolute', left: COL.cat, top: 17, height: 24, padding: '0 10px', borderRadius: 8, background: C.soft, color: C.mut, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center' }}>{product.cat}</span>
            <span style={{ position: 'absolute', right: T.width - COL.priceEnd, top: product.tiers ? 10 : 19, textAlign: 'right' }}>
              <b style={{ fontSize: 14 }}>{money(product.price)}</b>
              {product.tiers ? <span style={{ display: 'block', color: C.mut, fontSize: 11.5, fontWeight: 700 }}>{product.tiers} precios ▾</span> : null}
            </span>
            <span style={{ position: 'absolute', left: COL.stock, top: 14, display: 'flex', alignItems: 'center', height: 30, borderRadius: 10, border: `1px solid ${product.stock <= 0 ? C.redLine : C.line2}` }}>
              <span style={{ width: 28, textAlign: 'center', color: product.stock <= 0 ? C.mut2 : C.mut, fontWeight: 700 }}>−</span>
              <span style={{ width: 40, textAlign: 'center', fontWeight: 800, color: product.stock <= 0 ? C.red : C.tx }}>{product.stock}</span>
              <span style={{ width: 28, textAlign: 'center', color: C.mut, fontWeight: 700 }}>+</span>
            </span>
            <span style={{ position: 'absolute', left: COL.visible, top: 18 }}><Toggle on /></span>
          </div>
        ))}
      </div>
    </>
  );
}
