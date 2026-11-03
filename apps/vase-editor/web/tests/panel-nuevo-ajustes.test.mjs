import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { channelChoice } from '../src/panel/ajustes.js';
import { SETTINGS_PAGES } from '../src/panel/sections.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('canal del pedido: sin configurar son los dos', () => {
    assert.equal(channelChoice(undefined), 'both');
    assert.equal(channelChoice(['whatsapp', 'email']), 'both');
    assert.equal(channelChoice(['whatsapp']), 'whatsapp');
    assert.equal(channelChoice(['email']), 'email');
});

test('ningún ajuste sigue en el panel anterior (Dominio ya está en el nuevo)', () => {
    assert.deepEqual(SETTINGS_PAGES.filter((page) => page.phase || page.legacy).map((page) => page.id), []);
});

test('la tienda respeta los canales elegidos y el servidor los guarda', async () => {
    const checkout = await read('../src/pages/store/CheckoutPage.jsx');
    assert.match(checkout, /orderChannelOptions\.map\(/);
    assert.match(checkout, /checkoutSettings\?\.order_channels \|\| commerce\.order_channels/);
    const settings = await read('../../server/src/routes/settings.js');
    assert.match(settings, /order_channels: orderChannels/);
    assert.match(settings, /customer_payment_approved_text/);
});

test('sucursales: sin interruptor que borre la sucursal al guardar', async () => {
    const screen = await read('../src/panel/screens/AjustesSucursales.jsx');
    assert.doesNotMatch(screen, /enabled: branch\.enabled === false/);
});
