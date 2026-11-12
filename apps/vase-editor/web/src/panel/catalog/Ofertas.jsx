import React, { useEffect, useMemo, useState } from 'react';
import { Modal, SidePanel } from '../components/Overlays';
import { errorText, panelFetch } from '../api';
import { isClient } from '../clients';
import { buildCategoryTree } from './model';
import {
    OFFER_KIND_LABEL,
    draftToOfferPayload,
    offerBadge,
    offerDraftError,
    offerScope,
    offerState,
    offerToDraft,
} from './pricing';
import ProductSearch from './ProductSearch';
import { PanelTag } from '@vase/ui/panel/pieces';

// Pestaña Ofertas del Catálogo: tarjetas y barra lateral para crear o editar.
export default function Ofertas({ user, products, categories, toast, theme }) {
    const [offers, setOffers] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState(null); // id, 'new' o null
    const [draft, setDraft] = useState(offerToDraft());
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [clientQuery, setClientQuery] = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const payload = await panelFetch('/tenant/offers', { user });
                if (alive) setOffers(payload.items || []);
                const people = [];
                for (let page = 1; page <= 10; page += 1) {
                    const result = await panelFetch(`/tenant/users?page=${page}&limit=50`, { user });
                    people.push(...(result.items || []));
                    if (people.length >= Number(result.total || 0) || !(result.items || []).length) break;
                }
                if (alive) setClients(people.filter(isClient));
            } catch (error) {
                toast('No se pudieron cargar las ofertas.', 'error');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const current = active && active !== 'new' ? offers.find((offer) => offer.id === active) : null;
    const open = (id) => {
        setActive(id);
        setDraft(offerToDraft(id === 'new' ? {} : offers.find((offer) => offer.id === id)));
        setClientQuery('');
    };
    const set = (patch) => setDraft((value) => ({ ...value, ...patch }));
    const toggleIn = (key, id) => setDraft((value) => ({ ...value, [key]: value[key].includes(id) ? value[key].filter((item) => item !== id) : [...value[key], id] }));

    const tree = useMemo(() => buildCategoryTree(categories), [categories]);
    const context = { categories, products, clients };
    const error = offerDraftError(draft);

    const save = async () => {
        if (error) return;
        setSaving(true);
        try {
            const body = draftToOfferPayload(draft);
            const saved = active === 'new'
                ? await panelFetch('/tenant/offers', { method: 'POST', body, user })
                : await panelFetch(`/tenant/offers/${active}`, { method: 'PUT', body, user });
            setOffers((list) => (active === 'new' ? [saved, ...list] : list.map((offer) => (offer.id === saved.id ? saved : offer))));
            setActive(saved.id);
            toast(active === 'new' ? 'Oferta creada' : 'Oferta guardada', 'success');
        } catch (err) {
            toast(errorText(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        setSaving(true);
        try {
            await panelFetch(`/tenant/offers/${active}`, { method: 'DELETE', user });
            setOffers((list) => list.filter((offer) => offer.id !== active));
            setActive(null);
            setConfirmDelete(false);
            toast('Oferta eliminada', 'success');
        } catch (err) {
            toast(errorText(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    const q = clientQuery.trim().toLowerCase();
    const clientOptions = q.length < 2 ? [] : clients.filter((client) => !draft.user_ids.includes(client.id) && `${client.name || ''} ${client.email}`.toLowerCase().includes(q)).slice(0, 8);
    const pickedProducts = draft.product_ids.map((id) => products.find((product) => product.id === id)).filter(Boolean);

    return (
        <div className="vp-page">
            <div className="vp-body">
                <div className="vp-fbar">
                    <span className="vp-note">Si un producto tiene más de una oferta, se aplica la que le deja el precio más bajo al cliente.</span>
                    <div className="vp-sp" />
                    <button type="button" className="vp-btn ink" onClick={() => open('new')}>+ Oferta</button>
                </div>
                {loading ? <div className="vp-empty">Cargando ofertas…</div> : null}
                {!loading && !offers.length ? (
                    <div className="vp-empty">Todavía no tenés ofertas. Creá una con un porcentaje, un monto o un precio fijo.</div>
                ) : null}
                <div className="vp-ocards">
                    {offers.map((offer) => {
                        const state = offerState(offer);
                        return (
                            <button key={offer.id} type="button" className={`vp-oc ${active === offer.id ? 'on' : ''}`} onClick={() => open(offer.id)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="v">{offerBadge(offer)}</span>
                                    <PanelTag tone={state.tone}>{state.label}</PanelTag>
                                </div>
                                <b>{offer.name}</b>
                                <span>{offerScope(offer, context)}</span>
                                {offer.ends_at ? <span>Hasta el {new Date(offer.ends_at).toLocaleDateString('es-AR')}</span> : null}
                            </button>
                        );
                    })}
                </div>
            </div>

            {active ? (
                <SidePanel
                    open
                    onClose={() => setActive(null)}
                    label="Oferta"
                    kicker={active === 'new' ? 'Oferta nueva' : 'Oferta'}
                    title={draft.name || 'Oferta nueva'}
                    footer={<>
                        {current ? <button type="button" className="vp-btn red" onClick={() => setConfirmDelete(true)}>Eliminar</button> : null}
                        <div className="vp-sp" />
                        {error ? <span className="vp-note">{error}</span> : null}
                        <button type="button" className="vp-btn acc" onClick={save} disabled={saving || Boolean(error)}>{saving ? 'Guardando…' : 'Guardar'}</button>
                    </>}
                >
                    <div className="vp-fld"><label htmlFor="offer-name">Nombre (solo lo ves vos)</label>
                        <input id="offer-name" className="vp-inp" value={draft.name} onChange={(event) => set({ name: event.target.value })} placeholder="Ej.: Semana del helado" />
                    </div>
                    <div className="vp-fld"><span className="vp-fl">Tipo de descuento</span>
                        <div className="vp-seg">
                            {Object.entries(OFFER_KIND_LABEL).map(([kind, label]) => (
                                <button key={kind} type="button" className={draft.kind === kind ? 'on' : ''} onClick={() => set({ kind })}>{label}</button>
                            ))}
                        </div>
                    </div>
                    <div className="vp-fld"><label htmlFor="offer-value">{draft.kind === 'percent' ? 'Porcentaje' : draft.kind === 'amount' ? 'Monto que descuenta' : 'Precio final'}</label>
                        <input id="offer-value" className="vp-inp" inputMode="decimal" value={draft.value} onChange={(event) => set({ value: event.target.value })} placeholder={draft.kind === 'percent' ? '15' : '3.000'} />
                        {draft.kind === 'fixed' ? <span className="vp-note">Si el producto ya cuesta menos, se deja su precio.</span> : null}
                    </div>
                    <div className="vp-fld"><label htmlFor="offer-label">Cartel en la tienda</label>
                        <input id="offer-label" className="vp-inp" value={draft.label} onChange={(event) => set({ label: event.target.value })} placeholder="Oferta" />
                    </div>

                    <div className="vp-fld"><span className="vp-fl">¿A qué productos?</span>
                        <div className="vp-seg">
                            {[['all', 'Todo'], ['categories', 'Categorías'], ['products', 'Productos']].map(([id, label]) => (
                                <button key={id} type="button" className={draft.target === id ? 'on' : ''} onClick={() => set({ target: id })}>{label}</button>
                            ))}
                        </div>
                    </div>
                    {draft.target === 'categories' ? (
                        <div className="vp-fld">
                            <div className="vp-cpick">
                                {tree.map((category) => (
                                    <label key={category.id} style={{ paddingLeft: 10 + category.depth * 16 }}>
                                        <input type="checkbox" checked={draft.category_ids.includes(category.id)} onChange={() => toggleIn('category_ids', category.id)} />
                                        {category.name}
                                    </label>
                                ))}
                            </div>
                            <span className="vp-note">Incluye lo que está dentro de cada categoría elegida.</span>
                        </div>
                    ) : null}
                    {draft.target === 'products' ? (
                        <div className="vp-fld">
                            {pickedProducts.map((product) => (
                                <div key={product.id} className="vp-row">
                                    <div className="g"><b style={{ fontSize: 12.5 }}>{product.name}</b><span>{product.sku}</span></div>
                                    <button type="button" className="vp-x" aria-label={`Quitar ${product.name}`} onClick={() => toggleIn('product_ids', product.id)}>×</button>
                                </div>
                            ))}
                            <ProductSearch products={products} exclude={new Set(draft.product_ids)} onPick={(product) => toggleIn('product_ids', product.id)} placeholder="+ Sumar productos a la oferta…" />
                        </div>
                    ) : null}

                    <div className="vp-fld"><span className="vp-fl">¿Para quién?</span>
                        {(current?.price_list_ids || []).length ? (
                            <div className="vp-lock ok">Este precio especial es para los clientes de una lista de precios. Se mantiene así aunque lo edites acá.</div>
                        ) : null}
                        <div className="vp-seg">
                            {[['all', 'Todos los clientes'], ['clients', 'Clientes elegidos']].map(([id, label]) => (
                                <button key={id} type="button" className={draft.audience === id ? 'on' : ''} onClick={() => set({ audience: id })}>{label}</button>
                            ))}
                        </div>
                    </div>
                    {draft.audience === 'clients' ? (
                        <div className="vp-fld">
                            {draft.user_ids.map((id) => {
                                const client = clients.find((item) => item.id === id);
                                return (
                                    <div key={id} className="vp-row">
                                        <div className="g"><b style={{ fontSize: 12.5 }}>{client?.name || client?.email || 'Cliente'}</b><span>{client?.email}</span></div>
                                        <button type="button" className="vp-x" aria-label="Quitar cliente" onClick={() => toggleIn('user_ids', id)}>×</button>
                                    </div>
                                );
                            })}
                            <input className="vp-inp" placeholder="+ Buscá un cliente por nombre o email…" value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} aria-label="Sumar clientes a la oferta" />
                            {clientOptions.length ? (
                                <div className="vp-lmenu">
                                    {clientOptions.map((client) => <button key={client.id} type="button" className="vp-mi" onClick={() => { toggleIn('user_ids', client.id); setClientQuery(''); }}>{client.name || client.email}<em>{client.email}</em></button>)}
                                </div>
                            ) : null}
                            <span className="vp-note">Solo la ven estos clientes cuando entran con su cuenta.</span>
                        </div>
                    ) : null}

                    <div className="vp-fld"><span className="vp-fl">¿Cuándo? (opcional)</span>
                        <div className="vp-big2">
                            <input type="date" className="vp-inp" aria-label="Empieza" value={draft.starts_at} onChange={(event) => set({ starts_at: event.target.value })} />
                            <input type="date" className="vp-inp" aria-label="Termina" value={draft.ends_at} onChange={(event) => set({ ends_at: event.target.value })} />
                        </div>
                        <span className="vp-note">Sin fechas, dura hasta que la pauses.</span>
                    </div>
                    <div className="vp-row">
                        <div className="g"><b>Oferta activa</b><span>Apagala para pausarla sin borrarla</span></div>
                        <button type="button" role="switch" aria-checked={draft.enabled} aria-label="Oferta activa" className={`vp-tog ${draft.enabled ? '' : 'off'}`} onClick={() => set({ enabled: !draft.enabled })} />
                    </div>
                </SidePanel>
            ) : null}

            <Modal
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                theme={theme}
                title="¿Eliminar esta oferta?"
                description="Los precios vuelven a ser los de siempre. Si solo querés frenarla un tiempo, pausala."
                footer={<><button type="button" className="vp-btn soft" onClick={() => setConfirmDelete(false)}>Cancelar</button><button type="button" className="vp-btn red" onClick={remove} disabled={saving}>Eliminar</button></>}
            />
        </div>
    );
}
