import React, { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import { SidePanel } from '../components/Overlays';
import Icon from '../components/Icon';
import { errorText, panelFetch } from '../api';
import { formatMoney, orderStatus } from '../format';
import { CLIENT_FILTERS as FILTERS, ROLE, clientState, isClient } from '../clients';

export default function Clientes({ user, toast, onChanged }) {
    const [clients, setClients] = useState([]);
    const [priceLists, setPriceLists] = useState([]);
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pendientes');
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(null);
    const [orders, setOrders] = useState([]);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const all = [];
            for (let page = 1; page <= 20; page += 1) {
                const payload = await panelFetch(`/tenant/users?page=${page}&limit=50`, { user });
                all.push(...(payload.items || []));
                if (all.length >= Number(payload.total || 0) || !(payload.items || []).length) break;
            }
            setClients(all.filter(isClient));
            const [lists, offerList] = await Promise.all([
                panelFetch('/tenant/price-lists', { user }).catch(() => []),
                panelFetch('/tenant/offers', { user }).catch(() => []),
            ]);
            setPriceLists(lists.items || lists || []);
            setOffers(offerList.items || offerList || []);
        } catch (error) {
            toast('No se pudieron cargar los clientes.', 'error');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!active) return;
        setOrders([]);
        panelFetch(`/api/admin/orders?limit=20&offset=0&user_id=${active}`, { user })
            .then((payload) => setOrders(payload.items || payload.orders || []))
            .catch(() => setOrders([]));
    }, [active, user]);

    const counts = useMemo(() => Object.fromEntries(FILTERS.map(([id, , test]) => [id, clients.filter(test).length])), [clients]);
    useEffect(() => {
        if (!loading && filter === 'pendientes' && !counts.pendientes) setFilter('todos');
    }, [loading, counts.pendientes, filter]);

    const rows = useMemo(() => {
        const test = FILTERS.find(([id]) => id === filter)?.[2] || (() => true);
        const q = query.trim().toLowerCase();
        return clients.filter(test).filter((client) => !q || `${client.name || ''} ${client.email}`.toLowerCase().includes(q));
    }, [clients, filter, query]);

    const current = clients.find((client) => client.id === active) || null;

    const patch = async (client, body, message) => {
        setSaving(true);
        try {
            const payload = await panelFetch(`/tenant/users/${client.id}`, { method: 'PATCH', body, user });
            const updated = payload.item || payload.user || { ...client, ...body };
            setClients((list) => list.map((item) => (item.id === client.id ? { ...item, ...updated, role: updated.role || body.role || item.role, status: updated.status || body.status || item.status } : item)));
            toast(message, 'success');
            onChanged?.();
        } catch (error) {
            toast(errorText(error), 'error');
        } finally {
            setSaving(false);
        }
    };

    const setPriceList = async (client, priceListId) => {
        setSaving(true);
        try {
            await panelFetch(`/tenant/users/${client.id}/price-list`, { method: 'PUT', body: { price_list_id: priceListId || null }, user });
            const list = priceLists.find((item) => item.id === priceListId);
            setClients((all) => all.map((item) => (item.id === client.id ? { ...item, price_list_id: priceListId || null, price_list_name: list?.name || null } : item)));
            toast('Lista de precios actualizada', 'success');
        } catch (error) {
            toast(errorText(error), 'error');
        } finally {
            setSaving(false);
        }
    };

    const state = current ? clientState(current) : null;
    const clientOffers = current ? offers.filter((offer) => (offer.user_ids || []).includes(current.id)) : [];

    return (
        <div className="vp-page">
            <div className="vp-body">
                <div className="vp-fbar">
                    <label className="vp-search"><Icon name="search" size={15} /><input placeholder="Buscar por nombre o email" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar clientes" /></label>
                    {FILTERS.map(([id, label]) => (
                        <button key={id} type="button" className={`vp-fp ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>{label} <em>{counts[id] || 0}</em></button>
                    ))}
                    <div className="vp-sp" />
                    <button type="button" className="vp-btn soft sm" onClick={load} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</button>
                </div>
                <DataTable
                    rows={rows}
                    activeKey={active}
                    onRowClick={(client) => setActive(client.id)}
                    empty={loading ? 'Cargando clientes…' : query ? `No hay clientes con “${query}”.` : 'No hay clientes en este filtro.'}
                    columns={[
                        { key: 'name', label: 'Cliente', render: (client) => <span><span className="vp-nm">{client.name || client.email.split('@')[0]}</span><span className="vp-mt">{client.email}</span></span> },
                        { key: 'role', label: 'Tipo', render: (client) => ROLE[client.role] || client.role },
                        { key: 'list', label: 'Lista de precios', render: (client) => client.price_list_name || <span className="vp-note">Según su tipo</span> },
                        { key: 'state', label: 'Estado', render: (client) => { const s = clientState(client); return <span className={`vp-tag ${s.tone}`}><i />{s.label}</span>; } },
                        {
                            key: 'action',
                            label: '',
                            align: 'right',
                            render: (client) => (client.status === 'pending' ? (
                                <button type="button" className="vp-btn acc sm" disabled={saving} onClick={(event) => { event.stopPropagation(); patch(client, { status: 'active' }, client.role === 'wholesale' ? 'Ahora es mayorista' : 'Cliente aprobado'); }}>
                                    {client.role === 'wholesale' ? 'Pasar a mayorista' : 'Aprobar'}
                                </button>
                            ) : null),
                        },
                    ]}
                />
            </div>

            {current ? (
                <SidePanel
                    open
                    onClose={() => setActive(null)}
                    label="Cliente"
                    kicker={`Cliente desde ${current.created_at ? new Date(current.created_at).toLocaleDateString('es-AR') : '—'}`}
                    title={current.name || current.email}
                >
                    {state.id === 'wholesale_request' ? (
                        <div className="vp-lock">
                            Pidió ser <b>mayorista</b>. Mientras tanto ve precios minoristas.
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <button type="button" className="vp-btn acc sm" disabled={saving} onClick={() => patch(current, { status: 'active' }, 'Ahora es mayorista')}>Pasar a mayorista</button>
                                <button type="button" className="vp-btn line sm" disabled={saving} onClick={() => patch(current, { role: 'retail', status: 'active' }, 'Quedó como minorista')}>Dejar minorista</button>
                            </div>
                        </div>
                    ) : null}
                    {state.id === 'pending' ? (
                        <div className="vp-lock ok">
                            Espera tu aprobación. Cuando la apruebes ya puede comprar y ver precios.
                            <div style={{ marginTop: 10 }}><button type="button" className="vp-btn acc sm" disabled={saving} onClick={() => patch(current, { status: 'active' }, 'Cliente aprobado')}>Aprobar cliente</button></div>
                        </div>
                    ) : null}
                    <div className="vp-row"><div className="g"><b>{current.email}</b><span>{[current.phone, [current.city, current.province].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || 'Sin teléfono ni dirección'}</span></div>
                        {current.phone ? <a className="vp-btn line sm" href={`https://wa.me/${String(current.phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
                    </div>
                    <div className="vp-fld"><span className="vp-fl">Tipo de cliente</span>
                        <div className="vp-seg">
                            {Object.entries(ROLE).map(([role, label]) => (
                                <button key={role} type="button" className={current.role === role ? 'on' : ''} disabled={saving || current.role === role} onClick={() => patch(current, { role }, `Ahora es ${label.toLowerCase()}`)}>{label}</button>
                            ))}
                        </div>
                    </div>
                    <div className="vp-fld"><label htmlFor="client-list">Lista de precios</label>
                        <select id="client-list" className="vp-inp" value={current.price_list_id || ''} disabled={saving} onChange={(event) => setPriceList(current, event.target.value)}>
                            <option value="">Según su tipo (minorista o mayorista)</option>
                            {priceLists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                        </select>
                    </div>
                    <div className="vp-fld"><span className="vp-fl">Ofertas para este cliente</span>
                        {clientOffers.length ? (
                            <div className="vp-chips">{clientOffers.map((offer) => <span key={offer.id} className="vp-chip" style={{ paddingRight: 11 }}>{offer.name} · {offer.percent}%</span>)}</div>
                        ) : <span className="vp-note">No tiene ofertas propias. Se crean en Catálogo › Ofertas.</span>}
                    </div>
                    <div className="vp-fld"><span className="vp-fl">Pedidos</span>
                        {orders.length ? orders.slice(0, 6).map((order) => {
                            const meta = orderStatus(order.status);
                            return (
                                <div key={order.id} className="vp-row">
                                    <div className="g"><b>#{String(order.id).slice(0, 6).toUpperCase()}</b><span>{order.created_at ? new Date(order.created_at).toLocaleDateString('es-AR') : ''}</span></div>
                                    <span className={`vp-tag ${meta.tone}`}><i />{meta.label}</span><b>{formatMoney(order.total)}</b>
                                </div>
                            );
                        }) : <span className="vp-note">Todavía no compró.</span>}
                    </div>
                    <div className="vp-row">
                        <div className="g"><b>Puede entrar a la tienda</b><span>Apagalo para bloquear a este cliente</span></div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={current.status !== 'inactive'}
                            aria-label="Puede entrar a la tienda"
                            className={`vp-tog ${current.status === 'inactive' ? 'off' : ''}`}
                            disabled={saving}
                            onClick={() => patch(current, { status: current.status === 'inactive' ? 'active' : 'inactive' }, current.status === 'inactive' ? 'Cliente desbloqueado' : 'Cliente bloqueado')}
                        />
                    </div>
                </SidePanel>
            ) : null}
        </div>
    );
}
