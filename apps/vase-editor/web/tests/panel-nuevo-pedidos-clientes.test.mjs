import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { CLIENT_FILTERS, clientState, isClient } from '../src/panel/clients.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('estado del cliente: pedido de mayorista, por aprobar, bloqueado y activo', () => {
    assert.equal(clientState({ status: 'pending', role: 'wholesale' }).id, 'wholesale_request');
    assert.equal(clientState({ status: 'pending', role: 'retail' }).id, 'pending');
    assert.equal(clientState({ status: 'inactive', role: 'wholesale' }).id, 'blocked');
    assert.equal(clientState({ status: 'active', role: 'retail' }).tone, 'g');
});

test('los administradores no aparecen en Clientes', () => {
    assert.equal(isClient({ role: 'tenant_admin' }), false);
    assert.equal(isClient({ role: 'retail', global_role: 'master_admin' }), false);
    assert.equal(isClient({ role: 'wholesale' }), true);
});

test('los filtros de clientes separan cada grupo', () => {
    const people = [
        { status: 'pending', role: 'wholesale' },
        { status: 'active', role: 'wholesale' },
        { status: 'active', role: 'retail' },
        { status: 'inactive', role: 'retail' },
    ];
    const count = Object.fromEntries(CLIENT_FILTERS.map(([id, , fn]) => [id, people.filter(fn).length]));
    assert.deepEqual(count, { pendientes: 1, mayoristas: 1, minoristas: 1, bloqueados: 1, todos: 4 });
});

test('pedidos y clientes ya son pantallas del panel nuevo', async () => {
    const app = await read('../src/panel/PanelApp.jsx');
    assert.match(app, /section === 'pedidos'\) \{\s*fullScreen = <Pedidos/);
    assert.match(app, /section === 'clientes'\) \{\s*fullScreen = <Clientes/);
    const pedidos = await read('../src/panel/screens/Pedidos.jsx');
    assert.match(pedidos, /\/api\/admin\/orders\/\$\{order\.id\}\/status/);
    const clientes = await read('../src/panel/screens/Clientes.jsx');
    assert.match(clientes, /\/tenant\/users\/\$\{client\.id\}\/price-list/);
});
