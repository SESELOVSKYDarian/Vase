import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    getStorefrontThemeColorTokens,
    getStorefrontThemePreset,
} from '../src/utils/storefrontTheme.js';

const catalogPageUrl = new URL('../src/pages/store/CatalogPage.jsx', import.meta.url);

test('el preset oscuro usa la paleta calida de Piquim', () => {
    const theme = getStorefrontThemePreset('dark');
    const tokens = getStorefrontThemeColorTokens(theme, 'dark');

    assert.equal(tokens.primary, '#ff4d00');
    assert.equal(tokens.background, '#0d0b0a');
    assert.equal(tokens.surface, '#181411');
    assert.equal(tokens.surface_soft, '#211b18');
    assert.equal(tokens.card_bg, '#181411');
    assert.equal(tokens.text, '#fffaf6');
});

test('las superficies principales del catalogo Piquim consumen tokens semanticos', async () => {
    const source = await readFile(catalogPageUrl, 'utf8');
    const page = source.slice(
        source.indexOf('function PiquimSubcatalogPage'),
        source.indexOf('function PiquimCatalogLoadingState')
    );
    const sidebar = source.slice(
        source.indexOf('function PiquimSubcatalogSidebar'),
        source.indexOf('function GroupedFilterTree')
    );
    const card = source.slice(
        source.indexOf('function PiquimSubcatalogProductCard'),
        source.indexOf('function ProductDisplayIcon')
    );

    assert.match(page, /bg-\[var\(--store-background\)\]/);
    assert.doesNotMatch(page, /bg-\[#FFFAF6\]/);
    assert.match(sidebar, /bg-\[var\(--store-panel-bg\)\]/);
    assert.match(card, /bg-\[var\(--store-card-bg\)\]/);
    assert.match(card, /text-\[var\(--store-text\)\]/);
});
