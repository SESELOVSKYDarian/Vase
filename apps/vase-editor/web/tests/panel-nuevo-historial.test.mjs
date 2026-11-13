import assert from 'node:assert/strict';
import test from 'node:test';

import { CHECKPOINT_GAP_MS, changedParts, describeChanges, historySummary, historyWhen, shouldCheckpoint } from '../src/panel/history.js';
import { blockLabel } from '../src/panel/diseno/model.js';
import { countChanges, detailChanges } from '../src/panel/historyDetail.js';

test('el detalle muestra el antes y el después de cada cosa', () => {
    const labelFor = (slug, block) => blockLabel(slug, block?.type);
    const older = {
        settings: { theme: { primary: '#ff4d00' }, branding: { logo: 'https://x.vase.ar/a.png', navbar: { links: [{ label: 'Inicio', href: '/' }] } }, seo: { title: 'Piquim' } },
        pages: { home: [{ id: 'h', type: 'HeroSlider', props: { title: 'Todo para tu obra' } }, { id: 's', type: 'Services', props: {} }], about: [] },
    };
    const newer = {
        settings: { theme: { primary: '#0d3b2a' }, branding: { logo: 'https://x.vase.ar/b.png', navbar: { links: [{ label: 'Inicio', href: '/' }, { label: 'Ofertas', href: '/ofertas' }] } }, seo: { title: 'Piquim · Sanitarios' } },
        pages: { home: [{ id: 'h', type: 'HeroSlider', props: { title: 'Envíos en el día' } }, { id: 'f', type: 'FeaturedProducts', props: {} }], about: [] },
    };
    const groups = detailChanges(older, newer, labelFor);
    const byTitle = Object.fromEntries(groups.map((group) => [group.title, group.rows]));
    assert.deepEqual(byTitle['Colores y estilo'], [{ kind: 'color', label: 'Color principal', before: '#ff4d00', after: '#0d3b2a' }]);
    assert.equal(byTitle['Logo, menú y textos'][0].kind, 'image');
    assert.deepEqual(byTitle['Logo, menú y textos'][1], { kind: 'note', label: 'Menú de arriba › Links', text: 'Agregaste “Ofertas”' });
    assert.deepEqual(byTitle['Google y redes'], [{ kind: 'text', label: 'Título', before: 'Piquim', after: 'Piquim · Sanitarios' }]);
    const home = byTitle['Página de inicio'];
    assert.deepEqual(home.map((row) => `${row.action}:${row.name}`), ['edit:Portada con fotos', 'add:Productos destacados', 'remove:Beneficios']);
    assert.deepEqual(home[0].details, [{ kind: 'text', label: 'Título', before: 'Todo para tu obra', after: 'Envíos en el día' }]);
    assert.equal(countChanges(groups), 7);
    assert.deepEqual(detailChanges(older, older, labelFor), []);
});

test('mover un bloque dice de qué lugar a cuál', () => {
    const a = { settings: {}, pages: { home: [{ id: 1, type: 'Services' }, { id: 2, type: 'HeroSlider' }], about: [] } };
    const b = { settings: {}, pages: { home: [{ id: 2, type: 'HeroSlider' }, { id: 1, type: 'Services' }], about: [] } };
    const rows = detailChanges(a, b, (slug, block) => blockLabel(slug, block?.type))[0].rows;
    assert.deepEqual(rows.map((row) => row.text), ['Del lugar 2 al 1', 'Del lugar 1 al 2']);
});

const labelFor = (slug, block) => blockLabel(slug, block?.type);

test('cada versión dice qué cambió, cosa por cosa', () => {
    const older = {
        settings: { theme: { primary: '#000' }, branding: { logo: 'a.png' }, commerce: {} },
        pages: { home: [{ id: 'h1', type: 'HeroSlider', props: { title: 'Hola' } }, { id: 's1', type: 'Services', props: {} }], about: [] },
    };
    const newer = {
        settings: { theme: { primary: '#fff' }, branding: { logo: 'b.png' }, commerce: { whatsapp_number: '11' } },
        pages: { home: [{ id: 's1', type: 'Services', props: { title: 'Nuevo' } }, { id: 'f1', type: 'FeaturedProducts', props: {} }], about: [] },
    };
    assert.deepEqual(describeChanges(older, newer, labelFor), [
        'Cambiaste los colores y el estilo',
        'Cambiaste el logo',
        'Cambiaste el WhatsApp',
        'Inicio: editaste “Beneficios”',
        'Inicio: agregaste “Productos destacados”',
        'Inicio: quitaste “Portada con fotos”',
    ]);
    assert.deepEqual(describeChanges(older, older, labelFor), []);
});

test('mover bloques y ocultarlos también queda anotado', () => {
    const a = { settings: {}, pages: { home: [{ id: 1, type: 'Services' }, { id: 2, type: 'HeroSlider' }], about: [] } };
    const b = { settings: {}, pages: { home: [{ id: 2, type: 'HeroSlider' }, { id: 1, type: 'Services', enabled: false }], about: [] } };
    assert.deepEqual(describeChanges(a, b, labelFor), [
        'Inicio: ocultaste “Beneficios”',
        'Inicio: cambiaste el orden de los bloques',
    ]);
});

test('el historial dice qué partes del diseño cambiaron', () => {
    const before = { settings: { theme: { a: 1 }, branding: { b: 1 } }, pages: { home: [1], about: [] } };
    const after = { settings: { theme: { a: 2 }, branding: { b: 1 } }, pages: { home: [1, 2], about: [] } };
    assert.deepEqual(changedParts(before, after), ['colores y estilo', 'página de inicio']);
    assert.equal(historySummary(changedParts(before, after)), 'Antes de cambiar colores y estilo y página de inicio');
    assert.equal(historySummary([]), 'Cambios en el diseño');
});

test('se marca un punto nuevo solo después de un rato sin marcar', () => {
    const now = 1_000_000_000;
    assert.equal(shouldCheckpoint(null, now), true);
    assert.equal(shouldCheckpoint(now - 60_000, now), false);
    assert.equal(shouldCheckpoint(now - CHECKPOINT_GAP_MS, now), true);
});

test('el momento de cada punto se lee fácil', () => {
    const now = new Date('2026-11-10T15:00:00');
    assert.equal(historyWhen(new Date('2026-11-10T14:59:40'), now), 'Recién');
    assert.equal(historyWhen(new Date('2026-11-10T14:45:00'), now), 'Hace 15 min');
    assert.match(historyWhen(new Date('2026-11-10T09:30:00'), now), /^Hoy, /);
});
