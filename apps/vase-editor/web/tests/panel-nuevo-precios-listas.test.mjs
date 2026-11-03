import assert from 'node:assert/strict';
import test from 'node:test';

import { adjustText, countClientsByList, listDirty, listDraftError, listPayload, listToDraft, newListDraft } from '../src/panel/precios.js';

const lists = [
    { id: 'r', type: 'retail', name: 'Retail', rules_json: {} },
    { id: 'w', type: 'wholesale', name: 'Mayorista', rules_json: { percent: -5 } },
    { id: 's', type: 'special', name: 'Especial', rules_json: { percent: 10, force_segment: 'wholesale' } },
];

test('cuenta clientes por lista igual que el servidor', () => {
    const clients = [
        { role: 'retail', status: 'active' },
        { role: 'wholesale', status: 'active' },
        { role: 'wholesale', status: 'pending' },
        { role: 'retail', status: 'active', price_list_id: 's' },
        { role: 'retail', status: 'active', price_list_id: 'borrada' },
    ];
    assert.deepEqual(countClientsByList(lists, clients), { r: 3, w: 1, s: 1 });
});

test('borradores de lista: cambios, errores y lo que se manda', () => {
    const draft = listToDraft(lists[2]);
    assert.deepEqual(draft, { name: 'Especial', percent: '10', force_segment: 'wholesale' });
    assert.equal(listDirty(lists[2], draft), false);
    assert.equal(listDirty(lists[2], { ...draft, percent: '10,5' }), true);
    assert.equal(listDirty(newListDraft(0), listToDraft({ rules_json: {} })), true);
    assert.equal(listDraftError({ name: ' ', percent: '0' }), 'Poné un nombre a la lista.');
    assert.equal(listDraftError({ name: 'A', percent: '600' }), 'El ajuste va de -90% a 500%.');
    assert.equal(listDraftError({ name: 'A', percent: 'x' }), 'El ajuste tiene que ser un número.');
    assert.deepEqual(listPayload({ name: ' Distribuidor ', percent: '-7,5', force_segment: '' }), { name: 'Distribuidor', percent: -7.5, force_segment: null });
    assert.equal(adjustText('0'), 'Igual al precio');
    assert.equal(adjustText('-5'), '5% más barato');
    assert.equal(adjustText('12'), '12% más caro');
});
