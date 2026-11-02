import React, { useEffect, useState } from 'react';
import { errorText, panelFetch } from '../api';
import { PRICE_VISIBILITY, getPriceVisibilityMode } from '../../utils/priceVisibility';
import { PRICE_TIER_SLOT_COUNT, getDefaultPriceTierLabel, normalizePriceTierLabels } from '../../utils/priceTierLabels';

const VISIBILITY = [
    [PRICE_VISIBILITY.PUBLIC, 'Todos', 'Cualquier visitante ve los precios.'],
    [PRICE_VISIBILITY.AUTHENTICATED, 'Solo con cuenta', 'Los precios aparecen cuando el cliente entra con su cuenta.'],
    [PRICE_VISIBILITY.HIDDEN, 'Nadie', 'La tienda muestra “Consultar precio”.'],
];

const LIST_TYPE = { retail: 'Minoristas', wholesale: 'Mayoristas' };

const listToDraft = (list) => ({
    name: list.name || '',
    percent: String(Number(list.rules_json?.percent || 0)),
    force_segment: list.rules_json?.force_segment || '',
});

// Ajustes › Precios y listas: quién ve precios, cada lista y los nombres de los precios.
export default function AjustesPrecios({ editor, user, toast, onSave }) {
    const settings = editor.settings || {};
    const commerce = settings.commerce || {};
    const visibility = getPriceVisibilityMode(settings);
    const tierLabels = normalizePriceTierLabels(commerce.price_tier_labels);

    const [lists, setLists] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [savingList, setSavingList] = useState(null);

    useEffect(() => {
        panelFetch('/tenant/price-lists', { user })
            .then((payload) => {
                const items = payload.items || [];
                setLists(items);
                setDrafts(Object.fromEntries(items.map((list) => [list.id, listToDraft(list)])));
            })
            .catch(() => toast('No se pudieron cargar las listas de precios.', 'error'));
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateCommerce = (patch) => editor.setSettings((prev) => ({ ...prev, commerce: { ...(prev?.commerce || {}), ...patch } }));

    const saveList = async (list) => {
        const draft = drafts[list.id];
        const percent = Number(String(draft.percent).replace(',', '.'));
        if (!draft.name.trim() || !Number.isFinite(percent)) {
            toast('Revisá el nombre y el porcentaje.', 'error');
            return;
        }
        setSavingList(list.id);
        try {
            const saved = await panelFetch(`/tenant/price-lists/${list.id}`, {
                method: 'PUT',
                body: { name: draft.name.trim(), percent, force_segment: draft.force_segment || null },
                user,
            });
            setLists((items) => items.map((item) => (item.id === saved.id ? saved : item)));
            toast('Lista guardada', 'success');
        } catch (err) {
            toast(errorText(err), 'error');
        } finally {
            setSavingList(null);
        }
    };

    const setDraft = (id, patch) => setDrafts((all) => ({ ...all, [id]: { ...all[id], ...patch } }));
    const listDirty = (list) => {
        const draft = drafts[list.id];
        const base = listToDraft(list);
        return draft && (draft.name !== base.name || Number(draft.percent) !== Number(base.percent) || draft.force_segment !== base.force_segment);
    };

    return (
        <div className="vp-sgrid">
            <div className="vp-scol">
                <div className="vp-card vp-sec">
                    <h3>¿Quién ve los precios?</h3>
                    <div className="vp-three">
                        {VISIBILITY.map(([mode, label, help]) => (
                            <button key={mode} type="button" className={`vp-choice ${visibility === mode ? 'on' : ''}`} onClick={() => updateCommerce({ price_visibility: mode, show_prices: mode !== PRICE_VISIBILITY.HIDDEN })}>
                                <b>{label}</b><span>{help}</span>
                                {visibility === mode ? <span className="ck">Elegido</span> : null}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="vp-card vp-sec">
                    <h3>Listas de precios</h3>
                    <p>Cada cliente usa la lista de su tipo, salvo que le asignes otra en Clientes. El porcentaje se suma (o resta) al precio base.</p>
                    {lists.map((list) => {
                        const draft = drafts[list.id] || listToDraft(list);
                        return (
                            <div key={list.id} className="vp-stepc">
                                <div className="g">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                        <b>{list.name}</b>
                                        <span className="vp-note">{LIST_TYPE[list.type] ? `Para ${LIST_TYPE[list.type].toLowerCase()}` : 'Se asigna a mano'}</span>
                                    </div>
                                    <div className="vp-three">
                                        <input className="vp-inp" aria-label={`Nombre de ${list.name}`} value={draft.name} onChange={(event) => setDraft(list.id, { name: event.target.value })} />
                                        <select className="vp-inp" aria-label={`Precio base de ${list.name}`} value={draft.force_segment} onChange={(event) => setDraft(list.id, { force_segment: event.target.value })}>
                                            <option value="">Base: según el cliente</option>
                                            <option value="retail">Base: precio minorista</option>
                                            <option value="wholesale">Base: precio mayorista</option>
                                        </select>
                                        <label className="vp-search" style={{ minWidth: 0 }}>
                                            <input inputMode="decimal" aria-label={`Porcentaje de ${list.name}`} value={draft.percent} onChange={(event) => setDraft(list.id, { percent: event.target.value })} />%
                                        </label>
                                    </div>
                                    <span className="vp-note">
                                        {Number(draft.percent) > 0 ? `${draft.percent}% más caro que la base` : Number(draft.percent) < 0 ? `${Math.abs(Number(draft.percent))}% más barato que la base` : 'Igual a la base'}
                                    </span>
                                    {listDirty(list) ? (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                            <button type="button" className="vp-btn soft sm" onClick={() => setDraft(list.id, listToDraft(list))}>Descartar</button>
                                            <button type="button" className="vp-btn acc sm" disabled={savingList === list.id} onClick={() => saveList(list)}>{savingList === list.id ? 'Guardando…' : 'Guardar lista'}</button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="vp-scol">
                <div className="vp-card vp-sec">
                    <h3>Opiniones de clientes</h3>
                    <div className="vp-row">
                        <div className="g"><b>Mostrar opiniones en los productos</b><span>Solo pueden opinar clientes con cuenta.</span></div>
                        <button type="button" role="switch" aria-checked={commerce.reviews_enabled !== false} aria-label="Mostrar opiniones" className={`vp-tog ${commerce.reviews_enabled === false ? 'off' : ''}`} onClick={() => updateCommerce({ reviews_enabled: commerce.reviews_enabled === false })} />
                    </div>
                </div>

                <div className="vp-card vp-sec">
                    <h3>Nombres de los precios</h3>
                    <p>Cómo se llama cada precio que llega de tu sistema (se ven en el detalle de precios del producto).</p>
                    {Array.from({ length: PRICE_TIER_SLOT_COUNT }, (_, index) => index + 1).slice(0, 6).map((slot) => (
                        <div key={slot} className="vp-fld">
                            <label htmlFor={`tier-${slot}`}>Precio {slot}</label>
                            <input id={`tier-${slot}`} className="vp-inp" value={tierLabels[`price_${slot}`] || ''} placeholder={getDefaultPriceTierLabel(slot)} onChange={(event) => updateCommerce({ price_tier_labels: { ...tierLabels, [`price_${slot}`]: event.target.value } })} />
                        </div>
                    ))}
                </div>

                <div className="vp-lock ok">
                    ¿Subiste un precio acá y después volvió al anterior? Si el producto viene de tu sistema de gestión, en cada sincronización gana el precio del sistema.
                    Para que no lo pise, abrí el producto y activá “No pisar mis cambios”.
                </div>
            </div>

            <div className="vp-savebar" style={{ gridColumn: '1 / -1' }}>
                <span className="vp-note" style={{ alignSelf: 'center' }}>{editor.canUndo ? 'Tenés cambios sin guardar en estos ajustes.' : 'Las listas se guardan cada una con su botón.'}</span>
                <button type="button" className="vp-btn acc" onClick={onSave} disabled={!editor.canUndo || editor.saving}>{editor.saving ? 'Guardando…' : 'Guardar ajustes'}</button>
            </div>
        </div>
    );
}
