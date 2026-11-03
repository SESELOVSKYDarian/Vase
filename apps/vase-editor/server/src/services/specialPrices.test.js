import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSpecialPrices } from './specialPrices.js';
import { guestPriceListId, resolveEffectiveProductPrice } from './userPricing.js';
import { normalizePriceAdjustments } from './pricing.js';

const adjustments = normalizePriceAdjustments({});

const LIST = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';

test('el precio especial del cliente gana al de su lista', () => {
  const rows = [
    { product_id: 'a', price_list_id: LIST, user_id: null, price: '900' },
    { product_id: 'a', price_list_id: null, user_id: USER, price: '850' },
    { product_id: 'b', price_list_id: LIST, user_id: null, price: '1200' },
    { product_id: 'c', price_list_id: 'otra', user_id: null, price: '10' },
  ];
  const prices = pickSpecialPrices(rows, { userId: USER, priceListId: LIST });
  assert.equal(prices.get('a'), 850);
  assert.equal(prices.get('b'), 1200);
  assert.equal(prices.has('c'), false);
  assert.equal(pickSpecialPrices(rows, { priceListId: LIST }).get('a'), 900);
});

test('un precio especial reemplaza el de la lista y puede ser mayor', () => {
  const profile = { segment: 'retail', allowWholesale: false, priceList: { id: LIST, type: 'retail', rules_json: { percent: -10 } }, priceListSource: 'manual' };
  assert.equal(resolveEffectiveProductPrice({ priceRetail: 1000, priceWholesale: 0, profile, adjustments }).effective, 900);
  const special = resolveEffectiveProductPrice({ priceRetail: 1000, priceWholesale: 0, profile, adjustments, specialPrice: 1300 });
  assert.equal(special.effective, 1300);
  assert.equal(special.special, true);
});

test('los visitantes pueden ver una lista elegida, aunque sea mayorista', () => {
  assert.equal(guestPriceListId({ guest_price_list_id: LIST }), LIST);
  assert.equal(guestPriceListId({ guest_price_list_id: 'x' }), null);
  assert.equal(guestPriceListId({}), null);
  const guest = { segment: 'retail', allowWholesale: false, priceList: { id: LIST, type: 'wholesale', rules_json: {} }, priceListSource: 'guest' };
  assert.equal(resolveEffectiveProductPrice({ priceRetail: 1000, priceWholesale: 700, profile: guest, adjustments }).effective, 700);
  // Un minorista logueado con lista mayorista sigue viendo minorista.
  assert.equal(resolveEffectiveProductPrice({ priceRetail: 1000, priceWholesale: 700, profile: { ...guest, priceListSource: 'manual' }, adjustments }).effective, 1000);
});
