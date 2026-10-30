import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    CATALOG_FRESH_MS,
    buildCatalogCacheKey,
    buildSubcatalogProductsUrl,
    clearCatalogCache,
    getCatalogCache,
    getProductsRequestPage,
    isCatalogCacheFresh,
    prefetchCatalogUrl,
    setCatalogCache,
    withImageWidth,
} from '../src/utils/catalogRequest.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('el subcatalogo de Piquim no depende de la pagina de la URL; el resto si', () => {
    assert.equal(getProductsRequestPage({ isPiquimSubcatalog: true, page: 7 }), 1);
    assert.equal(getProductsRequestPage({ isPiquimSubcatalog: true, page: 1 }), 1);
    assert.equal(getProductsRequestPage({ isPiquimSubcatalog: false, page: 3 }), 3);
});

test('la URL de precarga es la misma que arma la pagina del catalogo', () => {
    const url = buildSubcatalogProductsUrl({ apiBase: 'https://piquim.ar', category: 'heladeria' });
    assert.equal(url, 'https://piquim.ar/public/products?page=1&limit=500&grouped=true&sort=name-asc&category=heladeria');
});

test('la cache distingue usuarios y se puede consultar y vencer', () => {
    clearCatalogCache();
    const anon = buildCatalogCacheKey('https://x/p', {});
    const logged = buildCatalogCacheKey('https://x/p', { Authorization: 'Bearer abc' });
    assert.notEqual(anon, logged);

    assert.equal(getCatalogCache(anon), null);
    setCatalogCache(anon, { items: [1], total: 1 });
    const entry = getCatalogCache(anon);
    assert.deepEqual(entry.data, { items: [1], total: 1 });
    assert.equal(isCatalogCacheFresh(entry), true);
    assert.equal(isCatalogCacheFresh(entry, entry.at + CATALOG_FRESH_MS + 1), false);
    assert.equal(isCatalogCacheFresh(null), false);
});

test('la cache tiene tope de entradas', () => {
    clearCatalogCache();
    for (let i = 0; i < 40; i += 1) setCatalogCache(`k${i}`, { items: [], total: 0 });
    assert.equal(getCatalogCache('k0'), null);
    assert.notEqual(getCatalogCache('k39'), null);
});

test('la precarga guarda el resultado, no repite si esta fresca y tolera errores', async () => {
    clearCatalogCache();
    let calls = 0;
    const ok = async () => {
        calls += 1;
        return { ok: true, json: async () => ({ items: [{ id: 'a' }], total: 1 }) };
    };
    await prefetchCatalogUrl({ url: 'https://x/ok', headers: {}, fetchImpl: ok });
    await prefetchCatalogUrl({ url: 'https://x/ok', headers: {}, fetchImpl: ok });
    assert.equal(calls, 1);
    assert.deepEqual(getCatalogCache(buildCatalogCacheKey('https://x/ok', {})).data, { items: [{ id: 'a' }], total: 1 });

    await prefetchCatalogUrl({ url: 'https://x/bad', headers: {}, fetchImpl: async () => ({ ok: false }) });
    await prefetchCatalogUrl({
        url: 'https://x/boom',
        headers: {},
        fetchImpl: async () => {
            throw new Error('red');
        },
    });
    assert.equal(getCatalogCache(buildCatalogCacheKey('https://x/bad', {})), null);
    assert.equal(getCatalogCache(buildCatalogCacheKey('https://x/boom', {})), null);
});

test('las imagenes de tarjeta piden un ancho chico solo a las rutas de producto', () => {
    assert.equal(withImageWidth('/public/products/abc/images/0?v=12'), '/public/products/abc/images/0?v=12&w=480');
    assert.equal(withImageWidth('/public/products/abc/images/0'), '/public/products/abc/images/0?w=480');
    assert.equal(withImageWidth('/public/products/abc/images/0?v=1&w=900'), '/public/products/abc/images/0?v=1&w=900');
    assert.equal(withImageWidth('https://cdn.example.com/a.jpg'), 'https://cdn.example.com/a.jpg');
    assert.equal(withImageWidth(undefined), undefined);
});

test('cambiar de pagina en el subcatalogo ya no vuelve a pedir ni borra los productos', async () => {
    const source = await read('../src/pages/store/CatalogPage.jsx');
    assert.match(source, /const requestPage = getProductsRequestPage\(\{ isPiquimSubcatalog: isPiquimSubcatalogRoute, page \}\)/);
    const effectStart = source.indexOf('const requestKey = JSON.stringify([');
    const keyBlock = source.slice(effectStart, source.indexOf(']);', effectStart));
    assert.match(keyBlock, /requestPage,/);
    assert.doesNotMatch(keyBlock, /\bpage,/);
    const depsLine = source.match(/\}, \[inStockOnly, isPiquimTenant, limit, [^\]]*\]\);/)[0];
    assert.match(depsLine, /requestPage/);
    assert.doesNotMatch(depsLine, /[ ,]page[ ,]/);
});

test('el catalogo muestra de inmediato lo que ya tiene en memoria y renueva sin "cargando"', async () => {
    const source = await read('../src/pages/store/CatalogPage.jsx');
    assert.match(source, /const cachedEntry = cacheKey \? getCatalogCache\(cacheKey\) : null;/);
    assert.match(source, /if \(isPiquimSubcatalog && isNewRequest && !cachedEntry\)/);
    assert.match(source, /if \(isCatalogCacheFresh\(cachedEntry\)\) return;/);
    assert.match(source, /if \(isPiquimSubcatalog\) setCatalogCache\(cacheKey, data\);/);
});

test('el paginador no recorta la pagina pedida mientras los productos cargan', async () => {
    const source = await read('../src/pages/store/CatalogPage.jsx');
    assert.match(source, /if \(!normalizedProducts\.length\) return;\s*setCatalogPage\(\(currentPage\) => synchronizeCatalogPageRequest/);
    assert.match(source, /addEventListener\('popstate', syncPageFromUrl\)/);
});

test('las tarjetas usan imagenes livianas y la app precarga los rubros de Piquim', async () => {
    const source = await read('../src/pages/store/CatalogPage.jsx');
    assert.equal(source.match(/withImageWidth\(/g).length >= 3, true);
    const app = await read('../src/App.jsx');
    assert.match(app, /PIQUIM_CATALOG_SLUGS\.forEach\(prefetchPiquimCatalog\)/);
    assert.match(app, /PIQUIM_CATALOG_SLUGS\.includes\(category\)/);
});
