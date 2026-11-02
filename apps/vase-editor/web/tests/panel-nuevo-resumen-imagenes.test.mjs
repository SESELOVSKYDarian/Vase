import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { periodTotals, salesByDay, topProducts } from '../src/panel/stats.js';
import { collectStoreImages, fileName, isImageUrl } from '../src/panel/media.js';
import { SECTIONS } from '../src/panel/sections.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('ventas por día sin cancelados ni borradores', () => {
    const now = new Date(2026, 10, 10, 15);
    const orders = [
        { status: 'paid', total: 1000, created_at: new Date(2026, 10, 10, 9).toISOString() },
        { status: 'submitted', total: 500, created_at: new Date(2026, 10, 9, 9).toISOString() },
        { status: 'cancelled', total: 9999, created_at: new Date(2026, 10, 10, 9).toISOString() },
        { status: 'paid', total: 7777, created_at: new Date(2026, 8, 1).toISOString() }, // fuera del período
    ];
    const days = salesByDay(orders, 30, now);
    assert.equal(days.length, 30);
    assert.equal(days.at(-1).total, 1000);
    assert.equal(days.at(-2).total, 500);
    assert.deepEqual(periodTotals(days), { total: 1500, count: 2 });
});

test('lo más vendido por unidades', () => {
    const orders = [
        { status: 'paid', items: [{ product_id: 'a', name: 'Base', qty: 2, unit_price: 100 }, { product_id: 'b', name: 'Pasta', qty: 5, unit_price: 10 }] },
        { status: 'cancelled', items: [{ product_id: 'a', name: 'Base', qty: 50, unit_price: 100 }] },
        { status: 'processing', items: [{ product_id: 'a', name: 'Base', qty: 1, unit_price: 100 }] },
    ];
    assert.deepEqual(topProducts(orders).map((row) => [row.name, row.qty, row.total]), [['Pasta', 5, 50], ['Base', 3, 300]]);
});

test('junta las fotos de la tienda sin las incrustadas y dice dónde se usan', () => {
    assert.equal(isImageUrl('https://uploads.vase.ar/files/x'), true);
    assert.equal(isImageUrl('/public/products/1/images/0?v=2'), true);
    assert.equal(isImageUrl('data:image/png;base64,AAA'), false);
    assert.equal(isImageUrl('Texto con .jpg'), false);
    const images = collectStoreImages({
        settings: { branding: { logo: 'https://cdn.x/logo.png' } },
        pageSections: { home: [{ props: { image: 'https://cdn.x/hero.jpg' } }], about: [] },
        products: [{ name: 'Base', images: ['/public/products/1/images/0'] }],
    });
    assert.deepEqual(images.map((image) => [image.src, image.groups[0], image.where[0]]), [
        ['https://cdn.x/hero.jpg', 'paginas', 'Inicio'],
        ['https://cdn.x/logo.png', 'marca', 'Colores, logo y catálogo'],
        ['/public/products/1/images/0', 'productos', 'Base'],
    ]);
    assert.equal(fileName('https://cdn.x/a/foto%20linda.jpg?v=1'), 'foto linda.jpg');
});

test('todas las secciones ya están en el panel nuevo', async () => {
    assert.deepEqual(Object.entries(SECTIONS).filter(([, meta]) => meta.phase).map(([id]) => id), []);
    const app = await read('../src/panel/PanelApp.jsx');
    assert.match(app, /section === 'imagenes'\) \{\s*content = <Imagenes/);
    const shell = await read('../src/panel/components/Shell.jsx');
    assert.doesNotMatch(shell, /en la fase/);
});
