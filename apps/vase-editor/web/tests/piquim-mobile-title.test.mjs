import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalogPageUrl = new URL('../src/pages/store/CatalogPage.jsx', import.meta.url);
const homePanelUrl = new URL('../src/components/blocks/PiquimCatalog3Panel.jsx', import.meta.url);

test('las cards Piquim permiten que títulos editables con barra envuelvan en mobile', async () => {
    const [catalogPage, homePanel] = await Promise.all([
        readFile(catalogPageUrl, 'utf8'),
        readFile(homePanelUrl, 'utf8'),
    ]);
    const exactCard = catalogPage.slice(
        catalogPage.indexOf('function PiquimExactCatalogCard'),
        catalogPage.indexOf('function PiquimCatalogFooter')
    );

    assert.doesNotMatch(exactCard, /inset-x-10 bottom-\[30px\] inline-flex[\s\S]*overflow-hidden/);
    assert.match(exactCard, /w-full max-w-full min-w-0/);
    assert.match(exactCard, /renderResponsiveCardTitle\(card\.title\)/);
    assert.match(homePanel, /renderResponsiveCardTitle\(card\.title\)/);
});
