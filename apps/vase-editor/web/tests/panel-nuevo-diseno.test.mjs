import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { blockLabel, blockSummary, createBlock, editorPageKey, moveBlock, removeBlock, replaceBlock, toggleBlock } from '../src/panel/diseno/model.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('nombres de bloques en castellano, también los de Piquim', () => {
    assert.equal(editorPageKey('home', true), 'piquim-home');
    assert.equal(editorPageKey('about', false), 'about');
    assert.equal(blockLabel('piquim-home', 'PiquimHero'), 'Portada con video');
    assert.equal(blockLabel('home', 'FeaturedProducts'), 'Productos destacados');
    assert.equal(blockLabel('home', 'BloqueRaro'), 'Bloque Raro');
    assert.equal(blockSummary({ props: { title: '<b>Hola</b> mundo' } }), 'Hola mundo');
});

test('agregar, mover, ocultar, reemplazar y quitar bloques', () => {
    const template = { type: 'AboutHero', props: { title: 'Nosotros' } };
    const block = createBlock('AboutHero', [template]);
    assert.equal(block.props.title, 'Nosotros');
    assert.notEqual(block.props, template.props); // copia, no la plantilla
    assert.equal(block.enabled, true);
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    assert.deepEqual(moveBlock(list, 0, 2).map((item) => item.id), ['b', 'c', 'a']);
    assert.equal(moveBlock(list, 0, 5), list);
    assert.equal(toggleBlock(list, 'b')[1].enabled, false);
    assert.equal(replaceBlock(list, { id: 'b', x: 1 })[1].x, 1);
    assert.deepEqual(removeBlock(list, 'a').map((item) => item.id), ['b', 'c']);
});

test('Diseño de la tienda ya es del panel nuevo y adapta los formularios anteriores al tema', async () => {
    const app = await read('../src/panel/PanelApp.jsx');
    assert.match(app, /section === 'diseno' && !editor\.loading\) \{\s*fullScreen = \(\s*<Diseno/);
    assert.match(app, /section === 'diseno' \? null : \(\s*<Topbar/);
    const screen = await read('../src/panel/diseno/Diseno.jsx');
    assert.match(screen, /<BlockPropertiesEditor/);
    assert.match(screen, /<StorePreview settings=\{settings\} sections=\{previewSections\}/);
    assert.match(screen, /aria-label="Cerrar el editor"/);
    assert.match(screen, /aria-label="Cerrar los bloques"/);
    const preview = await read('../src/panel/diseno/StorePreview.jsx');
    assert.match(preview, /addEventListener\(\'click\', pick, true\)/);
    assert.match(preview, /<Header /);
    assert.match(preview, /<Footer \/>/);
    const css = await read('../src/panel/diseno/diseno.css');
    assert.match(css, /\.vp \.vp-legacy \.text-white/);
    assert.match(css, /\.vp \.vp-legacy \.border-white\\\/10/);
});

test('menú de arriba y pie: links y valores de la plantilla', async () => {
    const { navLinksFromSettings, footerValues, linksSummary } = await import('../src/panel/diseno/chrome.js');
    assert.deepEqual(navLinksFromSettings({}).map((link) => link.href), ['/', '/catalog', '/about']);
    assert.deepEqual(navLinksFromSettings({ branding: { navbar: { links: [{ label: 'Ofertas', href: '/catalog?ofertas=1' }] } } }).map((link) => link.label), ['Ofertas']);
    const generic = footerValues({}, false);
    assert.equal(generic.newsletter.enabled, false);
    assert.equal(generic.whatsapp_enabled, true);
    const own = footerValues({ branding: { footer: { description: 'Hola', shopLinks: [{ label: 'A', href: '/' }], whatsapp_enabled: false } } }, false);
    assert.equal(own.description, 'Hola');
    assert.equal(linksSummary(own.shopLinks), 'A');
    assert.equal(own.whatsapp_enabled, false);
    assert.equal(linksSummary([]), 'Sin links');
});
