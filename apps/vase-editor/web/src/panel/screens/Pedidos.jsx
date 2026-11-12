import React, { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import { Modal, SidePanel } from '../components/Overlays';
import Icon from '../components/Icon';
import { errorText, panelFetch } from '../api';
import { ORDER_STATUS_ORDER, formatMoney, orderStatus } from '../format';
import { PanelTag } from '@vase/ui/panel/pieces';

const customerName = (order) => order.customer?.full_name || order.customer?.name || order.customer?.email || 'Sin nombre';
const orderCode = (order) => `#${order.number || String(order.id || '').slice(0, 6).toUpperCase()}`;
const deliveryLabel = (order) => {
    if (order.checkout_mode === 'whatsapp') return 'Por WhatsApp';
    const method = order.customer?.delivery_method || order.customer?.shipping_method || '';
    if (/retir|pickup/i.test(method)) return 'Retiro en sucursal';
    if (method) return 'Envío';
    return order.checkout_mode === 'online' ? 'Online' : '—';
};

const STATUS_HINT = {
    draft: 'Armado pero no enviado por el cliente',
    submitted: 'Lo envió el cliente; falta revisarlo',
    pending_payment: 'Esperando que confirmes el pago',
    processing: 'Pago confirmado, en preparación',
    paid: 'Pagado',
    cancelled: 'Cancelado',
};

const EVENT_LABEL = {
    order_received: 'Pedido recibido',
    payment_approved: 'Pago aprobado',
    payment_cancelled: 'Pago cancelado',
    order_cancelled: 'Pedido cancelado',
    status_changed: 'Cambio de estado',
};

export default function Pedidos({ user, theme, toast, onChanged }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('todos');
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(null);
    const [saving, setSaving] = useState(false);
    const [cancelFor, setCancelFor] = useState(null);
    const [reason, setReason] = useState('');
    const [proof, setProof] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const all = [];
            for (let offset = 0; offset < 1000; offset += 200) {
                const payload = await panelFetch(`/api/admin/orders?limit=200&offset=${offset}`, { user });
                const items = payload.items || payload.orders || (Array.isArray(payload) ? payload : []);
                all.push(...items);
                if (items.length < 200) break;
            }
            setOrders(all.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
        } catch (error) {
            toast('No se pudieron cargar los pedidos.', 'error');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const counts = useMemo(() => {
        const map = {};
        orders.forEach((order) => { map[order.status] = (map[order.status] || 0) + 1; });
        return map;
    }, [orders]);

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return orders.filter((order) => (filter === 'todos' || order.status === filter)
            && (!q || `${orderCode(order)} ${customerName(order)} ${order.customer?.email || ''}`.toLowerCase().includes(q)));
    }, [orders, filter, query]);

    const current = orders.find((order) => order.id === active) || null;

    const changeStatus = async (order, status, { notify = false, why = '' } = {}) => {
        setSaving(true);
        try {
            await panelFetch(`/api/admin/orders/${order.id}/status`, {
                method: 'PATCH',
                body: { status, notify_customer: notify, notification_reason: why || undefined },
                user,
            });
            setOrders((list) => list.map((item) => (item.id === order.id ? { ...item, status } : item)));
            toast(notify ? `Pedido ${orderStatus(status).label.toLowerCase()} y avisado al cliente` : `Pedido: ${orderStatus(status).label}`, 'success');
            onChanged?.();
            await load();
        } catch (error) {
            toast(error.message === 'notification_reason_required' ? 'Escribí el motivo para avisarle al cliente.' : errorText(error), 'error');
        } finally {
            setSaving(false);
        }
    };

    const history = Array.isArray(current?.customer?.notification_history) ? current.customer.notification_history.filter(Boolean) : [];
    const proofUrl = current?.customer?.payment_proof_url || current?.customer?.receipt_url || '';

    return (
        <div className="vp-page">
            <div className="vp-body">
                <div className="vp-fbar">
                    <label className="vp-search"><Icon name="search" size={15} /><input placeholder="Número, cliente o email" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar pedidos" /></label>
                    <button type="button" className={`vp-fp ${filter === 'todos' ? 'on' : ''}`} onClick={() => setFilter('todos')}>Todos <em>{orders.length}</em></button>
                    {ORDER_STATUS_ORDER.filter((status) => status !== 'draft' || counts.draft).map((status) => {
                        const meta = orderStatus(status);
                        return (
                            <button key={status} type="button" className={`vp-fp ${filter === status ? 'on' : ''}`} onClick={() => setFilter(status)}>
                                <span className={`vp-tag ${meta.tone}`} style={{ background: 'none', padding: 0, height: 'auto' }}><i /></span>{meta.label} <em>{counts[status] || 0}</em>
                            </button>
                        );
                    })}
                    <div className="vp-sp" />
                    <button type="button" className="vp-btn soft sm" onClick={load} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</button>
                </div>
                <DataTable
                    rows={rows}
                    activeKey={active}
                    onRowClick={(order) => setActive(order.id)}
                    empty={loading ? 'Cargando pedidos…' : 'No hay pedidos en este filtro.'}
                    columns={[
                        { key: 'code', label: 'Pedido', render: (order) => <b>{orderCode(order)}</b> },
                        { key: 'date', label: 'Fecha', render: (order) => (order.created_at ? new Date(order.created_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—') },
                        { key: 'customer', label: 'Cliente', render: (order) => <span><span className="vp-nm">{customerName(order)}</span><span className="vp-mt">{order.customer?.email}</span></span> },
                        { key: 'delivery', label: 'Entrega', render: deliveryLabel },
                        { key: 'status', label: 'Estado', render: (order) => { const meta = orderStatus(order.status); return <PanelTag tone={meta.tone}>{meta.label}</PanelTag>; } },
                        { key: 'total', label: 'Total', align: 'right', render: (order) => <b>{formatMoney(order.total)}</b> },
                    ]}
                />
            </div>

            {current ? (
                <SidePanel
                    open
                    onClose={() => setActive(null)}
                    label="Pedido"
                    kicker={`${current.created_at ? new Date(current.created_at).toLocaleString('es-AR') : ''} · ${deliveryLabel(current)}`}
                    title={`${orderCode(current)} · ${customerName(current)}`}
                    footer={<>
                        {current.status !== 'cancelled' ? <button type="button" className="vp-btn red" onClick={() => { setCancelFor(current); setReason(''); }} disabled={saving}>Cancelar pedido</button> : null}
                        <div className="vp-sp" />
                        {current.status === 'pending_payment' || current.status === 'submitted' ? (
                            <button type="button" className="vp-btn acc" onClick={() => changeStatus(current, 'paid', { notify: true })} disabled={saving}>Confirmar pago y avisar</button>
                        ) : null}
                    </>}
                >
                    <div className={`vp-ordstate ${orderStatus(current.status).tone}`}>
                        <span className="dotb" aria-hidden="true" />
                        <div><b>{orderStatus(current.status).label}</b><span>{STATUS_HINT[current.status] || ''}</span></div>
                    </div>
                    <div className="vp-fld"><span className="vp-fl">Cambiar estado (sin avisar al cliente)</span>
                        <div className="vp-steps">
                            {ORDER_STATUS_ORDER.map((status) => {
                                const meta = orderStatus(status);
                                return (
                                    <button key={status} type="button" disabled={saving || status === current.status} className={`vp-st s-${meta.tone || 'gr'} ${status === current.status ? 'on' : ''}`} onClick={() => (status === 'cancelled' ? (setCancelFor(current), setReason('')) : changeStatus(current, status))}>
                                        <i />{meta.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <span className="vp-fl">Lo que pidió</span>
                    {(current.items || []).map((item) => (
                        <div key={`${item.product_id}-${item.sku}`} className="vp-row">
                            <div className="g"><b>{item.name}</b><span>{item.qty} × {formatMoney(item.unit_price)}{item.sku ? ` · SKU ${item.sku}` : ''}</span></div>
                            <b>{formatMoney(item.total)}</b>
                        </div>
                    ))}
                    {Number(current.shipping) > 0 ? <div className="vp-row"><div className="g"><b>Envío</b></div><b>{formatMoney(current.shipping)}</b></div> : null}
                    {Number(current.tax) > 0 ? <div className="vp-row"><div className="g"><b>Impuestos</b></div><b>{formatMoney(current.tax)}</b></div> : null}
                    <div className="vp-total">Total<span>{formatMoney(current.total)}</span></div>
                    <span className="vp-fl">Cliente</span>
                    <div className="vp-row">
                        <div className="g"><b>{customerName(current)}</b><span>{[current.customer?.email, current.customer?.phone].filter(Boolean).join(' · ')}</span></div>
                        {current.customer?.phone ? <a className="vp-btn line sm" href={`https://wa.me/${String(current.customer.phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
                    </div>
                    {current.customer?.address ? <div className="vp-row"><div className="g"><b>Dirección</b><span>{[current.customer.address, current.customer.city].filter(Boolean).join(', ')}</span></div></div> : null}
                    {proofUrl ? (
                        <>
                            <span className="vp-fl">Comprobante</span>
                            <div className="vp-row"><div className="g"><b>Comprobante de pago</b><span>Subido por el cliente</span></div><button type="button" className="vp-btn soft sm" onClick={() => setProof(proofUrl)}>Ver</button></div>
                        </>
                    ) : null}
                    <span className="vp-fl">Correos enviados</span>
                    {history.length ? (
                        <div className="vp-tl">
                            {history.slice(0, 10).map((entry, index) => (
                                <div key={entry.id || index} className="vp-tli">
                                    <i className={entry.sent === false ? 'fail' : ''} />
                                    <div><b>{EVENT_LABEL[entry.event] || entry.event || 'Aviso'}</b><span>{entry.created_at ? new Date(entry.created_at).toLocaleString('es-AR') : ''}{entry.email ? ` · a ${entry.email}` : ''}{entry.sent === false ? ' · no se pudo enviar' : ''}{entry.reason ? ` · ${entry.reason}` : ''}</span></div>
                                </div>
                            ))}
                        </div>
                    ) : <span className="vp-note">Todavía no se le mandó ningún correo por este pedido.</span>}
                </SidePanel>
            ) : null}

            <Modal
                open={Boolean(cancelFor)}
                onClose={() => setCancelFor(null)}
                theme={theme}
                title="Cancelar pedido"
                description="Si avisás al cliente, le llega un correo con el motivo."
                footer={<>
                    <button type="button" className="vp-btn soft" onClick={() => { changeStatus(cancelFor, 'cancelled'); setCancelFor(null); }} disabled={saving}>Cancelar sin avisar</button>
                    <button type="button" className="vp-btn red" onClick={() => { changeStatus(cancelFor, 'cancelled', { notify: true, why: reason }); setCancelFor(null); }} disabled={saving || !reason.trim()}>Cancelar y avisar</button>
                </>}
            >
                <div className="vp-fld"><label htmlFor="cancel-reason">Motivo</label><textarea id="cancel-reason" className="vp-inp vp-ta" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej: No pudimos validar la transferencia." /></div>
            </Modal>

            <Modal open={Boolean(proof)} onClose={() => setProof(null)} theme={theme} wide title="Comprobante de pago" footer={<a className="vp-btn line" href={proof || '#'} target="_blank" rel="noreferrer">Abrir en otra pestaña</a>}>
                {proof && /\.pdf($|\?)/i.test(proof) ? <iframe title="Comprobante" src={proof} style={{ width: '100%', height: 480, border: 0, borderRadius: 12 }} /> : <img src={proof || ''} alt="Comprobante de pago" style={{ maxWidth: '100%', borderRadius: 12 }} />}
            </Modal>
        </div>
    );
}
