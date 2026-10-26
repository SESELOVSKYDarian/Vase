import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { adaptiveColor } from '../src/utils/adaptiveColor.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('los colores claros por defecto de los bloques pasan a variables del tema oscuro', () => {
    assert.equal(adaptiveColor('#ffffff', 'background'), 'var(--adaptive-background, #ffffff)');
    assert.equal(adaptiveColor('#F8FAFC', 'background'), 'var(--adaptive-surface, #F8FAFC)');
    assert.equal(adaptiveColor('#ffffff', 'card'), 'var(--adaptive-card, #ffffff)');
    assert.equal(adaptiveColor('#111827', 'text'), 'var(--adaptive-text, #111827)');
    assert.equal(adaptiveColor('#64748b', 'muted'), 'var(--adaptive-muted, #64748b)');
});

test('los colores personalizados no se modifican', () => {
    assert.equal(adaptiveColor('#ff4d00', 'background'), '#ff4d00');
    assert.equal(adaptiveColor('#111827', 'background'), '#111827');
    assert.equal(adaptiveColor('transparent', 'background'), 'transparent');
    assert.equal(adaptiveColor('var(--color-primary, #f97316)', 'text'), 'var(--color-primary, #f97316)');
    assert.equal(adaptiveColor(undefined, 'text'), undefined);
});

test('html.dark define las variables que usan los bloques', async () => {
    const css = await read('../src/index.css');
    const dark = css.slice(css.indexOf('html.dark {'));
    for (const name of ['--adaptive-background', '--adaptive-surface', '--adaptive-card', '--adaptive-text', '--adaptive-muted']) {
        assert.match(dark, new RegExp(`${name}: var\\(--store-`));
    }
    assert.doesNotMatch(css.slice(0, css.indexOf('html.dark {')), /--adaptive-/);
});

test('los bloques de Nosotros usan colores adaptativos', async () => {
    for (const block of ['AboutMission', 'AboutValues', 'AboutCTA', 'AboutTeam']) {
        const source = await read(`../src/components/blocks/${block}.jsx`);
        assert.match(source, /adaptiveColor\(styles\.backgroundColor/, `${block} fondo`);
        assert.match(source, /adaptiveColor\(styles\.textColor/, `${block} texto`);
    }
});

test('el header Piquim no agrega un separador extra debajo de la barra', async () => {
    const source = await read('../src/components/layout/Header.jsx');
    assert.doesNotMatch(source, /h-\[113px\] max-md:h-\[93px\]/);
    assert.match(source, /overlay \? '-mt-\[6px\] -mb-\[116px\] max-md:-mb-\[96px\]' : ''/);
});

test('el registro tiene variante oscura en fondo, tarjeta y campos', async () => {
    const source = await read('../src/pages/store/SignupPage.jsx');
    assert.match(source, /dark:from-\[var\(--store-background\)\]/);
    assert.match(source, /bg-white dark:bg-\[var\(--store-card-bg\)\]/);
    assert.match(source, /const inputClass = '[^']*dark:bg-\[var\(--store-card-bg\)\][^']*dark:text-\[var\(--store-text\)\]/);
});

test('el titulo del producto es legible en modo oscuro', async () => {
    const source = await read('../src/pages/store/ProductDetail.jsx');
    assert.match(source, /text-\[#1A1614\] dark:text-\[var\(--store-text\)\]/);
});
