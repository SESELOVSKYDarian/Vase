import React from 'react';
import { useToast } from '../../../context/ToastContext';
import { X, FilePdf, ImageSquare, EnvelopeSimple, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { ORDER_STATUS_OPTIONS } from '../../../hooks/admin/useUsersManager';

const ORDER_STATUS_LABELS = {
    draft: 'Borrador',
    pending_payment: 'Pendiente',
    processing: 'En proceso',
    paid: 'Pagado',
    unpaid: 'Impaga',
    submitted: 'Recibido',
    cancelled: 'Cancelado',
};

const panelFieldClass =
    'admin-input-field w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-200';

const compactFieldClass =
    'admin-input-field w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none transition-all duration-200';

const formatOrderTotal = (value, currency = 'ARS') => {
    const amount = Number(value || 0);
    try {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
    } catch (err) {
        return `$${amount.toFixed(2)}`;
    }
};

const formatCheckoutModeLabel = (mode = '') => {
    const normalized = String(mode || '').toLowerCase();
    if (normalized === 'whatsapp') return 'WhatsApp';
    if (normalized === 'transfer') return 'Transferencia';
    if (normalized === 'stripe') return 'Pago online';
    if (normalized === 'cash_on_pickup') return 'Pago en local';
    return normalized || '-';
};

const formatOrderStatusLabel = (status = '') =>
    ORDER_STATUS_LABELS[String(status || '').toLowerCase()] || status || '-';

const getOrderStatusClassName = (status = '') => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'paid') return 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700';
    if (normalized === 'processing') return 'border-amber-500/40 bg-amber-500/12 text-amber-700';
    if (normalized === 'pending_payment') return 'border-indigo-500/40 bg-indigo-500/12 text-indigo-700';
    if (normalized === 'cancelled' || normalized === 'unpaid') return 'border-rose-500/40 bg-rose-500/12 text-rose-700';
    return 'border-white/20 bg-white/10 admin-text-primary';
};

const formatPaymentDetail = (order) => {
    const customer = order?.customer || {};
    const method = String(customer.payment_method || customer.payment || '').toLowerCase();
    if (method === 'stripe') return 'Pago online';
    if (method === 'cash_on_pickup' || method === 'cash' || method === 'local') return 'Pago en local';
    if (order?.checkout_mode === 'transfer') {
        return method.includes('efectivo') ? 'Transferencia / Efectivo' : 'Transferencia';
    }
    if (order?.checkout_mode === 'whatsapp') {
        return method || 'WhatsApp';
    }
    return method || order?.checkout_mode || '-';
};

const formatCustomerName = (customer = {}) =>
    customer.full_name || customer.fullName || customer.name || customer.customer_name || '';

const formatOrderChannelLabel = (customer = {}) => {
    const normalized = String(customer.contact_channel || customer.order_channel || '').toLowerCase();
    if (normalized === 'email' || normalized === 'gmail') return 'Gmail';
    if (normalized === 'whatsapp') return 'WhatsApp';
    return '-';
};

const getPaymentProof = (customer = {}) =>
    customer.payment_proof_url ||
    customer.paymentProofUrl ||
    customer.receipt_url ||
    customer.receiptUrl ||
    customer.proof_url ||
    customer.proofUrl ||
    customer.payment_proof ||
    '';

const isImageUrl = (value = '') => /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(String(value || '').trim());
const isPdfUrl = (value = '') => /\.pdf(\?.*)?$/i.test(String(value || '').trim());

const getNotificationHistory = (customer = {}) =>
    Array.isArray(customer?.notification_history)
        ? customer.notification_history.filter((entry) => entry && typeof entry === 'object')
        : [];

const formatNotificationEventLabel = (value = '') => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'order_confirmation_customer') return 'Confirmacion inicial al cliente';
    if (normalized === 'order_confirmation_admin') return 'Aviso inicial al admin';
    if (normalized === 'payment_approved_customer') return 'Pago aprobado';
    if (normalized === 'payment_cancelled_customer') return 'Pago cancelado';
    return normalized || 'Notificacion';
};

