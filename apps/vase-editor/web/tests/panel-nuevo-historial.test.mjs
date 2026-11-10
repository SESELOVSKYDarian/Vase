import assert from 'node:assert/strict';
import test from 'node:test';

import { CHECKPOINT_GAP_MS, changedParts, historySummary, historyWhen, shouldCheckpoint } from '../src/panel/history.js';

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
