import React, { useState } from 'react';
import Icon from './Icon';
import { Modal } from './Overlays';
import { formatMoney } from '../format';
import { NOTIFICATION_TABS, notificationRows, timeAgo } from '../notifications';

// Avisos: panel al costado con los pagos para revisar y las personas que esperan aprobación.
export default function Notifications({ open, onClose, theme, notifications, go }) {
    const [tab, setTab] = useState('todos');
    const counts = {
        todos: notifications.badgeCount || 0,
        pagos: notifications.paymentApprovals?.length || 0,
        registros: notifications.pendingUsers?.length || 0,
    };
    const rows = notificationRows(notifications, tab);
    const busy = (key) => notifications.actionKey === key;
    const open_ = (section) => { onClose(); go(section); };

    return (
        <Modal
            open={open}
            onClose={onClose}
            side
            theme={theme}
            title="Avisos"
            description={counts.todos ? `Tenés ${counts.todos} ${counts.todos === 1 ? 'cosa' : 'cosas'} para revisar.` : 'Estás al día.'}
            footer={(
                <>
                    <span className="vp-note" style={{ marginRight: 'auto' }}>{notifications.lastUpdatedAt ? `Actualizado ${timeAgo(notifications.lastUpdatedAt)}` : ''}</span>
                    <button type="button" className="vp-btn line sm" onClick={() => notifications.refresh?.()} disabled={notifications.loading}>
                        {notifications.loading ? 'Buscando…' : 'Actualizar'}
                    </button>
                </>
            )}
        >
            <div className="vp-ntabs" role="tablist">
                {NOTIFICATION_TABS.map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} className={`vp-fp ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
                        {label} <em>{counts[id]}</em>
                    </button>
                ))}
            </div>
            {!rows.length ? (
                <div className="vp-nempty">
                    <span className="ic"><Icon name="bell" size={22} /></span>
                    <b>No hay avisos</b>
                    <span className="vp-note">Cuando entre un pago para revisar o alguien se registre, te avisamos acá.</span>
                </div>
            ) : (
                <ul className="vp-nlist">
                    {rows.map((row) => (row.type === 'pago' ? (
                        <li key={row.id} className="vp-nitem">
                            <span className="vp-nic pay"><Icon name="bag" size={16} /></span>
                            <div className="vp-nbody">
                                <div className="vp-ntop"><b>{row.title}</b><time>{timeAgo(row.created_at)}</time></div>
                                <span className="vp-note">{row.hasProof ? 'Subió el comprobante de pago' : 'Pago por confirmar'} · {formatMoney(row.total)}</span>
                                <div className="vp-nact">
                                    <button type="button" className="vp-btn acc sm" disabled={busy(`order:${row.orderId}:paid`)} onClick={() => notifications.approvePayment(row.order)}>
                                        {busy(`order:${row.orderId}:paid`) ? 'Confirmando…' : 'Confirmar pago'}
                                    </button>
                                    {row.paymentProofUrl ? <a className="vp-btn soft sm" href={row.paymentProofUrl} target="_blank" rel="noreferrer">Ver comprobante</a> : null}
                                    <button type="button" className="vp-btn line sm" onClick={() => open_('pedidos')}>Ver pedidos</button>
                                </div>
                            </div>
                        </li>
                    ) : (
                        <li key={row.id} className="vp-nitem">
                            <span className="vp-nic user"><Icon name="user" size={16} /></span>
                            <div className="vp-nbody">
                                <div className="vp-ntop"><b>{row.email || 'Nuevo registro'}</b><time>{timeAgo(row.created_at)}</time></div>
                                <span className="vp-note">Se registró y espera que lo apruebes{row.role === 'wholesale' ? ' como mayorista' : ''}.</span>
                                <div className="vp-nact">
                                    <button type="button" className="vp-btn acc sm" disabled={busy(`user:${row.userId}`)} onClick={() => notifications.approveUser({ id: row.userId, role: row.role })}>
                                        {busy(`user:${row.userId}`) ? 'Aprobando…' : 'Aprobar'}
                                    </button>
                                    <button type="button" className="vp-btn line sm" onClick={() => open_('clientes')}>Ver clientes</button>
                                </div>
                            </div>
                        </li>
                    )))}
                </ul>
            )}
        </Modal>
    );
}
