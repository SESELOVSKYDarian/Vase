import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { notificationRows, timeAgo } from '../src/panel/notifications.js';

test('tiempo relativo de los avisos', () => {
    const now = new Date('2026-11-02T12:00:00Z');
    assert.equal(timeAgo('2026-11-02T11:59:40Z', now), 'recién');
    assert.equal(timeAgo('2026-11-02T11:45:00Z', now), 'hace 15 min');
    assert.equal(timeAgo('2026-11-02T09:00:00Z', now), 'hace 3 h');
    assert.equal(timeAgo('2026-11-01T10:00:00Z', now), 'ayer');
    assert.equal(timeAgo('2026-10-28T12:00:00Z', now), 'hace 5 días');
    assert.equal(timeAgo(null, now), '');
});

test('junta pagos y registros, lo más nuevo arriba, y filtra por pestaña', () => {
    const data = {
        paymentApprovals: [{ id: 'p1', created_at: '2026-11-02T10:00:00Z' }],
        pendingUsers: [{ id: 'u1', created_at: '2026-11-02T11:00:00Z' }, { id: 'u2', created_at: '2026-11-01T11:00:00Z' }],
    };
    assert.deepEqual(notificationRows(data).map((row) => [row.id, row.type]), [['u1', 'registro'], ['p1', 'pago'], ['u2', 'registro']]);
    assert.deepEqual(notificationRows(data, 'pagos').map((row) => row.id), ['p1']);
    assert.deepEqual(notificationRows(data, 'registros').map((row) => row.id), ['u1', 'u2']);
});

test('la campanita abre el panel de avisos en vez de cambiar de sección', async () => {
    const app = await readFile(new URL('../src/panel/PanelApp.jsx', import.meta.url), 'utf8');
    assert.match(app, /const openNotifications = \(\) => \{ setNotesOpen\(true\)/);
    assert.match(app, /onNotifications=\{openNotifications\}/);
    assert.match(app, /<Notifications open=\{notesOpen\}/);
});
