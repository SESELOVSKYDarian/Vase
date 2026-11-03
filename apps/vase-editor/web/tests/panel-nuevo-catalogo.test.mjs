import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    buildCategoryTree,
    buildFilters,
    categoryPath,
    countByCategory,
    descendantIds,
    draftToPayload,
    mainCategory,
    productToDraft,
    searchProducts,
    variantMembers,
} from '../src/panel/catalog/model.js';
import { pageWindow } from '../src/panel/paging.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

const categories = [
    { id: 'h', name: 'Heladería', parent_id: null },
    { id: 'p', name: 'Panadería/Confitería', parent_id: null },
    { id: 'x', name: 'P', parent_id: null },
    { id: 'est', name: 'Estabilizantes', parent_id: 'h' },
    { id: 'bas', name: 'Bases en polvo', parent_id: 'est' },
    { id: 'var', name: 'Variegattos', parent_id: 'h' },
    { id: 'cre', name: 'Cremas', parent_id: 'p' },
];
const products = [
    { id: '1', name: 'BASE CHANTILLY', sku: '201910', stock: 10, category_ids: ['h', 'est', 'bas'], sync_status: 'synced', is_visible_web: true, data: { variant_group: 'Bases x 10', variant_label: 'Chantilly' } },
    { id: '2', name: 'VARIEGATTO FRUTILLA', sku: '203114', stock: 0, category_ids: ['h', 'var'], sync_status: 'synced', is_visible_web: false, data: {} },
    { id: '3', name: 'CREMA PASTELERA', sku: 'M-1', stock: 5, category_ids: ['p', 'cre'], sync_status: 'manual', is_visible_web: true, data: { variant_group: 'bases X 10', variant_label: 'Crema' } },
    { id: '4', name: 'BASE CHOCO', sku: '201897', stock: 3, category_ids: ['h', 'est', 'bas'], sync_status: 'synced', is_visible_web: true, data: { variant_group: 'Bases x 10' } },
];

test('árbol de categorías: rubros arriba, hijas debajo con su profundidad, sin perder huérfanas', () => {
    const tree = buildCategoryTree([...categories, { id: 'o', name: 'Huérfana', parent_id: 'borrada' }]);
    assert.deepEqual(tree.map((c) => `${'-'.repeat(c.depth)}${c.name}`), [
        'Heladería', '-Estabilizantes', '--Bases en polvo', '-Variegattos', 'P', 'Panadería/Confitería', '-Cremas', 'Huérfana',
    ]);
    assert.deepEqual([...descendantIds(categories, 'h')].sort(), ['bas', 'est', 'h', 'var']);
    assert.equal(categoryPath(categories, 'bas'), 'Heladería › Estabilizantes › Bases en polvo');
});

test('cantidades por categoría incluyen las subcategorías y la columna muestra la más específica', () => {
    const { counts } = countByCategory(products, categories);
    assert.equal(counts.get('h'), 3);
    assert.equal(counts.get('est'), 2);
    assert.equal(counts.get('p'), 1);
    assert.equal(mainCategory(products[0], categories).name, 'Bases en polvo');
    assert.equal(mainCategory({ category_ids: [] }, categories), null);
});

test('filtros: solo los rubros con una parte importante del catálogo, más stock, ocultos y origen', () => {
    const filters = buildFilters(products, categories);
    const byLabel = Object.fromEntries(filters.map((f) => [f.label, f.count]));
    assert.equal(byLabel.Todos, 4);
    assert.equal(byLabel['Heladería'], 3);
    assert.equal(byLabel['Panadería/Confitería'], 1);
    assert.ok(!('P' in byLabel), 'una raíz suelta sin productos no aparece como filtro');
    assert.equal(byLabel['Sin stock'], 1);
    assert.equal(byLabel.Ocultos, 1);
    assert.equal(byLabel['Del sistema'], 3);
    assert.equal(byLabel.Manuales, 1);
    assert.deepEqual(searchProducts(products, 'chantilly').map((p) => p.id), ['1']);
    assert.deepEqual(searchProducts(products, '2039').map((p) => p.id), []);
    assert.deepEqual(searchProducts(products, '20191').map((p) => p.id), ['1']);
});

test('variantes: el grupo se reconoce sin importar mayúsculas', () => {
    assert.deepEqual(variantMembers(products, 'BASES X 10').map((p) => p.id), ['1', '3', '4']);
    assert.deepEqual(variantMembers(products, ''), []);
});

