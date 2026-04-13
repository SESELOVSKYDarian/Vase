import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiBase, getTenantHeaders } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const USERS_LIMIT = 10;

export const USER_ROLE_OPTIONS = [
    { value: 'retail', label: 'Minorista' },
    { value: 'wholesale', label: 'Mayorista' },
    { value: 'tenant_admin', label: 'Admin' },
];

export const USER_STATUS_OPTIONS = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' },
];

export const ORDER_STATUS_OPTIONS = [
    { value: 'draft', label: 'Borrador' },
    { value: 'pending_payment', label: 'Pendiente' },
    { value: 'processing', label: 'En proceso' },
    { value: 'paid', label: 'Pagado' },
    { value: 'unpaid', label: 'Impaga' },
    { value: 'submitted', label: 'Recibido' },
    { value: 'cancelled', label: 'Cancelado' },
];

const getAuthHeaders = () => {
    const token = localStorage.getItem('teflon_token');
    return {
        ...getTenantHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const useUsersManager = () => {
    const { user } = useAuth();
    const { addToast } = useToast();

    const [usersList, setUsersList] = useState([]);
    const [usersPage, setUsersPage] = useState(1);
    const [usersTotal, setUsersTotal] = useState(0);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState('');

    const [priceLists, setPriceLists] = useState([]);
    const [priceListsLoading, setPriceListsLoading] = useState(false);
    const [priceListsError, setPriceListsError] = useState('');

    const [userDrafts, setUserDrafts] = useState({});
    const [userSavingId, setUserSavingId] = useState(null);
    const [userDeletingId, setUserDeletingId] = useState(null);
    const [search, setSearch] = useState('');

    const [selectedUser, setSelectedUser] = useState(null);
    const [userOrders, setUserOrders] = useState([]);
    const [userOrdersLoading, setUserOrdersLoading] = useState(false);
    const [userOrdersError, setUserOrdersError] = useState('');
    const [orderUpdatingId, setOrderUpdatingId] = useState(null);
    const [userOrdersFilter, setUserOrdersFilter] = useState('all');

    const usersTotalPages = Math.max(1, Math.ceil(usersTotal / USERS_LIMIT));
    const canPrevUsers = usersPage > 1;
    const canNextUsers = usersPage < usersTotalPages;

    const loadUsers = useCallback(async (pageOverride) => {
        setUsersLoading(true);
        setUsersError('');
        try {
            const pageToLoad = pageOverride ?? usersPage;
            const url = new URL(`${getApiBase()}/tenant/users`);
            url.searchParams.set('page', String(pageToLoad));
            url.searchParams.set('limit', String(USERS_LIMIT));
            const res = await fetch(url.toString(), { headers: getAuthHeaders() });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'No se pudo cargar usuarios');
            }
            const data = await res.json();
            setUsersList(Array.isArray(data.items) ? data.items : []);
            setUsersTotal(Number(data.total || 0));
            setUsersPage(pageToLoad);
        } catch (err) {
            console.error('Failed to load users', err);
            setUsersError('No se pudieron cargar los usuarios.');
            setUsersList([]);
            setUsersTotal(0);
        } finally {
            setUsersLoading(false);
        }
    }, [usersPage]);

    const loadPriceLists = useCallback(async () => {
        setPriceListsLoading(true);
        setPriceListsError('');
        try {
            const res = await fetch(`${getApiBase()}/tenant/price-lists`, {
                headers: getAuthHeaders(),
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'No se pudo cargar listas de precios');
            }
            const data = await res.json();
            setPriceLists(Array.isArray(data.items) ? data.items : []);
        } catch (err) {
            console.error('Failed to load price lists', err);
            setPriceLists([]);
            setPriceListsError('No se pudieron cargar las listas de precios.');
        } finally {
            setPriceListsLoading(false);
        }
    }, []);

    const patchUserMembership = useCallback(async (userId, payload) => {
        const res = await fetch(`${getApiBase()}/tenant/users/${userId}`, {
            method: 'PATCH',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const msg = await res.text();
            throw new Error(msg || 'No se pudo actualizar el usuario');
        }
        const data = await res.json();
        return data?.user || null;
    }, []);

    const assignUserPriceList = useCallback(async (userId, priceListId) => {
        const res = await fetch(`${getApiBase()}/tenant/users/${userId}/price-list`, {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                price_list_id: !priceListId || priceListId === 'auto' ? null : priceListId,
            }),
        });
        if (!res.ok) {
            const msg = await res.text();
            throw new Error(msg || 'No se pudo asignar la lista de precios');
        }
        const data = await res.json();
        return data?.price_list || null;
    }, []);

    const deleteUserMembership = useCallback(async (userId) => {
        const res = await fetch(`${getApiBase()}/tenant/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => null);
            const fallback = await res.text().catch(() => '');
            throw new Error(body?.error || fallback || 'No se pudo eliminar el usuario');
        }
        return res.json();
    }, []);

    const loadUserOrders = useCallback(async (userId) => {
        if (!userId) return;
        setUserOrdersLoading(true);
        setUserOrdersError('');
        try {
            const url = new URL(`${getApiBase()}/api/admin/orders`);
            url.searchParams.set('user_id', userId);
            const res = await fetch(url.toString(), { headers: getAuthHeaders() });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'No se pudo cargar pedidos');
            }
            const data = await res.json();
            setUserOrders(Array.isArray(data.items) ? data.items : []);
        } catch (err) {
            console.error('Failed to load user orders', err);
            setUserOrdersError('No se pudieron cargar las compras del usuario.');
            setUserOrders([]);
        } finally {
            setUserOrdersLoading(false);
        }
    }, []);

    const updateOrderStatus = useCallback(async (orderId, nextStatus, options = {}) => {
        if (!orderId || !nextStatus) return;
        setOrderUpdatingId(orderId);
        try {
            const res = await fetch(`${getApiBase()}/api/admin/orders/${orderId}/status`, {
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
                const msg = await res.text();
                throw new Error(msg || 'No se pudo actualizar el estado');
            }
            const data = await res.json();
            if (data?.order?.status) {
                setUserOrders((prev) =>
                    prev.map((order) =>
                        order.id === orderId ? { ...order, ...data.order } : order
                    )
                );
                addToast('Estado actualizado', 'success');
                if (data?.email_delivery) {
                    if (data.email_delivery.sent) {
                        addToast('Email enviado al cliente', 'success');
                    } else if (Boolean(options.notifyCustomer)) {
                        addToast('No se pudo enviar el email al cliente', 'error');
                    }
                }
            }
        } catch (err) {
            console.error('Failed to update order status', err);
            addToast('No se pudo actualizar el estado', 'error');
        } finally {
            setOrderUpdatingId(null);
        }
    }, [addToast]);

    const getUserDraft = useCallback((item) => {
        if (!item?.id) return null;
        return userDrafts[item.id] || {
            role: item.role || 'retail',
            status: item.status || 'active',
            price_list_id: item.price_list_id || 'auto',
        };
    }, [userDrafts]);

    const setUserDraftField = useCallback((userId, field, value) => {
        setUserDrafts((prev) => ({
            ...prev,
            [userId]: {
                ...(prev[userId] || {}),
                [field]: value,
            },
        }));
    }, []);

    const hasUserDraftChanges = useCallback((item) => {
        const draft = getUserDraft(item);
        if (!draft || !item) return false;
        const roleChanged = (draft.role || 'retail') !== (item.role || 'retail');
        const statusChanged = (draft.status || 'active') !== (item.status || 'active');
        const currentPriceList = item.price_list_id || 'auto';
        const draftPriceList = draft.price_list_id || 'auto';
        const priceListChanged = draftPriceList !== currentPriceList;
        return roleChanged || statusChanged || priceListChanged;
    }, [getUserDraft]);

    const saveUserSetup = useCallback(async (item) => {
        if (!item?.id) return;
        const draft = getUserDraft(item);
        if (!draft) return;
        const role = draft.role || 'retail';
        const status = draft.status || 'active';
        const selectedPriceList = draft.price_list_id || 'auto';
        const hasRoleOrStatusChanges =
            role !== (item.role || 'retail') ||
            status !== (item.status || 'active');
        const hasPriceListChanges =
            selectedPriceList !== (item.price_list_id || 'auto');
        if (!hasRoleOrStatusChanges && !hasPriceListChanges) return;

        setUserSavingId(item.id);
        try {
            let nextUser = item;
            if (hasRoleOrStatusChanges) {
                const patched = await patchUserMembership(item.id, { role, status });
                nextUser = patched ? { ...nextUser, ...patched } : { ...nextUser, role, status };
            }
            if (hasPriceListChanges) {
                const assigned = await assignUserPriceList(item.id, selectedPriceList);
                nextUser = {
                    ...nextUser,
                    price_list_id: assigned?.id || null,
                    price_list_name: assigned?.name || null,
                    price_list_type: assigned?.type || null,
                };
            }
            setUsersList((prev) =>
                prev.map((current) => (current.id === item.id ? nextUser : current))
            );
            setSelectedUser((prev) => (prev?.id === item.id ? nextUser : prev));
            setUserDrafts((prev) => ({
                ...prev,
                [item.id]: {
                    role: nextUser.role || role,
                    status: nextUser.status || status,
                    price_list_id: nextUser.price_list_id || 'auto',
                },
            }));
            addToast('Usuario actualizado', 'success');
        } catch (err) {
            console.error('Failed to update user setup', err);
            addToast('No se pudo guardar la configuracion del usuario', 'error');
        } finally {
            setUserSavingId(null);
        }
    }, [addToast, assignUserPriceList, getUserDraft, patchUserMembership]);

    const approveWholesaleUser = useCallback(async (item) => {
        if (!item?.id) return;
        setUserSavingId(item.id);
        try {
            const patched = await patchUserMembership(item.id, {
                role: 'wholesale',
                status: 'active',
            });
            const nextUser = patched
                ? { ...item, ...patched }
                : { ...item, role: 'wholesale', status: 'active' };

            setUsersList((prev) =>
                prev.map((current) => (current.id === item.id ? nextUser : current))
            );
            setSelectedUser((prev) => (prev?.id === item.id ? nextUser : prev));
            setUserDrafts((prev) => ({
                ...prev,
                [item.id]: {
                    role: nextUser.role || 'wholesale',
                    status: nextUser.status || 'active',
                    price_list_id: nextUser.price_list_id || 'auto',
                },
            }));
            addToast('Mayorista aprobado', 'success');
        } catch (err) {
            console.error('Failed to approve wholesale user', err);
            addToast('No se pudo aprobar el mayorista', 'error');
        } finally {
            setUserSavingId(null);
        }
    }, [addToast, patchUserMembership]);

    const removeUser = useCallback(async (item) => {
        if (!item?.id) return;
        if (user?.id === item.id) {
            addToast('No puedes eliminar tu propio usuario.', 'error');
            return;
        }
        const confirmed = window.confirm(`Se eliminara el usuario ${item.email}. Esta accion no se puede deshacer.`);
        if (!confirmed) return;

        setUserDeletingId(item.id);
        try {
            await deleteUserMembership(item.id);
            const nextList = usersList.filter((current) => current.id !== item.id);
            setUsersList(nextList);
            setUsersTotal((prev) => Math.max(0, prev - 1));
            setUserDrafts((prev) => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
            if (selectedUser?.id === item.id) {
                setSelectedUser(null);
                setUserOrders([]);
                setUserOrdersError('');
            }
            addToast('Usuario eliminado', 'success');

            if (nextList.length === 0 && usersPage > 1) {
                const prevPage = Math.max(usersPage - 1, 1);
                await loadUsers(prevPage);
            } else {
                await loadUsers(usersPage);
            }
        } catch (err) {
            console.error('Failed to remove user', err);
            const code = String(err?.message || '');
            if (code.includes('cannot_delete_current_user')) {
                addToast('No puedes eliminar tu propio usuario.', 'error');
            } else if (code.includes('cannot_delete_master_admin')) {
                addToast('No puedes eliminar un usuario master admin.', 'error');
            } else {
                addToast('No se pudo eliminar el usuario', 'error');
            }
        } finally {
            setUserDeletingId(null);
        }
    }, [addToast, deleteUserMembership, loadUsers, selectedUser?.id, user?.id, usersList, usersPage]);

    const filteredUsers = useMemo(() => {
        const query = String(search || '').trim().toLowerCase();
        if (!query) return usersList;
        return usersList.filter((item) => {
            const email = String(item.email || '').toLowerCase();
            const name = String(item.name || '').toLowerCase();
            const role = String(item.role || '').toLowerCase();
            return email.includes(query) || name.includes(query) || role.includes(query);
        });
    }, [search, usersList]);

    useEffect(() => {
        if (!usersList.length) {
            setUserDrafts({});
            setSelectedUser(null);
            return;
        }
        setUserDrafts((prev) => {
            const next = {};
            usersList.forEach((item) => {
                const current = prev[item.id];
                next[item.id] = {
                    role: current?.role || item.role || 'retail',
                    status: current?.status || item.status || 'active',
                    price_list_id: current?.price_list_id || item.price_list_id || 'auto',
                };
            });
            return next;
        });
        setSelectedUser((prev) => {
            if (!prev?.id) return prev;
            const updated = usersList.find((item) => item.id === prev.id);
            return updated || prev;
        });
    }, [usersList]);

    const selectedUserId = selectedUser?.id || null;

    useEffect(() => {
        if (!selectedUserId) {
            setUserOrders([]);
            setUserOrdersError('');
            return;
        }
        loadUserOrders(selectedUserId);
        setUserOrdersFilter('all');
    }, [loadUserOrders, selectedUserId]);

    return {
        usersList,
        usersPage,
        usersTotal,
        usersLoading,
        usersError,
        usersTotalPages,
        canPrevUsers,
        canNextUsers,
        priceLists,
        priceListsLoading,
        priceListsError,
        userSavingId,
        userDeletingId,
        search,
        setSearch,
        filteredUsers,
        loadUsers,
        loadPriceLists,
        setUsersPage,
        getUserDraft,
        setUserDraftField,
        hasUserDraftChanges,
        saveUserSetup,
        removeUser,
        approveWholesaleUser,
        selectedUser,
        setSelectedUser,
        userOrders,
        userOrdersLoading,
        userOrdersError,
        orderUpdatingId,
        userOrdersFilter,
        setUserOrdersFilter,
        loadUserOrders,
        updateOrderStatus,
        currentUserId: user?.id || null,
    };
};

