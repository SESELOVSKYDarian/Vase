import React, { useEffect, useMemo, useState } from 'react';
import { errorText, panelFetch } from '../api';
import { isClient } from '../clients';
import Select from '../components/Select';
import { PRICE_VISIBILITY, getPriceVisibilityMode } from '../../utils/priceVisibility';
import { PRICE_TIER_SLOT_COUNT, getDefaultPriceTierLabel, normalizePriceTierLabels } from '../../utils/priceTierLabels';
import { adjustText, countClientsByList, listDirty, listDraftError, listPayload, listToDraft, newListDraft } from '../precios';

const VISIBILITY = [
    [PRICE_VISIBILITY.PUBLIC, 'Todos', 'Cualquier visitante ve los precios.'],
    [PRICE_VISIBILITY.AUTHENTICATED, 'Clientes con cuenta', 'El resto ve “Ingresá para ver precios”.'],
    [PRICE_VISIBILITY.HIDDEN, 'Nadie', 'La tienda muestra “Consultar precio”.'],
];

const WHO = { retail: 'Minoristas y visitantes', wholesale: 'Mayoristas aprobados', special: 'Asignada a mano' };

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
    const updateCommerce = (patch) => editor.setSettings((prev) => ({ ...prev, commerce: { ...(prev?.commerce || {}), ...patch } }));
    const setDraft = (id, patch) => setDrafts((all) => ({ ...all, [id]: { ...all[id], ...patch } }));
    const dirtyLists = lists.filter((list) => listDirty(list, drafts[list.id]));

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
                <div className="vp-card vp-sec">
                    <h3>¿Quién ve los precios?</h3>
                    <p>Qué pasa cuando alguien entra sin cuenta.</p>
                    <div className="vp-three">
                        {VISIBILITY.map(([mode, label, help]) => (
                            <button key={mode} type="button" className={`vp-choice ${visibility === mode ? 'on' : ''}`} onClick={() => updateCommerce({ price_visibility: mode, show_prices: mode !== PRICE_VISIBILITY.HIDDEN })}>
                                <b>{label}</b><span>{help}</span>
                                {visibility === mode ? <span className="ck">Elegido</span> : null}
                            </button>
                        ))}
                    </div>
                    <div className="vp-row">
                        <div className="g">
                            <b>Aprobar clientes nuevos a mano</b>
                            <span>{manualApproval
                                ? 'Cada cuenta nueva espera que la apruebes antes de poder entrar.'
                                : 'Los minoristas entran solos apenas verifican su correo. Los mayoristas siempre esperan tu aprobación.'}</span>
                        </div>
                        <button type="button" role="switch" aria-checked={manualApproval} aria-label="Aprobar clientes nuevos a mano" className={`vp-tog ${manualApproval ? '' : 'off'}`} onClick={() => updateCommerce({ manual_approval: !manualApproval })} />
                    </div>
                    {pending ? (
                        <div className="vp-lock">
                            Hoy hay {pending} {pending === 1 ? 'cuenta esperando' : 'cuentas esperando'} tu aprobación.
                            {goClients ? <> <button type="button" className="vp-link" onClick={goClients}>Ver pendientes</button></> : null}
                        </div>
                    ) : null}
                </div>

                <div className="vp-card vp-sec">
                    <h3>Opiniones de clientes</h3>
                    <p>Las estrellas y comentarios en cada producto.</p>
                    <div className="vp-row">
                        <div className="g"><b>Mostrar opiniones en los productos</b><span>Solo pueden opinar clientes con cuenta.</span></div>
                        <button type="button" role="switch" aria-checked={commerce.reviews_enabled !== false} aria-label="Mostrar opiniones" className={`vp-tog ${commerce.reviews_enabled === false ? 'off' : ''}`} onClick={() => updateCommerce({ reviews_enabled: commerce.reviews_enabled === false })} />
                    </div>
                </div>
            </div>

            <div className="vp-card vp-sec">
                <h3>Tus listas de precios</h3>
                <p>Poneles el nombre que quieras. Cada cliente usa la lista de su tipo, salvo que le asignes otra en Clientes.</p>
                <div className="vp-tblw">
                    <table className="vp-ltbl">
                        <thead><tr><th>Nombre de la lista</th><th>Usa el precio</th><th>Ajuste</th><th>Clientes</th></tr></thead>
                        <tbody>
                            {lists.map((list) => {
                                const draft = drafts[list.id] || listToDraft(list);
                                const count = counts[list.id] || 0;
                                return (
                                    <tr key={list.id} className={listDirty(list, draft) ? 'dirty' : ''}>
                                        <td>
                                            <input className="vp-inp" aria-label="Nombre de la lista" placeholder="Ej.: Distribuidor" value={draft.name} onChange={(event) => setDraft(list.id, { name: event.target.value })} />
                                            <span className="vp-note">{WHO[list.type] || WHO.special}</span>
                                        </td>
                                        <td>
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
                                        <td>
                                            <label className="vp-pct">
                                                <input inputMode="decimal" aria-label={`Ajuste de ${draft.name || 'la lista'}`} value={draft.percent} onChange={(event) => setDraft(list.id, { percent: event.target.value })} />
                                                <span>%</span>
                                            </label>
                                            <span className="vp-note">{adjustText(draft.percent)}</span>
                                        </td>
                                        <td className="num">
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
            </div>

            <div className="vp-card vp-sec">
                <h3>Nombres de los precios</h3>
                <p>Cómo se llama cada precio que llega de tu sistema de gestión. Se ven en el detalle de precios del producto.</p>
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
            </div>

            {editor.canUndo ? (
                <div className="vp-floatsave" role="status">
                    <span>Tenés cambios sin guardar en estos ajustes.</span>
                    <button type="button" className="vp-btn acc" onClick={onSave} disabled={editor.saving}>{editor.saving ? 'Guardando…' : 'Guardar ajustes'}</button>
                </div>
            ) : null}
        </div>
    );
}
