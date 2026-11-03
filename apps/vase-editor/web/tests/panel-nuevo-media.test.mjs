import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { describeHref, fileMatches, inlineBytes, isInlineData, mediaName } from '../src/utils/mediaField.js';

test('nombre corto del archivo y aviso de archivos dentro de la página', () => {
    assert.equal(mediaName('https://uploads.vase.ar/p/mi%20portada.jpg?v=2'), 'mi portada.jpg');
    assert.equal(mediaName(''), '');
    const inline = `data:image/png;base64,${'A'.repeat(4000)}`;
    assert.equal(isInlineData(inline), true);
    assert.equal(inlineBytes(inline), 3000);
    assert.match(mediaName(inline), /^Archivo dentro de la página · 3 KB$/);
});

test('acepta solo el tipo de archivo pedido', () => {
    assert.equal(fileMatches({ type: 'image/jpeg', name: 'a.jpg' }, 'image/*'), true);
    assert.equal(fileMatches({ type: 'video/mp4', name: 'a.mp4' }, 'image/*'), false);
    assert.equal(fileMatches({ type: 'image/jpeg', name: 'a.jpg' }, 'image/png'), false);
    assert.equal(fileMatches({ type: '', name: 'ficha.PDF' }, '.pdf'), true);
});

test('dice a dónde lleva un link', () => {
    assert.equal(describeHref('/catalog').text, 'Página: Catálogo');
    assert.equal(describeHref('/product/123').kind, 'page');
    assert.equal(describeHref('https://wa.me/5492235551234').text, 'WhatsApp');
    assert.equal(describeHref('https://instagram.com/piquim').text, 'Otro sitio: instagram.com');
    assert.equal(describeHref('catalogo').kind, 'invalid');
});

test('el editor de bloques usa el campo nuevo de foto, video y link', async () => {
    const editor = await readFile(new URL('../src/components/admin/evolution/BlockPropertiesEditor.jsx', import.meta.url), 'utf8');
    assert.match(editor, /<MediaField[\s\S]*kind="image"/);
    assert.match(editor, /<MediaField[\s\S]*kind="video"/);
    assert.ok((editor.match(/<LinkInput/g) || []).length >= 10);
    assert.match(editor, /onDrop=\{\(event\) => \{/);
});
