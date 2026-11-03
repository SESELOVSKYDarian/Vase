import assert from 'node:assert/strict';
import test from 'node:test';

import { applyOfferDiscount, isClassicOffer, offerFinalPrice, resolveBestOfferForProduct } from './offers.js';
import { computeBulkPrice } from './bulkPrice.js';

const CAT = '11111111-1111-4111-8111-111111111111';
const PROD = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';

test('las ofertas de siempre (solo porcentaje) se resuelven igual que antes', () => {
  const offers = [
    { id: 'a', enabled: true, percent: '10', user_ids: [], category_ids: [] },
    { id: 'b', enabled: true, percent: '15', user_ids: [], category_ids: [CAT] },
  ];
  const best = resolveBestOfferForProduct({ offers, userId: null, categoryIds: [CAT] });
  assert.equal(best.id, 'b');
  assert.equal(best.percent, 15);
  assert.equal(resolveBestOfferForProduct({ offers, userId: null, categoryIds: [] }).id, 'a');
});

test('con dos ofertas gana la que deja el precio más bajo para el cliente', () => {
  const offers = [
    { id: 'pct', enabled: true, kind: 'percent', value: 10, percent: 10 },
    { id: 'monto', enabled: true, kind: 'amount', value: 3000, percent: 0 },
    { id: 'fijo', enabled: true, kind: 'fixed', value: 9000, percent: 0, product_ids: [PROD] },
  ];
  const best = resolveBestOfferForProduct({ offers, userId: null, categoryIds: [], productId: PROD, price: 20000 });
  assert.equal(best.id, 'fijo');
  assert.equal(applyOfferDiscount(20000, best.percent), 9000);
  const other = resolveBestOfferForProduct({ offers, userId: null, categoryIds: [], productId: 'otro', price: 20000 });
  assert.equal(other.id, 'monto');
  assert.equal(applyOfferDiscount(20000, other.percent), 17000);
});

test('un precio fijo más caro que el actual no se aplica', () => {
  assert.equal(offerFinalPrice({ kind: 'fixed', value: 5000 }, 4000), null);
  const best = resolveBestOfferForProduct({ offers: [{ id: 'f', enabled: true, kind: 'fixed', value: 5000 }], categoryIds: [], price: 4000 });
  assert.equal(best.id, null);
});

test('las fechas y los clientes limitan la oferta', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  const offers = [
    { id: 'vencida', enabled: true, kind: 'percent', value: 50, ends_at: '2026-11-01T00:00:00Z' },
    { id: 'futura', enabled: true, kind: 'percent', value: 40, starts_at: '2026-12-01T00:00:00Z' },
    { id: 'cliente', enabled: true, kind: 'percent', value: 20, user_ids: [USER] },
  ];
  assert.equal(resolveBestOfferForProduct({ offers, categoryIds: [], price: 100, now }).id, null);
  assert.equal(resolveBestOfferForProduct({ offers, userId: USER, categoryIds: [], price: 100, now }).id, 'cliente');
});

test('solo las clásicas guardan el porcentaje para versiones anteriores', () => {
  assert.equal(isClassicOffer({ kind: 'percent', product_ids: [], starts_at: null, ends_at: null }), true);
  assert.equal(isClassicOffer({ kind: 'amount' }), false);
  assert.equal(isClassicOffer({ kind: 'percent', product_ids: [PROD] }), false);
  assert.equal(isClassicOffer({ kind: 'percent', ends_at: '2026-12-01' }), false);
});

test('cambiar precios en bloque: subir, bajar y cambiar a', () => {
  assert.equal(computeBulkPrice(1000, { mode: 'raise', amount: 8, unit: 'percent' }), 1080);
  assert.equal(computeBulkPrice(1000, { mode: 'lower', amount: 10, unit: 'percent' }), 900);
  assert.equal(computeBulkPrice(1000, { mode: 'raise', amount: 250, unit: 'amount' }), 1250);
  assert.equal(computeBulkPrice(100, { mode: 'lower', amount: 250, unit: 'amount' }), 0);
  assert.equal(computeBulkPrice(1000, { mode: 'set', amount: 1999.99, unit: 'amount' }), 1999.99);
});

test('ofertas para una lista de precios: solo para los clientes de esa lista', () => {
  const offers = [{ id: 'l', enabled: true, kind: 'percent', value: 10, user_ids: [], price_list_ids: ['lista-mayo'], category_ids: [] }];
  const base = { offers, categoryIds: [], productId: 'p', price: 1000 };
  assert.equal(resolveBestOfferForProduct({ ...base, userId: 'u1', priceListId: 'lista-mayo' }).id, 'l');
  assert.equal(resolveBestOfferForProduct({ ...base, userId: 'u1', priceListId: 'otra' }).id, null);
  assert.equal(resolveBestOfferForProduct({ ...base, userId: null, priceListId: null }).id, null);
  // Con lista no es "clásica": guarda percent = 0 y una versión anterior la ignora.
  assert.equal(isClassicOffer({ kind: 'percent', price_list_ids: ['lista-mayo'] }), false);
  assert.equal(isClassicOffer({ kind: 'percent', price_list_ids: [] }), true);
});
