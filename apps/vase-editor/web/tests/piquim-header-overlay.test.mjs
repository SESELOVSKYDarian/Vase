import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const headerUrl = new URL('../src/components/layout/Header.jsx', import.meta.url);

test('el header Piquim solo superpone el contenido cuando recibe overlay', async () => {
    const source = await readFile(headerUrl, 'utf8');
    const piquim = source.slice(source.indexOf('if (isPiquimPreset)'), source.indexOf('if (isPiquimPreset)') + 12000);

    assert.match(piquim, /overlay \? '-mt-\[6px\] -mb-\[113px\] max-md:-mb-\[93px\]' : ''/);
    assert.match(piquim, /w-full px-\[60px\] py-\[18px\] max-md:px-4/);
    assert.match(piquim, /bg-\[var\(--store-header-bg\)\]/);
});
