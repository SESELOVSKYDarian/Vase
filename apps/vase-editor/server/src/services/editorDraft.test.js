import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearEditorDraft,
  normalizeEditorDraft,
  readEditorDraft,
  writeEditorDraft,
} from './editorDraft.js';

function fakeDb() {
  const rows = new Map();
  const queries = [];
  return {
    queries,
    async query(sql, params = []) {
      queries.push(sql);
      if (sql.startsWith('CREATE TABLE')) return { rows: [] };
      if (sql.startsWith('insert')) {
        rows.set(params[0], { settings: params[1], updated_at: 'now' });
        return { rows: [{ updated_at: 'now' }] };
      }
      if (sql.startsWith('select')) return { rows: rows.has(params[0]) ? [rows.get(params[0])] : [] };
      if (sql.startsWith('delete')) {
        rows.delete(params[0]);
        return { rows: [] };
      }
      throw new Error(`query no esperada: ${sql}`);
    },
  };
}

test('el borrador solo guarda las partes conocidas de los ajustes', () => {
  const draft = normalizeEditorDraft({ settings: { branding: { name: 'Teflon' }, hack: { x: 1 } } });
  assert.deepEqual(Object.keys(draft).sort(), ['branding', 'commerce', 'seo', 'theme']);
  assert.equal(draft.branding.name, 'Teflon');
});

test('un cuerpo inválido deja un borrador vacío', () => {
  const draft = normalizeEditorDraft('nada');
  assert.deepEqual(draft.branding, {});
});

test('se guarda, se lee y se borra por tienda', async () => {
  const db = fakeDb();
  await writeEditorDraft('t1', { branding: { name: 'A' } }, db);
  assert.equal((await readEditorDraft('t1', db)).settings.branding.name, 'A');
  assert.equal(await readEditorDraft('t2', db), null);
  await clearEditorDraft('t1', db);
  assert.equal(await readEditorDraft('t1', db), null);
});
