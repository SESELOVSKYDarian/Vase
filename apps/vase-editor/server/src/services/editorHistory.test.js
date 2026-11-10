import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_HISTORY_ENTRIES,
  addEditorHistory,
  isUuid,
  listEditorHistory,
  normalizeHistoryEntry,
  readEditorHistoryEntry,
} from './editorHistory.js';

function fakeDb() {
  let rows = [];
  let seq = 0;
  return {
    async query(sql, params = []) {
      if (sql.startsWith('CREATE')) return { rows: [] };
      if (sql.startsWith('insert')) {
        seq += 1;
        const row = { id: `id-${seq}`, tenant_id: params[0], settings: params[1], pages: params[2], summary: params[3], created_at: seq };
        rows.push(row);
        return { rows: [{ id: row.id, summary: row.summary, created_at: row.created_at }] };
      }
      if (sql.startsWith('delete')) {
        const keep = rows.filter((row) => row.tenant_id === params[0]).sort((a, b) => b.created_at - a.created_at).slice(0, params[1]);
        rows = rows.filter((row) => row.tenant_id !== params[0] || keep.includes(row));
        return { rows: [] };
      }
      if (sql.startsWith('select id, summary')) {
        return { rows: rows.filter((row) => row.tenant_id === params[0]).sort((a, b) => b.created_at - a.created_at).slice(0, params[1]) };
      }
      if (sql.startsWith('select id, settings')) {
        return { rows: rows.filter((row) => row.tenant_id === params[0] && row.id === params[1]) };
      }
      throw new Error(`query no esperada: ${sql}`);
    },
  };
}

test('un punto guarda ajustes conocidos, las dos páginas y un resumen corto', () => {
  const entry = normalizeHistoryEntry({ settings: { theme: { a: 1 }, raro: 1 }, pages: { home: [{ id: 1 }], otra: [1] }, summary: 'x'.repeat(500) });
  assert.deepEqual(Object.keys(entry.pages), ['home', 'about']);
  assert.equal(entry.pages.about.length, 0);
  assert.equal(entry.summary.length, 160);
  assert.equal(normalizeHistoryEntry({}).summary, 'Cambios en el diseño');
});

test('solo quedan los últimos puntos de cada tienda', async () => {
  const db = fakeDb();
  for (let index = 0; index < MAX_HISTORY_ENTRIES + 3; index += 1) {
    await addEditorHistory('t1', normalizeHistoryEntry({ summary: `cambio ${index}` }), db);
  }
  await addEditorHistory('t2', normalizeHistoryEntry({ summary: 'otra tienda' }), db);
  const list = await listEditorHistory('t1', db);
  assert.equal(list.length, MAX_HISTORY_ENTRIES);
  assert.equal(list[0].summary, `cambio ${MAX_HISTORY_ENTRIES + 2}`);
  assert.equal((await listEditorHistory('t2', db)).length, 1);
});

test('no se puede leer un punto de otra tienda', async () => {
  const db = fakeDb();
  const saved = await addEditorHistory('t1', normalizeHistoryEntry({ summary: 'a' }), db);
  assert.ok(await readEditorHistoryEntry('t1', saved.id, db));
  assert.equal(await readEditorHistoryEntry('t2', saved.id, db), null);
});

test('reconoce ids válidos', () => {
  assert.equal(isUuid('3f2b8c1e-5a4d-4f7b-9c2e-1a2b3c4d5e6f'), true);
  assert.equal(isUuid("1' or '1'='1"), false);
});
