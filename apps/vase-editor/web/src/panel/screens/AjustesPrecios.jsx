import React, { useEffect, useMemo, useState } from 'react';
import { errorText, panelFetch } from '../api';
import { isClient } from '../clients';
import Select from '../components/Select';
import { PRICE_VISIBILITY, getPriceVisibilityMode } from '../../utils/priceVisibility';
import { PRICE_TIER_SLOT_COUNT, getDefaultPriceTierLabel, normalizePriceTierLabels } from '../../utils/priceTierLabels';
import { adjustText, countClientsByList, listDirty, listDraftError, listPayload, listToDraft, newListDraft } from '../precios';
import { PanelCard } from '@vase/ui/panel/pieces';

const VISIBILITY = [
    [PRICE_VISIBILITY.PUBLIC, 'Todos', 'Cualquier visitante ve los precios.'],
    [PRICE_VISIBILITY.AUTHENTICATED, 'Clientes con cuenta', 'El resto ve “Ingresá para ver precios”.'],
    [PRICE_VISIBILITY.HIDDEN, 'Nadie', 'La tienda muestra “Consultar precio”.'],
];

const WHO = { retail: 'Minoristas', wholesale: 'Mayoristas aprobados', special: 'Asignada a mano' };

// Ajustes › Precios y listas: quién ve precios, tus listas y cómo se llama cada precio.
export default function AjustesPrecios({ editor, user, toast, onSave, goClients }) {
    const settings = editor.settings || {};
    const commerce = settings.commerce || {};
    const visibility = getPriceVisibilityMode(settings);
    const tierLabels = normalizePriceTierLabels(commerce.price_tier_labels);
    const tierName = (slot) => tierLabels[`price_${slot}`] || getDefaultPriceTierLabel(slot);

    const [lists, setLists] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [clients, setClients] = useState([]);
    const [savingLists, setSavingLists] = useState(false);
    const [newCount, setNewCount] = useState(0);

    useEffect(() => {
        panelFetch('/tenant/price-lists', { user })
            .then((payload) => {
                const items = payload.items || [];
                setLists(items);
                setDrafts(Object.fromEntries(items.map((list) => [list.id, listToDraft(list)])));
            })
            .catch(() => toast('No se pudieron cargar las listas de precios.', 'error'));
        (async () => {
            const all = [];
            for (let page = 1; page <= 20; page += 1) {
                const payload = await panelFetch(`/tenant/users?page=${page}&limit=50`, { user });
                all.push(...(payload.items || []));
                if (all.length >= Number(payload.total || 0) || !(payload.items || []).length) break;
            }
            setClients(all.filter(isClient));
        })().catch(() => {});
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const counts = useMemo(() => countClientsByList(lists, clients), [lists, clients]);
    const pending = clients.filter((client) => client.status === 'pending').length;
    // Sin ajuste cargado se aprueba a mano, como siempre.
    const manualApproval = commerce.manual_approval !== false;
    const autoWholesale = commerce.auto_approve_wholesale === true;
    const updateCommerce = (patch) => editor.setSettings((prev) => ({ ...prev, commerce: { ...(prev?.commerce || {}), ...patch } }));
    const setDraft = (id, patch) => setDrafts((all) => ({ ...all, [id]: { ...all[id], ...patch } }));
    const dirtyLists = lists.filter((list) => listDirty(list, drafts[list.id]));
    // Lista que ven los visitantes sin cuenta; si la borraron, vuelve al precio de siempre.
    const guestList = lists.find((list) => !list.isNew && list.id === commerce.guest_price_list_id) || null;

    const addList = () => {
        const draft = newListDraft(newCount);
        setNewCount((value) => value + 1);
        setLists((items) => [...items, draft]);
        setDrafts((all) => ({ ...all, [draft.id]: listToDraft({ name: '', rules_json: {} }) }));
    };

    const discard = () => {
        const kept = lists.filter((list) => !list.isNew);
        setLists(kept);
        setDrafts(Object.fromEntries(kept.map((list) => [list.id, listToDraft(list)])));
    };

    const saveLists = async () => {
        const problem = dirtyLists.map((list) => listDraftError(drafts[list.id])).find(Boolean);
        if (problem) { toast(problem, 'error'); return; }
        setSavingLists(true);
        const saved = {};
        try {
            for (const list of dirtyLists) {
                const body = listPayload(drafts[list.id]);
                saved[list.id] = list.isNew
                    ? await panelFetch('/tenant/price-lists', { method: 'POST', body, user })
                    : await panelFetch(`/tenant/price-lists/${list.id}`, { method: 'PUT', body, user });
            }
            toast(dirtyLists.length > 1 ? 'Listas guardadas' : 'Lista guardada', 'success');
        } catch (err) {
            toast(errorText(err), 'error');
        } finally {
            // Lo que llegó a guardarse queda guardado aunque otra lista haya fallado.
            setLists((items) => items.map((list) => saved[list.id] || list));
            setDrafts((all) => {
                const next = { ...all };
                Object.entries(saved).forEach(([oldId, list]) => { delete next[oldId]; next[list.id] = listToDraft(list); });
                return next;
            });
            setSavingLists(false);
        }
    };

    return (
        <div className="vp-scol vp-precios">
            <div className="vp-pgrid">
                <PanelCard stack className="vp-card vp-sec" title="¿Quién ve los precios?" description="Qué pasa cuando alguien entra sin cuenta.">
                    <div className="vp-three">
                        {VISIBILITY.map(([mode, label, help]) => (
                            <button key={mode} type="button" className={`vp-choice ${visibility === mode ? 'on' : ''}`} onClick={() => updateCommerce({ price_visibility: mode, show_prices: mode !== PRICE_VISIBILITY.HIDDEN })}>
                                <b>{label}</b><span>{help}</span>
                                {visibility === mode ? <span className="ck">Elegido</span> : null}
                            </button>
                        ))}
                    </div>
                    {visibility === PRICE_VISIBILITY.PUBLIC ? (
                        <div className="vp-row">
                            <div className="g">
                                <b>Qué precio ven sin iniciar sesión</b>
                                <span>{guestList
                                    ? `Los visitantes ven los precios de la lista ${guestList.name}${guestList.type === 'wholesale' ? ' (mayorista)' : ''}.`
                                    : 'Los visitantes ven el precio minorista de siempre.'}</span>
                            </div>
                            <Select
                                variant="inp"
                                ariaLabel="Qué precio ven sin iniciar sesión"
                                value={guestList ? guestList.id : ''}
                                onChange={(next) => updateCommerce({ guest_price_list_id: next || null })}
                                options={[{ value: '', label: 'Precio minorista de siempre' }, ...lists.filter((list) => !list.isNew).map((list) => ({ value: list.id, label: `Lista ${list.name}` }))]}
                            />
                        </div>
                    ) : null}
                    <div className="vp-row">
                        <div className="g">
                            <b>Aprobar minoristas a mano</b>
                            <span>{manualApproval
                                ? 'Cada minorista nuevo espera que lo apruebes antes de poder comprar.'
                                : 'Los minoristas entran solos apenas verifican su correo.'}</span>
                        </div>
                        <button type="button" role="switch" aria-checked={manualApproval} aria-label="Aprobar minoristas a mano" className={`vp-tog ${manualApproval ? '' : 'off'}`} onClick={() => updateCommerce({ manual_approval: !manualApproval })} />
                    </div>
                    <div className="vp-row">
                        <div className="g">
                            <b>Aprobar mayoristas a mano</b>
                            <span>{autoWholesale
                                ? 'Los mayoristas entran solos y ven sus precios sin que revises la cuenta.'
                                : 'Cada mayorista nuevo espera que lo apruebes antes de ver sus precios.'}</span>
                        </div>
                        <button type="button" role="switch" aria-checked={!autoWholesale} aria-label="Aprobar mayoristas a mano" className={autoWholesale ? 'vp-tog off' : 'vp-tog'} onClick={() => updateCommerce({ auto_approve_wholesale: !autoWholesale })} />
                    </div>
                    {pending ? (
                        <div className="vp-lock">
                            Hoy hay {pending} {pending === 1 ? 'cuenta esperando' : 'cuentas esperando'} tu aprobación.
                            {goClients ? <> <button type="button" className="vp-link" onClick={goClients}>Ver pendientes</button></> : null}
                        </div>
                    ) : null}
                </PanelCard>

                <PanelCard stack className="vp-card vp-sec" title="Opiniones de clientes" description="Las estrellas y comentarios en cada producto.">
                    <div className="vp-row">
                        <div className="g"><b>Mostrar opiniones en los productos</b><span>Solo pueden opinar clientes con cuenta.</span></div>
                        <button type="button" role="switch" aria-checked={commerce.reviews_enabled !== false} aria-label="Mostrar opiniones" className={`vp-tog ${commerce.reviews_enabled === false ? 'off' : ''}`} onClick={() => updateCommerce({ reviews_enabled: commerce.reviews_enabled === false })} />
                    </div>
                </PanelCard>
            </div>

            <PanelCard stack className="vp-card vp-sec" title="Tus listas de precios" description="Poneles el nombre que quieras. Cada cliente usa la lista de su tipo, salvo que le asignes otra en Clientes.">
                <div className="vp-tblw">
                    <table className="vp-ltbl">
                        <thead><tr><th>Nombre de la lista</th><th>Usa el precio</th><th>Ajuste</th><th>Clientes</th></tr></thead>
                        <tbody>
                            {lists.map((list) => {
                                const draft = drafts[list.id] || listToDraft(list);
                                const count = counts[list.id] || 0;
                                return (
                                    <tr key={list.id} className={listDirty(list, draft) ? 'dirty' : ''}>
                                        <td data-label="Nombre de la lista">
                                            <input className="vp-inp" aria-label="Nombre de la lista" placeholder="Ej.: Distribuidor" value={draft.name} onChange={(event) => setDraft(list.id, { name: event.target.value })} />
                                            <span className="vp-note">{WHO[list.type] || WHO.special}{(guestList ? guestList.id === list.id : list.type === 'retail') && visibility === PRICE_VISIBILITY.PUBLIC ? ' y visitantes' : ''}</span>
                                        </td>
                                        <td data-label="Usa el precio">
                                            <Select
                                                ariaLabel={`Precio que usa ${draft.name || 'la lista'}`}
                                                value={draft.force_segment}
                                                onChange={(next) => setDraft(list.id, { force_segment: next })}
                                                options={[
                                                    { value: '', label: 'Según el cliente', hint: 'Minorista o mayorista según su cuenta' },
                                                    { value: 'retail', label: tierName(1) },
                                                    { value: 'wholesale', label: tierName(2) },
                                                ]}
                                            />
                                        </td>
                                        <td data-label="Ajuste">
                                            <label className="vp-pct">
                                                <input inputMode="decimal" aria-label={`Ajuste de ${draft.name || 'la lista'}`} value={draft.percent} onChange={(event) => setDraft(list.id, { percent: event.target.value })} />
                                                <span>%</span>
                                            </label>
                                            <span className="vp-note">{adjustText(draft.percent)}</span>
                                        </td>
                                        <td data-label="Clientes" className="num">
                                            {list.isNew ? <span className="vp-note">Nueva</span> : <b>{list.type === 'retail' ? `Nuevos + ${count}` : count}</b>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="vp-lfoot">
                    <button type="button" className="vp-addc" onClick={addList}>+ Nueva lista</button>
                    <span className="vp-sp" />
                    {dirtyLists.length ? <button type="button" className="vp-btn soft" onClick={discard} disabled={savingLists}>Descartar</button> : null}
                    <button type="button" className="vp-btn acc" onClick={saveLists} disabled={!dirtyLists.length || savingLists}>{savingLists ? 'Guardando…' : 'Guardar listas'}</button>
                </div>
            </PanelCard>

            <PanelCard stack className="vp-card vp-sec" title="Nombres de los precios" description="Cómo se llama cada precio que llega de tu sistema de gestión. Se ven en el detalle de precios del producto.">
                <div className="vp-tiers">
                    {Array.from({ length: PRICE_TIER_SLOT_COUNT }, (_, index) => index + 1).slice(0, 6).map((slot) => (
                        <div key={slot} className="vp-fld">
                            <label htmlFor={`tier-${slot}`}>Precio {slot}</label>
                            <input id={`tier-${slot}`} className="vp-inp" value={tierLabels[`price_${slot}`] || ''} placeholder={getDefaultPriceTierLabel(slot)} onChange={(event) => updateCommerce({ price_tier_labels: { ...tierLabels, [`price_${slot}`]: event.target.value } })} />
                        </div>
                    ))}
                </div>
                <div className="vp-lock ok">
                    Si un producto viene de tu sistema de gestión, en cada sincronización gana el precio del sistema. Para que no lo pise, abrí el producto y activá “No pisar mis cambios”.
                </div>
            </PanelCard>

            {editor.canUndo ? (
                <div className="vp-floatsave" role="status">
                    <span>Tenés cambios sin guardar en estos ajustes.</span>
                    <button type="button" className="vp-btn acc" onClick={onSave} disabled={editor.saving}>{editor.saving ? 'Guardando…' : 'Guardar ajustes'}</button>
                </div>
            ) : null}
        </div>
    );
}
