import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalogPageUrl = new URL('../src/pages/store/CatalogPage.jsx', import.meta.url);

test('los grupos del filtro Piquim comienzan cerrados', async () => {
    const source = await readFile(catalogPageUrl, 'utf8');
    const groupedFilterTree = source.slice(
        source.indexOf('function GroupedFilterTree'),
        source.indexOf('function FlavorSelectionModal')
    );

    assert.match(groupedFilterTree, /initial\[group\.title\]\s*=\s*false/);
    assert.match(groupedFilterTree, /const isExpanded\s*=\s*expanded\[groupTitle\]\s*===\s*true/);
});