test('el producto se arma para guardar con todos sus datos y el precio escrito a la argentina', () => {
    const draft = productToDraft({
        ...products[0],
        price: 209326.01,
        brand: 'PIQUIM',
        short_description: 'Corta',
        long_description: 'Larga',
        is_featured: true,
        admin_locked: false,
        data: { images: [{ url: '/public/products/1/images/0?v=1' }, 'https://x/2.webp'], specifications: { Rinde: '10 kg' }, variant_group: 'Bases x 10', variant_label: 'Chantilly' },
    });
    assert.deepEqual(draft.images, ['/public/products/1/images/0?v=1', 'https://x/2.webp']);
    assert.deepEqual(draft.specifications, [{ key: 'Rinde', value: '10 kg' }]);
    const payload = draftToPayload({ ...draft, price: '1.245.300,50', stock: '7', specifications: [...draft.specifications, { key: '  ', value: 'x' }] });
    assert.equal(payload.price, 1245300.5);
    assert.equal(payload.stock, 7);
    assert.deepEqual(payload.images, [{ url: '/public/products/1/images/0?v=1', primary: true }, { url: 'https://x/2.webp', primary: false }]);
    assert.deepEqual(payload.specifications, { Rinde: '10 kg' });
    assert.equal(payload.show_specifications, true);
    assert.equal(payload.is_featured, true);
    assert.equal(payload.short_description, 'Corta');
    assert.equal(payload.long_description, 'Larga');
    assert.equal(draftToPayload({ ...draft, price: 209326.01 }).price, 209326.01);
    assert.equal(draftToPayload({ ...draft, variant_group: '  ' }).variant_group, null);
});

test('paginación: muestra primera, última y vecinas', () => {
    assert.deepEqual(pageWindow(1, 5), [1, 2, 3, 4, 5]);
    assert.deepEqual(pageWindow(1, 31), [1, 2, '…', 31]);
    assert.deepEqual(pageWindow(15, 31), [1, '…', 14, 15, 16, '…', 31]);
});

test('el catálogo vive en el panel nuevo con barra lateral, stock y categorías', async () => {
    const app = await read('../src/panel/PanelApp.jsx');
    assert.match(app, /section === 'catalogo' && !editor\.loading/);
    const screen = await read('../src/panel/catalog/Catalogo.jsx');
    assert.match(screen, /\/tenant\/products\/\$\{product\.id\}\/stock/);
    assert.match(screen, /\/tenant\/categories\/\$\{currentCat\.id\}/);
});

test('ficha técnica en PDF y qué lista usa cada precio', async () => {
    const { draftToPayload, productToDraft, tierUsage } = await import('../src/panel/catalog/model.js');
    const draft = productToDraft({ name: 'Base', data: { spec_sheet: { url: 'https://uploads.vase.ar/f.pdf', name: 'f.pdf', size: 1000 } } });
    assert.deepEqual(draft.spec_sheet, { url: 'https://uploads.vase.ar/f.pdf', name: 'f.pdf', size: 1000 });
    const payload = draftToPayload({ ...draft, images: [], category_ids: [] });
    assert.equal(payload.spec_sheet.url, 'https://uploads.vase.ar/f.pdf');
    assert.equal(payload.show_specifications, true);
    assert.equal(draftToPayload({ ...draft, spec_sheet: null, images: [], category_ids: [] }).spec_sheet, null);
    const lists = [
        { name: 'Retail', type: 'retail', rules_json: {} },
        { name: 'Mayorista', type: 'wholesale', rules_json: {} },
        { name: 'Distribuidor', type: 'special', rules_json: { force_segment: 'wholesale' } },
        { name: 'Especial', type: 'special', rules_json: {} },
    ];
    assert.deepEqual(tierUsage(1, lists), ['Retail']);
    assert.deepEqual(tierUsage(2, lists), ['Mayorista', 'Distribuidor']);
    assert.deepEqual(tierUsage(3, lists), []);
    const { specSheetFrom, formatFileSize } = await import('../src/utils/specSheet.js');
    assert.equal(specSheetFrom({ url: 'javascript:alert(1)' }, { url: 'https://x.test/a.pdf' }).url, 'https://x.test/a.pdf');
    assert.equal(specSheetFrom(null, {}), null);
    assert.equal(formatFileSize(245760), '240 KB');
    assert.equal(formatFileSize(3 * 1024 * 1024), '3,0 MB');
});
