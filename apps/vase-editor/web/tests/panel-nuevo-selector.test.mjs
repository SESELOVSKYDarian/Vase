import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const panelDir = new URL('../src/panel/', import.meta.url);

async function jsxFiles(dir) {
    const out = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
        if (entry.isDirectory()) out.push(...await jsxFiles(url));
        else if (entry.name.endsWith('.jsx')) out.push(url);
    }
    return out;
}

test('el panel nuevo no usa el <select> del navegador', async () => {
    const offenders = [];
    for (const file of await jsxFiles(panelDir)) {
        if (file.pathname.endsWith('/components/Select.jsx')) continue;
        if (/<select[\s>]/.test(await readFile(file, 'utf8'))) offenders.push(file.pathname.split('/src/')[1]);
    }
    assert.deepEqual(offenders, []);
});

test('el selector propio se maneja con teclado y tiene buscador en listas largas', async () => {
    const source = await readFile(new URL('../../../../../packages/ui/src/panel/select.tsx', panelDir), 'utf8');
    for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Home', 'End']) assert.match(source, new RegExp(`"${key}"`));
    assert.match(source, /role="listbox"/);
    assert.match(source, /aria-selected=\{selected\}/);
    assert.match(source, /const SEARCH_FROM = 10;/);
});
