import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const storeLayoutUrl = new URL('../src/components/layout/StoreLayout.jsx', import.meta.url);
const editorUrl = new URL('../src/pages/admin/EditorPage.jsx', import.meta.url);

test('el favicon del tenant no hereda el logo horizontal y se configura por separado', async () => {
    const [storeLayout, editor] = await Promise.all([readFile(storeLayoutUrl, 'utf8'), readFile(editorUrl, 'utf8')]);

    assert.match(storeLayout, /favicon_url \|\| settings\?\.seo\?\.favicon_url \|\| '\/favicon\.ico'/);
    assert.doesNotMatch(storeLayout, /favicon_url \|\| settings\?\.seo\?\.favicon_url \|\| settings\?\.branding\?\.logo_url/);
    assert.match(storeLayout, /faviconLink\.setAttribute\('type', faviconMimeType\)/);
    assert.match(editor, /favicon_url:/);
    assert.match(editor, /Vista previa del favicon/);
    assert.match(editor, /object-contain/);
});
