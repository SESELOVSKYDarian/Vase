import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { collectImageUrls, createPageCache, sameSections } from '../src/utils/pageCacheCore.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('la cache pide cada pagina una sola vez a la vez y guarda el resultado', async () => {
    let calls = 0;
    const cache = createPageCache({ load: async () => { calls += 1; return [{ type: 'AboutHero' }]; } });

    assert.equal(cache.get('about'), null);
    const [a, b] = await Promise.all([cache.fetch('about'), cache.fetch('about')]);
    assert.equal(calls, 1);
    assert.deepEqual(a, b);
    assert.deepEqual(cache.get('about'), [{ type: 'AboutHero' }]);

    cache.prefetch('about');
    assert.equal(calls, 1, 'prefetch no vuelve a pedir lo que ya esta');
    await cache.fetch('about');
    assert.equal(calls, 2, 'fetch siempre refresca');
});

test('si la carga falla devuelve null y no guarda nada', async () => {
    const cache = createPageCache({ load: async () => { throw new Error('red'); } });
    assert.equal(await cache.fetch('home'), null);
    assert.equal(cache.get('home'), null);

    const notOk = createPageCache({ load: async () => null });
    assert.equal(await notOk.fetch('home'), null);
    assert.equal(notOk.get('home'), null);
});

test('una pagina vacia se guarda (distinto de "todavia no cargo")', async () => {
    const cache = createPageCache({ load: async () => [] });
    await cache.fetch('about');
    assert.deepEqual(cache.get('about'), []);
});

test('compara secciones por contenido', () => {
    assert.equal(sameSections([{ a: 1 }], [{ a: 1 }]), true);
    assert.equal(sameSections([{ a: 1 }], [{ a: 2 }]), false);
    assert.equal(sameSections(null, []), false);
});

test('se precargan solo las primeras imagenes, no videos ni texto', () => {
    const sections = [
        { props: { title: 'Hola', backgroundImage: 'https://x.com/a.jpg', videoUrlDesktop: '/public/pages/home/media/s?path=videoUrlDesktop&v=1', image: '/public/pages/about/media/s?path=image&v=1' } },
        { props: { cards: [{ image: 'https://x.com/b.png' }, { image: 'https://x.com/c.png' }], logo_url: 'data:image/png;base64,AAAA' } },
        { props: { avatarImage: 'https://x.com/d.png' } },
        { props: { image: 'https://x.com/e.png', poster: 'https://x.com/f.png' } },
    ];
    const urls = collectImageUrls(sections, 4);
    assert.deepEqual(urls, [
        'https://x.com/a.jpg',
        '/public/pages/about/media/s?path=image&v=1',
        'https://x.com/b.png',
        'https://x.com/c.png',
    ]);
    assert.deepEqual(collectImageUrls(null), []);
});

test('Nosotros ya no muestra esqueletos ni pasa por contenido de relleno', async () => {
    const about = await read('../src/pages/store/AboutPage.jsx');
    assert.doesNotMatch(about, /StoreSkeleton/);
    assert.match(about, /getCachedPage\('about'\)/);
    assert.match(about, /normalizeAboutSectionsForBrand\(settings, tenant/);
    assert.doesNotMatch(about, /setSections\(null\)/);
});

test('el panel y la tienda usan la misma normalizacion de Nosotros', async () => {
    const editor = await read('../src/hooks/admin/useEditorState.js');
    assert.match(editor, /import \{ normalizeAboutSectionsForBrand \} from '\.\.\/\.\.\/utils\/aboutSections'/);
    assert.doesNotMatch(editor, /const normalizeAboutSectionsForBrand =/);
});

test('mientras carga la tienda no se muestra un esqueleto gris', async () => {
    const tenant = await read('../src/context/TenantContext.jsx');
    assert.match(tenant, /className="tenant-loading"/);
    const css = await read('../src/index.css');
    assert.match(css, /\.tenant-loading \{[^}]*min-height: 100vh/);
});

test('la transicion entre paginas es corta y respeta reduccion de movimiento', async () => {
    const css = await read('../src/index.css');
    const match = css.match(/\.page-enter \{\s*animation: page-enter (\d+)ms/);
    assert.ok(match, 'existe .page-enter');
    assert.ok(Number(match[1]) <= 200, `duracion ${match[1]}ms`);
    assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.page-enter \{\s*animation: none/);
    const layout = await read('../src/components/layout/StoreLayout.jsx');
    assert.match(layout, /<main className="page-enter /);
    const app = await read('../src/App.jsx');
    assert.doesNotMatch(app, /animate-in fade-in slide-in-from-bottom-2 duration-300/);
});

test('las paginas se precargan al pasar el mouse y cuando el navegador esta libre', async () => {
    const app = await read('../src/App.jsx');
    assert.match(app, /addEventListener\('pointerover', onIntent/);
    assert.match(app, /addEventListener\('touchstart', onIntent/);
    assert.match(app, /requestIdleCallback/);
    assert.match(app, /'\/about': \(\) => \{ loadAbout\(\); prefetchPublicPage\('about'\); \}/);
});

test('Inicio usa la pagina precargada y no se reinicia al identificar la tienda', async () => {
    const home = await read('../src/pages/store/HomePage.jsx');
    assert.match(home, /useState\(\(\) => getCachedPage\('home'\)\)/);
    assert.doesNotMatch(home, /setSections\(null\);\s*setSectionsLoading\(true\)/);
    assert.doesNotMatch(home, /StoreSkeleton/);
});
