import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { SECTIONS, SETTINGS_PAGES, panelPath, parsePanelPath } from '../src/panel/sections.js';
import { ORDER_STATUS_ORDER, formatMoney, orderStatus } from '../src/panel/format.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('las direcciones del panel nuevo llevan a cada sección y vuelven a armarse igual', () => {
    assert.deepEqual(parsePanelPath('/admin'), { section: 'resumen', sub: null });
    assert.deepEqual(parsePanelPath('/admin/'), { section: 'resumen', sub: null });
    assert.deepEqual(parsePanelPath('/admin/catalogo'), { section: 'catalogo', sub: null });
    assert.deepEqual(parsePanelPath('/admin/ajustes/correo'), { section: 'ajustes', sub: 'correo' });
    assert.deepEqual(parsePanelPath('/admin/ajustes/no-existe'), { section: 'ajustes', sub: null });
    assert.deepEqual(parsePanelPath('/admin/evolution'), { section: 'resumen', sub: null });
    for (const id of Object.keys(SECTIONS)) assert.deepEqual(parsePanelPath(panelPath(id)), { section: id, sub: null });
    for (const page of SETTINGS_PAGES) assert.deepEqual(parsePanelPath(panelPath('ajustes', page.id)), { section: 'ajustes', sub: page.id });
});

test('cada sección pendiente dice en qué fase llega y a qué módulo del panel anterior lleva', () => {
    for (const [id, meta] of Object.entries(SECTIONS)) {
        if (id === 'resumen' || id === 'ajustes') continue;
        assert.ok(meta.phase >= 2 && meta.phase <= 8, id);
        assert.ok(meta.legacy, id);
    }
    for (const page of SETTINGS_PAGES) assert.ok(page.legacy && page.phase, page.id);
});

test('estados reales de los pedidos con nombre y color', () => {
    assert.deepEqual(ORDER_STATUS_ORDER, ['draft', 'submitted', 'pending_payment', 'processing', 'paid', 'cancelled']);
    assert.equal(orderStatus('pending_payment').label, 'Pendiente de pago');
    assert.equal(orderStatus('paid').tone, 'g');
    assert.equal(orderStatus('cancelled').tone, 'r');
    assert.equal(orderStatus('raro').label, 'raro');
    assert.equal(formatMoney(1245300.4), `$${(1245300).toLocaleString('es-AR')}`);
});

test('/admin abre el panel nuevo y el anterior queda en /admin/anterior', async () => {
    const app = await read('../src/App.jsx');
    assert.match(app, /const PanelApp = lazyPage\(\(\) => import\('\.\/panel\/PanelApp'\)\);/);
    assert.match(app, /else if \(route === '\/admin\/anterior'\) Component = EvolutionAdmin;\s*else Component = PanelApp;/);
    assert.match(app, /isAdminRoute = route === '\/admin' \|\| \(route\.startsWith\('\/admin\/'\) && !isPreviewRoute\)/);
    // el panel no se desmonta al cambiar de sección
    assert.match(app, /key=\{isAdminRoute && !isLegacyAdminRoute \? 'vase-panel' : route\}/);
});

test('el panel nuevo vive aislado: todos sus estilos están dentro de .vp y tiene modo claro y oscuro', async () => {
    const css = await read('../src/panel/panel.css');
    const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[\s\S]*?\}\s*\}/g, '').match(/(^|\})\s*([^{}@]+)\{/g) || [];
    for (const raw of selectors) {
        const selector = raw.replace(/^\}/, '').replace(/\{$/, '').trim();
        if (!selector || /^(from|to)$/.test(selector)) continue;
        for (const part of selector.split(',')) assert.match(part.trim(), /^(:where\(\.vp\)|\.vp(\b|-))/, `selector fuera del panel: ${part.trim()}`);
    }
    assert.match(css, /\.vp\[data-theme="dark"\]/);
    assert.match(css, /--page: #000000/);
    assert.match(css, /::-webkit-scrollbar-thumb/);
});

test('las barras laterales y el menú quedan fijos: solo se desplaza el contenido', async () => {
    const css = await read('../src/panel/panel.css');
    assert.match(css, /\.vp-page \{[^}]*overflow: hidden/);
    assert.match(css, /\.vp-body \{[^}]*overflow: auto/);
    assert.match(css, /\.vp-rbar \{[^}]*height: 100%/);
    assert.match(css, /\.vp-side \{[^}]*height: 100%/);
});
