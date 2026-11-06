import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    mergeShippingZones,
    polygonFromBoundingBox,
    quoteForDistance,
    tiersError,
    tiersToZones,
    zonesToTiers,
} from '../src/panel/envios/model.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('los tramos se guardan como zonas por distancia encadenadas', () => {
    const zones = tiersToZones([{ id: 'b', max_km: 6, price: 3000, per_km: 0 }, { id: 'a', max_km: 3, price: 1500, per_km: 0 }]);
    assert.deepEqual(zones.map((zone) => [zone.id, zone.type, zone.min_distance_km, zone.max_distance_km, zone.price]), [
        ['a', 'distance', 0, 3, 1500],
        ['b', 'distance', 3, 6, 3000],
    ]);
    assert.deepEqual(zonesToTiers(zones).map((tier) => tier.max_km), [3, 6]);
});

test('guardar envíos no toca las zonas que no maneja la pantalla', () => {
    const fixed = { id: 'arg', name: 'Argentina', type: 'flat', price: 9000 };
    const special = { id: 'sp', name: 'Centro', type: 'flat', price: 500, polygon: [{ lat: 1, lng: 1 }, { lat: 1, lng: 2 }, { lat: 2, lng: 2 }] };
    const oldRing = { id: 'old', type: 'distance', max_distance_km: 10, price: 1 };
    const merged = mergeShippingZones([fixed, special, oldRing], [{ id: 'r', max_km: 4, price: 100, per_km: 0 }], [special]);
    assert.deepEqual(merged.map((zone) => zone.id), ['arg', 'r', 'sp']);
});

test('simulador: dentro de un tramo paga su precio, más lejos no hay envío', () => {
    const tiers = [{ max_km: 3, price: 1500, per_km: 0 }, { max_km: 6, price: 3000, per_km: 0 }];
    assert.deepEqual(quoteForDistance(tiers, 2), { ok: true, price: 1500 });
    assert.deepEqual(quoteForDistance(tiers, 5), { ok: true, price: 3000 });
    assert.deepEqual(quoteForDistance(tiers, 9), { ok: false });
});

test('errores de tramos y área de una zona especial', () => {
    assert.equal(tiersError([{ max_km: '', price: 0 }]), 'Cada tramo necesita los km');
    assert.equal(tiersError([{ max_km: 3, price: 0 }, { max_km: 3, price: 1 }]), 'Hay dos tramos con la misma distancia');
    assert.equal(tiersError([{ max_km: 3, price: 0 }]), null);
    assert.equal(polygonFromBoundingBox(['-38.1', '-37.9', '-57.7', '-57.5']).length, 4);
    assert.deepEqual(polygonFromBoundingBox(null), []);
});

test('Envíos y Sucursales ya están en el panel nuevo', async () => {
    const app = await read('../src/panel/PanelApp.jsx');
    assert.match(app, /section === 'envios' && !editor\.loading\) \{\s*fullScreen = <Envios/);
    assert.match(app, /sub === 'sucursales'\) \{\s*content = <AjustesSucursales/);
    const css = await read('../src/panel/screens/screens.css');
    assert.match(css, /\.leaflet-container img \{ max-width: none/);
});
