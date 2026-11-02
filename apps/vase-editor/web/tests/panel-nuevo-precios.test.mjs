import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    bulkPriceError,
    bulkPricePayload,
    draftToOfferPayload,
    offerBadge,
    offerDraftError,
    offerScope,
    offerState,
    offerToDraft,
} from '../src/panel/catalog/pricing.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('cartel de cada tipo de oferta', () => {
    assert.equal(offerBadge({ kind: 'percent', value: 15 }), '-15%');
    assert.equal(offerBadge({ percent: '10.00' }), '-10%'); // ofertas de antes
    assert.equal(offerBadge({ kind: 'amount', value: 3000 }), `-$${(3000).toLocaleString('es-AR')}`);
    assert.equal(offerBadge({ kind: 'fixed', value: 9000 }), `$${(9000).toLocaleString('es-AR')}`);
});

test('estado de la oferta según fechas y pausa', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    assert.equal(offerState({ enabled: false }, now).label, 'Pausada');
    assert.equal(offerState({ enabled: true, ends_at: '2026-11-01T00:00:00Z' }, now).label, 'Terminó');
    assert.equal(offerState({ enabled: true, starts_at: '2026-12-01T00:00:00Z' }, now).label, 'Programada');
    assert.equal(offerState({ enabled: true }, now).label, 'Activa');
});

test('la oferta se arma y se vuelve a leer igual', () => {
    const draft = { ...offerToDraft(), name: 'Semana', kind: 'amount', value: '3.000', target: 'categories', category_ids: ['c1'], product_ids: ['p1'] };
    const payload = draftToOfferPayload(draft);
    assert.equal(payload.value, 3000);
    assert.deepEqual(payload.category_ids, ['c1']);
    assert.deepEqual(payload.product_ids, []); // solo lo que corresponde al alcance elegido
    assert.equal(payload.starts_at, null);
    assert.equal(offerDraftError({ ...draft, name: '' }), 'Ponele un nombre');
    assert.equal(offerDraftError({ ...draft, kind: 'percent', value: '120' }), 'El porcentaje no puede pasar de 100');
    assert.equal(offerDraftError({ ...draft, target: 'products', product_ids: [] }), 'Elegí al menos un producto');
    assert.equal(offerDraftError(draft), null);
    assert.equal(offerScope({ category_ids: ['c1'], user_ids: [] }, { categories: [{ id: 'c1', name: 'Heladería' }] }), 'Heladería · todos los clientes');
});

test('cambiar precios arma el pedido al servidor', () => {
    const form = { mode: 'raise', amount: '8', unit: 'percent', field: 'price', scope: 'brand', scopeId: 'Sabor y Color' };
    assert.deepEqual(bulkPricePayload(form), { mode: 'raise', amount: 8, unit: 'percent', field: 'price', category_id: null, brand: 'Sabor y Color', apply: false });
    assert.equal(bulkPricePayload({ ...form, mode: 'set', amount: '1.500' }, true).unit, 'amount');
    assert.equal(bulkPricePayload({ ...form, mode: 'set', amount: '1.500' }, true).amount, 1500);
    assert.equal(bulkPriceError({ ...form, amount: '' }), 'Escribí un número');
    assert.equal(bulkPriceError({ ...form, mode: 'lower', amount: '100' }), 'No se puede bajar 100% o más');
    assert.equal(bulkPriceError({ ...form, scopeId: '' }), 'Elegí una marca');
    assert.equal(bulkPriceError(form), null);
});

test('Ofertas, Cambiar precios y Precios y listas ya están en el panel nuevo', async () => {
    const catalogo = await read('../src/panel/catalog/Catalogo.jsx');
    assert.doesNotMatch(catalogo, /ComingSoon/);
    assert.match(catalogo, /<Ofertas /);
    assert.match(catalogo, /<Precios/);
    const app = await read('../src/panel/PanelApp.jsx');
    assert.match(app, /sub === 'precios'\) \{\s*content = <AjustesPrecios/);
    const inspector = await read('../src/panel/catalog/ProductInspector.jsx');
    assert.match(inspector, /marca ni precio\. El stock se sigue actualizando/);
});
