import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeSpecSheet } from './specSheet.js';

test('ficha técnica: acepta links http(s) y descarta el resto', () => {
  assert.deepEqual(normalizeSpecSheet({ url: 'https://uploads.vase.ar/p/ficha.pdf', name: ' Ficha almendrado.pdf ', size: 245760.4 }), { url: 'https://uploads.vase.ar/p/ficha.pdf', name: 'Ficha almendrado.pdf', size: 245760 });
  assert.equal(normalizeSpecSheet({ url: 'javascript:alert(1)' }), null);
  assert.equal(normalizeSpecSheet({ url: 'data:application/pdf;base64,AAA' }), null);
  assert.equal(normalizeSpecSheet({ url: 'no es un link' }), null);
  assert.equal(normalizeSpecSheet(null), null);
  assert.equal(normalizeSpecSheet({ url: 'https://x.test/a/mi%20ficha.pdf' }).name, 'mi ficha.pdf');
});
