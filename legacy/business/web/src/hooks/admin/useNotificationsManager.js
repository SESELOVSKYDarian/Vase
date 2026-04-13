import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiBase, getTenantHeaders } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const USERS_PAGE_LIMIT = 50;
const MAX_USER_SCAN = 250;
const ORDERS_LIMIT = 200;

const getAuthHeaders = () => {
    const token = localStorage.getItem('teflon_token');
    return {
        ...getTenantHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const getCustomerName = (customer = {}) =>
    customer.full_name || customer.fullName || customer.name || customer.customer_name || '';

const getPaymentProofUrl = (customer = {}) =>
    customer.payment_proof_url ||
    customer.paymentProofUrl ||
    customer.receipt_url ||
    customer.receiptUrl ||
    customer.proof_url ||
    customer.proofUrl ||
    customer.payment_proof ||
    '';

const sortByDateDesc = (left, right) =>
    new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime();

const mapUserNotification = (user) => ({
    id: `user-${user.id}`,
    kind: 'user_approval',
    userId: user.id,
    email: user.email || '',
    role: user.role || 'retail',
    status: user.status || 'pending',
    created_at: user.created_at || null,
    title: user.email || 'Usuario pendiente',
    subtitle: `Rol ${user.role || 'retail'} pendiente de aprobacion`,
});

const mapPaymentNotification = (order) => {
    const customer = order?.customer || {};
    const paymentProofUrl = getPaymentProofUrl(customer);
    return {
        id: `order-${order.id}`,
        kind: 'payment_review',
        orderId: order.id,
        userId: order.user_id || null,
        status: order.status || 'pending_payment',
        created_at: order.created_at || null,
        customer,
        customerName: getCustomerName(customer),
        customerEmail: customer.email || '',
        total: Number(order.total || 0),
        currency: order.currency || 'ARS',
        hasProof: Boolean(paymentProofUrl),
        paymentProofUrl,
        title: getCustomerName(customer) || customer.email || `Pedido ${String(order.id || '').slice(0, 8)}`,
        subtitle: paymentProofUrl
            ? 'Pago pendiente con comprobante cargado'
            : 'Pago pendiente de validacion',
        order,
    };
};

const formatErrorPayload = async (res) => {
    try {
        const payload = await res.json();
        return payload?.error || payload?.message || '';
    } catch (err) {
        return await res.text().catch(() => '');
    }
};

const updateOrderCollection = (items, nextOrder) =>
    (Array.isArray(items) ? items : []).map((entry) =>
        entry.id === nextOrder.id ? { ...entry, ...nextOrder } : entry
    );

const updateUserCollection = (items, nextUser) =>
    (Array.isArray(items) ? items : []).map((entry) =>
        entry.id === nextUser.id ? { ...entry, ...nextUser } : entry
    );

export default function useNotificationsManager() {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [actionKey, setActionKey] = useState('');
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

    const loadUsers = useCallback(async () => {
        let page = 1;
        let total = Infinity;
        let scanned = 0;
        let collected = [];

        while (scanned < total && scanned < MAX_USER_SCAN) {
            const url = new URL(`${getApiBase()}/tenant/users`);
            url.searchParams.set('page', String(page));
            url.searchParams.set('limit', String(USERS_PAGE_LIMIT));

            const res = await fetch(url.toString(), { headers: getAuthHeaders() });
            if (!res.ok) {
                const message = await formatErrorPayload(res);
                throw new Error(message || 'users_load_failed');
            }

            const data = await res.json();
            const items = Array.isArray(data.items) ? data.items : [];
            total = Number(data.total || items.length || 0);
            collected = collected.concat(items);
            scanned += items.length;

            if (!items.length || items.length < USERS_PAGE_LIMIT) {
                break;
            }
            page += 1;
        }

        return collected;
    }, []);

    const loadOrders = useCallback(async () => {
        const url = new URL(`${getApiBase()}/api/admin/orders`);
        url.searchParams.set('limit', String(ORDERS_LIMIT));
        url.searchParams.set('offset', '0');

        const res = await fetch(url.toString(), { headers: getAuthHeaders() });
        if (!res.ok) {
            const message = await formatErrorPayload(res);
            throw new Error(message || 'orders_load_failed');
        }

        const data = await res.json();
        return Array.isArray(data.items) ? data.items : [];
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [usersResult, ordersResult] = await Promise.all([loadUsers(), loadOrders()]);
            setAllUsers(usersResult);
            setOrders(ordersResult);
            setLastUpdatedAt(new Date().toISOString());
        } catch (err) {
            console.error('Failed to load notifications data', err);
            setError('No se pudieron cargar las notificaciones.');
        } finally {
            setLoading(false);
        }
    }, [loadOrders, loadUsers]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const approveUser = useCallback(
        async (user) => {
            if (!user?.id) return null;
            const nextRole = user.role || 'retail';
            const key = `user:${user.id}`;
            setActionKey(key);
            try {
                const res = await fetch(`${getApiBase()}/tenant/users/${user.id}`, {
                    method: 'PATCH',
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        role: nextRole,
                        status: 'active',
                    }),
                });
                if (!res.ok) {
                    const message = await formatErrorPayload(res);
                    throw new Error(message || 'user_approval_failed');
                }
                const data = await res.json();
                const nextUser = data?.user || { ...user, role: nextRole, status: 'active' };
                setAllUsers((prev) => updateUserCollection(prev, nextUser));
                addToast('Usuario aprobado', 'success');
                return nextUser;
            } catch (err) {
                console.error('Failed to approve user', err);
                addToast('No se pudo aprobar el usuario', 'error');
                return null;
            } finally {
                setActionKey('');
            }
        },
        [addToast]
    );

    const updateOrderStatus = useCallback(
        async (order, nextStatus, options = {}) => {
            if (!order?.id || !nextStatus) return null;
            const key = `order:${order.id}:${nextStatus}`;
            setActionKey(key);
            try {
                const res = await fetch(`${getApiBase()}/api/admin/orders/${order.id}/status`, {
                    method: 'PATCH',
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        status: nextStatus,
                        notify_customer: Boolean(options.notifyCustomer),
                        notification_reason: options.reason || '',
                    }),
                });
                if (!res.ok) {
                    const message = await formatErrorPayload(res);
                    throw new Error(message || 'order_update_failed');
                }
                const data = await res.json();
                const nextOrder = data?.order || { ...order, status: nextStatus };
                setOrders((prev) => updateOrderCollection(prev, nextOrder));
                addToast(
                    nextStatus === 'paid'
                        ? 'Pago aprobado'
                        : nextStatus === 'processing'
                            ? 'Pedido marcado en proceso'
                            : 'Pedido actualizado',
                    'success'
                );
                return nextOrder;
            } catch (err) {
                console.error('Failed to update order status from notifications', err);
                addToast('No se pudo actualizar el pedido', 'error');
                return null;
            } finally {
                setActionKey('');
            }
        },
        [addToast]
    );

    const pendingUsers = useMemo(
        () =>
            (Array.isArray(allUsers) ? allUsers : [])
                .filter((user) => normalizeText(user.status) === 'pending')
                .sort(sortByDateDesc)
                .map(mapUserNotification),
        [allUsers]
    );

    const paymentApprovals = useMemo(
        () =>
            (Array.isArray(orders) ? orders : [])
                .filter((order) => normalizeText(order.status) === 'pending_payment')
                .sort((left, right) => {
                    const proofDiff = Number(Boolean(getPaymentProofUrl(right?.customer))) - Number(Boolean(getPaymentProofUrl(left?.customer)));
                    if (proofDiff !== 0) return proofDiff;
                    return sortByDateDesc(left, right);
                })
                .map(mapPaymentNotification),
        [orders]
    );

    const recentNotifications = useMemo(
        () => [...pendingUsers, ...paymentApprovals].sort(sortByDateDesc),
        [paymentApprovals, pendingUsers]
    );

    const badgeCount = pendingUsers.length + paymentApprovals.length;

    return {
        loading,
        error,
        allUsers,
        orders,
        pendingUsers,
        paymentApprovals,
        recentNotifications,
        badgeCount,
        lastUpdatedAt,
        actionKey,
        refresh,
        approveUser,
        approvePayment: (order) => updateOrderStatus(order, 'paid', { notifyCustomer: true }),
        markOrderProcessing: (order) => updateOrderStatus(order, 'processing'),
    };
}
