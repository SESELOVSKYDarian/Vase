// Ajustes › Precios y listas: borradores de las listas y cuántos clientes usa cada una.

export const NEW_PREFIX = 'nueva-';

export const listToDraft = (list) => ({
    name: list.name || '',
    percent: String(Number(list.rules_json?.percent || 0)),
    force_segment: list.rules_json?.force_segment || '',
});

export const newListDraft = (index) => ({ id: `${NEW_PREFIX}${index}`, type: 'special', isNew: true, name: '', percent: '0', force_segment: '' });

export const parsePercent = (value) => Number(String(value ?? '').trim().replace(',', '.') || 0);

export function listDraftError(draft) {
    if (!String(draft?.name || '').trim()) return 'Poné un nombre a la lista.';
    const percent = parsePercent(draft.percent);
    if (!Number.isFinite(percent)) return 'El ajuste tiene que ser un número.';
    if (percent < -90 || percent > 500) return 'El ajuste va de -90% a 500%.';
    return '';
}

export function listDirty(list, draft) {
    if (!draft) return false;
    if (list.isNew) return true;
    const base = listToDraft(list);
    return draft.name.trim() !== base.name || parsePercent(draft.percent) !== parsePercent(base.percent) || draft.force_segment !== base.force_segment;
}

export const listPayload = (draft) => ({ name: draft.name.trim(), percent: parsePercent(draft.percent), force_segment: draft.force_segment || null });

export function adjustText(percent) {
    const value = parsePercent(percent);
    if (!Number.isFinite(value) || value === 0) return 'Igual al precio';
    return value > 0 ? `${value}% más caro` : `${Math.abs(value)}% más barato`;
}

// Igual que el servidor: la lista asignada a mano o, si no tiene, la primera de su tipo
// (mayorista aprobado → mayorista; el resto → minorista).
export function countClientsByList(lists = [], clients = []) {
    const counts = Object.fromEntries(lists.map((list) => [list.id, 0]));
    const firstOf = (type) => lists.find((list) => list.type === type)?.id;
    const retail = firstOf('retail');
    const wholesale = firstOf('wholesale');
    for (const client of clients) {
        const explicit = client.price_list_id && counts[client.price_list_id] !== undefined ? client.price_list_id : null;
        const auto = client.role === 'wholesale' && client.status === 'active' ? wholesale : retail;
        const id = explicit || auto;
        if (id && counts[id] !== undefined) counts[id] += 1;
    }
    return counts;
}