const PaymentProofModal = ({ proofUrl, onClose }) => {
    if (!proofUrl) return null;

    return (
        <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                className="admin-panel-surface relative flex h-full max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
                style={{ borderColor: 'var(--admin-border)' }}
            >
                <div className="admin-header-surface flex items-center justify-between border-b px-5 py-4">
                    <div className="flex items-center gap-3">
                        {isPdfUrl(proofUrl) ? (
                            <FilePdf size={20} weight="bold" className="text-rose-500" />
                        ) : (
                            <ImageSquare size={20} weight="bold" className="admin-accent-text" />
                        )}
                        <div>
                            <p className="text-sm font-semibold admin-text-primary">Comprobante del pedido</p>
                            <p className="text-xs admin-text-muted">Vista previa en ventana emergente</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-widest admin-text-primary transition-all hover:opacity-90"
                            style={{ borderColor: 'var(--admin-border)' }}
                        >
                            Abrir aparte
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="admin-hover-surface flex h-9 w-9 items-center justify-center rounded-full border"
                            style={{ borderColor: 'var(--admin-border)' }}
                        >
                            <X size={18} weight="bold" className="admin-text-primary" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden p-4">
                    {isPdfUrl(proofUrl) ? (
                        <iframe
                            src={proofUrl}
                            title="Comprobante PDF"
                            className="h-full w-full rounded-2xl border bg-white"
                            style={{ borderColor: 'var(--admin-border-soft)' }}
                        />
                    ) : (
                        <div
                            className="flex h-full items-center justify-center rounded-2xl border p-4"
                            style={{ borderColor: 'var(--admin-border-soft)', backgroundColor: 'var(--admin-hover)' }}
                        >
                            <img
                                src={proofUrl}
                                alt="Comprobante"
                                className="max-h-full max-w-full rounded-2xl object-contain shadow-xl"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const UsersInspectorPanel = ({ manager }) => {
    const { addToast } = useToast();
    const [proofPreviewUrl, setProofPreviewUrl] = React.useState('');
    const [orderNotes, setOrderNotes] = React.useState({});

    if (!manager) return null;

    const {
        selectedUser,
        userOrders,
        userOrdersLoading,
        userOrdersError,
        orderUpdatingId,
        userOrdersFilter,
        setUserOrdersFilter,
        updateOrderStatus,
    } = manager;

    const visibleOrders = (Array.isArray(userOrders) ? userOrders : []).filter(
        (order) => userOrdersFilter === 'all' || order.status === userOrdersFilter
    );

    const updateOrderNote = (orderId, value) => {
        setOrderNotes((prev) => ({ ...prev, [orderId]: value }));
    };

    const handleCancelAndNotify = (order) => {
        const reason = String(orderNotes[order.id] || '').trim();
        if (!reason) {
            addToast('Escribe el motivo de cancelacion antes de notificar.', 'error');
            return;
        }
        updateOrderStatus(order.id, 'cancelled', {
            notifyCustomer: true,
            reason,
        });
    };

    if (!selectedUser) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
                <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: 'var(--admin-hover)' }}
                >
                    <EnvelopeSimple size={24} weight="bold" className="admin-text-muted" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-semibold admin-text-primary">Selecciona un usuario</p>
                    <p className="max-w-[240px] text-xs leading-relaxed admin-text-muted">
                        Desde aqui veras sus pedidos, comprobantes y acciones de aprobacion o cancelacion.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-5">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] admin-accent-text">Pedidos y comprobantes</p>
                    <h2 className="truncate text-lg font-semibold tracking-tight admin-text-primary">{selectedUser.email}</h2>
                    <p className="text-xs admin-text-muted">
                        Gestiona el estado del pedido, revisa comprobantes y notifica al cliente por email.
                    </p>
                </div>

                <div className="space-y-1">
                    <label className="admin-input-label text-[11px] font-bold uppercase tracking-[0.2em]">Filtrar pedidos</label>
                    <select
                        value={userOrdersFilter}
                        onChange={(e) => setUserOrdersFilter(e.target.value)}
                        className={panelFieldClass}
                    >
                        <option value="all">Todos</option>
                        {ORDER_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {userOrdersLoading ? <p className="text-xs admin-text-muted">Cargando compras...</p> : null}
                {userOrdersError ? <p className="text-xs text-rose-500">{userOrdersError}</p> : null}

                {!userOrdersLoading && visibleOrders.length === 0 ? (
                    <div
                        className="rounded-2xl border px-4 py-4 text-sm"
                        style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-hover)' }}
                    >
                        <p className="font-semibold admin-text-primary">No hay pedidos para este filtro.</p>
                        <p className="mt-1 text-xs admin-text-muted">Cuando el usuario compre o suba un comprobante, aparecera aqui.</p>
                    </div>
                ) : null}

                <div className="space-y-4">
                    {visibleOrders.map((order) => {
                        const isUpdating = orderUpdatingId === order.id;
                        const customer = order?.customer || {};
                        const customerName = formatCustomerName(customer);
                        const paymentDetail = formatPaymentDetail(order);
                        const checkoutLabel = formatCheckoutModeLabel(order.checkout_mode);
                        const orderChannel = formatOrderChannelLabel(customer);
                        const customerEmail = customer.email || '';
                        const proofUrl = getPaymentProof(customer);
                        const hasProof = Boolean(proofUrl);
                        const noteValue = orderNotes[order.id] || '';
                        const notificationHistory = getNotificationHistory(customer);
                        const latestNotification = notificationHistory[0] || customer?.last_notification || null;

                        return (
                            <div
                                key={order.id}
                                className="space-y-4 rounded-2xl border p-4"
                                style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-hover)' }}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[10px] uppercase tracking-widest admin-text-muted">
                                            Pedido #{String(order.id || '').slice(0, 8)}
                                        </p>
                                        <p className="text-sm font-bold admin-text-primary">
                                            {formatOrderTotal(order.total, order.currency)} | Canal: {checkoutLabel}
                                        </p>
                                        <p className="text-xs admin-text-muted">
                                            Pago: {paymentDetail}
                                            {customerName ? ` | Cliente: ${customerName}` : ''}
                                        </p>
                                        <p className="text-xs admin-text-muted">
                                            Pedido por: {orderChannel}
                                            {customerEmail ? ` | Email: ${customerEmail}` : ''}
                                        </p>
                                        <p className="text-xs admin-text-muted">
                                            {order.created_at ? new Date(order.created_at).toLocaleString('es-AR') : '-'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getOrderStatusClassName(order.status)}`}>
                                            {formatOrderStatusLabel(order.status)}
                                        </span>
                                        <span
                                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                hasProof
                                                    ? 'border-sky-500/40 bg-sky-500/12 text-sky-700'
                                                    : 'border-white/15 bg-white/10 admin-text-muted'
                                            }`}
                                        >
                                            {hasProof ? 'Comprobante cargado' : 'Sin comprobante'}
                                        </span>
                                    </div>
                                </div>

                                {Array.isArray(order.items) && order.items.length > 0 ? (
                                    <div
                                        className="rounded-xl border p-3"
                                        style={{ borderColor: 'var(--admin-border-soft)', backgroundColor: 'var(--admin-panel-bg)' }}
                                    >
                                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest admin-text-muted">Productos</p>
                                        <div className="space-y-2">
                                            {order.items.map((item, index) => (
                                                <div key={`${order.id}-${item.product_id || item.sku || index}`} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold admin-text-primary">{item.name}</p>
                                                        <p className="admin-text-muted">
                                                            SKU: {item.sku || item.product_id || '-'} | Cantidad: {item.qty}
                                                        </p>
                                                    </div>
                                                    <p className="font-bold admin-text-primary">
                                                        {formatOrderTotal(item.total, order.currency)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                <div
                                    className="rounded-xl border p-3"
                                    style={{ borderColor: 'var(--admin-border-soft)', backgroundColor: 'var(--admin-panel-bg)' }}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest admin-text-muted">Comprobante</p>
                                            <p className="text-xs admin-text-muted">
                                                {hasProof ? 'Abre la vista previa en modal o en una pestana nueva.' : 'Este pedido todavia no tiene comprobante cargado.'}
                                            </p>
                                        </div>
                                        {hasProof ? (
                                            <button
                                                type="button"
                                                onClick={() => setProofPreviewUrl(proofUrl)}
                                                className="rounded-lg border border-sky-500/40 bg-sky-500/12 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-sky-700 transition-all hover:bg-sky-500/18"
                                            >
                                                Ver comprobante
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                <div
                                    className="rounded-xl border p-3"
                                    style={{ borderColor: 'var(--admin-border-soft)', backgroundColor: 'var(--admin-panel-bg)' }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest admin-text-muted">Ultimo email</p>
                                            {latestNotification ? (
                                                <>
                                                    <p className="mt-1 text-sm font-semibold admin-text-primary">
                                                        {formatNotificationEventLabel(latestNotification.event)}
                                                    </p>
                                                    <p className="text-xs admin-text-muted">
                                                        {latestNotification.email || 'Sin destinatario'} | {latestNotification.created_at ? new Date(latestNotification.created_at).toLocaleString('es-AR') : '-'}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="mt-1 text-xs admin-text-muted">Todavia no hay notificaciones registradas para este pedido.</p>
                                            )}
                                        </div>
                                        {latestNotification ? (
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                    latestNotification.sent
                                                        ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700'
                                                        : 'border-rose-500/40 bg-rose-500/12 text-rose-700'
                                                }`}
                                            >
                                                {latestNotification.sent ? (
                                                    <CheckCircle size={12} weight="bold" />
                                                ) : (
                                                    <WarningCircle size={12} weight="bold" />
                                                )}
                                                {latestNotification.sent ? 'Enviado' : 'Fallo'}
                                            </span>
                                        ) : null}
                                    </div>

                                    {latestNotification?.reason ? (
                                        <p className="mt-2 text-xs admin-text-muted">
                                            Motivo informado: {latestNotification.reason}
                                        </p>
                                    ) : null}

                                    {notificationHistory.length > 0 ? (
                                        <div className="mt-3 space-y-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest admin-text-muted">Historial</p>
                                            {notificationHistory.slice(0, 5).map((entry) => (
                                                <div
                                                    key={entry.id || `${order.id}-${entry.created_at}-${entry.event}`}
                                                    className="rounded-lg border px-3 py-2"
                                                    style={{ borderColor: 'var(--admin-border-soft)', backgroundColor: 'var(--admin-hover)' }}
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <p className="text-xs font-semibold admin-text-primary">
                                                            {formatNotificationEventLabel(entry.event)}
                                                        </p>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${entry.sent ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                            {entry.sent ? 'Enviado' : 'Fallo'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] admin-text-muted">
                                                        {entry.email || 'Sin destinatario'} | {entry.created_at ? new Date(entry.created_at).toLocaleString('es-AR') : '-'}
                                                    </p>
                                                    {entry.reason ? (
                                                        <p className="mt-1 text-[11px] admin-text-muted">Motivo: {entry.reason}</p>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: 'var(--admin-border-soft)' }}>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => updateOrderStatus(order.id, 'processing')}
                                            disabled={isUpdating || order.status === 'processing'}
                                            className="rounded-lg border border-amber-500/40 bg-amber-500/12 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 transition-all hover:bg-amber-500/18 disabled:opacity-60"
                                        >
                                            Marcar en proceso
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateOrderStatus(order.id, 'paid', { notifyCustomer: true })}
                                            disabled={isUpdating || order.status === 'paid'}
                                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/12 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700 transition-all hover:bg-emerald-500/18 disabled:opacity-60"
                                        >
                                            Aprobar y notificar
                                        </button>
                                    </div>

                                    <label className="space-y-1">
                                        <span className="admin-input-label text-[11px] font-bold uppercase tracking-[0.2em]">
                                            Motivo para cancelacion
                                        </span>
                                        <textarea
                                            rows={3}
                                            value={noteValue}
                                            onChange={(e) => updateOrderNote(order.id, e.target.value)}
                                            placeholder="Ej: No pudimos validar el comprobante o el pago fue rechazado por la entidad."
                                            className={`${panelFieldClass} min-h-[88px] resize-y`}
                                        />
                                    </label>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCancelAndNotify.bind(null, order)}
                                            disabled={isUpdating}
                                            className="rounded-lg border border-rose-500/40 bg-rose-500/12 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-rose-700 transition-all hover:bg-rose-500/18 disabled:opacity-60"
                                        >
                                            Cancelar y notificar
                                        </button>
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                            disabled={isUpdating}
                                            className={`${compactFieldClass} min-w-[190px] max-w-[260px] disabled:opacity-50`}
                                        >
                                            {ORDER_STATUS_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <p className="text-[11px] admin-text-muted">
                                        Aprobar y notificar envia un email de pago aprobado. Cancelar y notificar envia un email formal con el motivo que escribas arriba.
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <PaymentProofModal proofUrl={proofPreviewUrl} onClose={() => setProofPreviewUrl('')} />
        </>
    );
};

export default UsersInspectorPanel;


