import assert from 'node:assert/strict';
import test from 'node:test';

import { CHECKPOINT_GAP_MS, changedParts, describeChanges, historySummary, historyWhen, shouldCheckpoint } from '../src/panel/history.js';
import { blockLabel } from '../src/panel/diseno/model.js';

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
