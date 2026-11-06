import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('en celular el menú se abre con un botón y Diseño muestra una vista a la vez', async () => {
    const app = await read('../src/panel/PanelApp.jsx');
    assert.match(app, /const query = '\(max-width: 900px\)';/);
    assert.match(app, /import '\.\/mobile\.css';/);
    assert.match(app, /mini=\{mini && !isPhone\}/);
    const shell = await read('../src/panel/components/Shell.jsx');
    assert.match(shell, /aria-label="Abrir el menú"/);
    assert.match(shell, /className="vp-mscrim"/);
    const diseno = await read('../src/panel/diseno/Diseno.jsx');
    assert.match(diseno, /className="vp-dzmnav"/);
    assert.match(diseno, /if \(phone\) setPhoneView\('editor'\)/);
});

test('las tablas pasan a tarjetas con el nombre de cada dato', async () => {
    const table = await read('../src/panel/components/DataTable.jsx');
    assert.match(table, /data-label=\{column\.label\}/);
    const css = await read('../src/panel/mobile.css');
    assert.match(css, /\.vp \.vp-tbl\.dt thead \{ display: none; \}/);
    assert.match(css, /content: attr\(data-label\)/);
});

test('el panel usa el ícono de Vase en la pestaña', async () => {
    const app = await read('../src/panel/PanelApp.jsx');
    assert.match(app, /'\/brand\/vase-favicon\.png'/);
    assert.match(app, /usePanelFavicon\(\);/);
});
