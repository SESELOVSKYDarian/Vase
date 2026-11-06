import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { erpStats, keywordsAdd, paymentMethodsToggle, seoLimit, taxPercent, taxRateFromPercent } from '../src/panel/ajustes.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('formas de pago: nunca queda ninguna', () => {
    assert.deepEqual(paymentMethodsToggle(['transfer', 'cash_on_pickup'], 'transfer'), ['cash_on_pickup']);
    const only = ['transfer'];
    assert.equal(paymentMethodsToggle(only, 'transfer'), only);
    assert.deepEqual(paymentMethodsToggle(only, 'cash_on_pickup'), ['transfer', 'cash_on_pickup']);
});

test('IVA entre fracción y porcentaje', () => {
    assert.equal(taxPercent(0.21), '21');
    assert.equal(taxPercent(0.105), '10.5');
    assert.equal(taxRateFromPercent('21'), 0.21);
    assert.equal(taxRateFromPercent('10,5'), 0.105);
    assert.equal(taxRateFromPercent('-3'), 0);
    assert.equal(taxRateFromPercent('abc'), 0);
});

test('SEO: contador y palabras clave', () => {
    assert.deepEqual(seoLimit('hola', 60), { count: 4, over: false, text: '4 de 60 letras' });
    assert.equal(seoLimit('x'.repeat(61), 60).over, true);
    assert.deepEqual(keywordsAdd(['Helados'], ' helados '), ['Helados']);
    assert.deepEqual(keywordsAdd(['Helados'], 'Panadería'), ['Helados', 'Panadería']);
    assert.deepEqual(keywordsAdd([], '  '), []);
});

test('productos del sistema de gestión', () => {
    const stats = erpStats([
        { external_id: 'a', last_sync_at: '2026-11-01T10:00:00Z', sync_status: 'synced' },
        { external_id: 'b', last_sync_at: '2026-11-02T10:00:00Z', sync_status: 'error' },
        { name: 'propio' },
    ]);
    assert.equal(stats.total, 2);
    assert.equal(stats.toReview, 1);
    assert.equal(stats.lastSync.toISOString(), '2026-11-02T10:00:00.000Z');
});

test('Pagos, SEO, Correo y Gestión ya no usan los formularios anteriores', async () => {
    const pagos = await read('../src/panel/screens/AjustesPagos.jsx');
    assert.doesNotMatch(pagos, /CheckoutEditor/);
    const forms = await read('../src/panel/screens/AjustesForms.jsx');
    assert.doesNotMatch(forms, /SeoEditor|EmailEditor|IntegrationsEditor|vp-legacy/);
    const checkout = await read('../src/pages/store/CheckoutPage.jsx');
    assert.match(checkout, /highlightedTransfer/);
});
