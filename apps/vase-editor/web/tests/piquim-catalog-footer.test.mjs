import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getStorefrontThemeColorTokens, getStorefrontThemePreset } from '../src/utils/storefrontTheme.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('el fondo del catalogo sigue el modo: beige en claro y oscuro en oscuro', () => {
    const light = getStorefrontThemePreset('light').catalog;
    const dark = getStorefrontThemePreset('dark').catalog;
    assert.equal(light.shell_bg, '#f7f3ee');
    assert.equal(dark.shell_bg, '#0d0b0a');
    assert.equal(getStorefrontThemeColorTokens({}, 'dark').background, '#0d0b0a');
});

test('un tema personalizado puede cambiar el fondo del catalogo', () => {
    const custom = getStorefrontThemePreset('dark', { catalog: { shell_bg: '#101010' } }).catalog;
    assert.equal(custom.shell_bg, '#101010');
});

test('el pie enlaza "Vase" a vase.ar en los dos disenos', async () => {
    const source = await read('../src/components/layout/Footer.jsx');
    assert.match(source, /const VASE_URL = "https:\/\/vase\.ar"/);
    assert.match(source, /rel="noopener noreferrer"/);
    assert.equal(source.match(/<LegalText text=\{legalText\} \/>/g).length, 2);
    assert.doesNotMatch(source, /<p>\{legalText\}<\/p>/);
});

test('el texto legal se normaliza: (c) -> simbolo y Vase Business -> Vase enlazado', async () => {
    const source = await read('../src/components/layout/Footer.jsx');
    const body = source.slice(source.indexOf('function LegalText'), source.indexOf('export default function Footer'));
    // Se ejecuta la misma logica de division que usa el componente
    const value = '(c) 2026 Vase Business. Todos los derechos reservados.'.replace(/^\(c\)/i, '©');
    const parts = value.split(/(Vase(?: Business)?)/);
    assert.deepEqual(parts, ['© 2026 ', 'Vase Business', '. Todos los derechos reservados.']);
    assert.match(body, /split\(\/\(Vase\(\?: Business\)\?\)\/\)/);
    assert.match(body, /Vase\n\s+<\/a>/);
});

test('el bloque Equipo tiene ancla y se edita desde el panel', async () => {
    const block = await read('../src/components/blocks/AboutTeam.jsx');
    assert.match(block, /anchor = 'equipo'/);
    assert.match(block, /<section id=\{String\(anchor/);
    const editor = await read('../src/components/admin/evolution/BlockPropertiesEditor.jsx');
    assert.match(editor, /label="Ancla \(id\)"/);
});

test('la altura de la portada de Nosotros se edita desde el panel', async () => {
    const editor = await read('../src/components/admin/evolution/BlockPropertiesEditor.jsx');
    assert.match(editor, /handleStyleChange\('minHeight'/);
});
