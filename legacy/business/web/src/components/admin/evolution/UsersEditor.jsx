import React from 'react';
import useEvolutionStore from '../../../store/useEvolutionStore';
import {
    ORDER_STATUS_OPTIONS,
    USER_ROLE_OPTIONS,
    USER_STATUS_OPTIONS,
} from '../../../hooks/admin/useUsersManager';

const fieldClass =
    "w-full rounded-xl border border-white/25 bg-zinc-900/70 px-3 py-2.5 text-sm text-white placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30";

const compactFieldClass =
    "w-full rounded-lg border border-white/25 bg-zinc-900/70 px-2.5 py-1.5 text-sm text-white outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30";

const ORDER_STATUS_LABELS = {
    draft: 'Borrador',
    pending_payment: 'Pendiente',
    processing: 'En proceso',
    paid: 'Pagado',
    unpaid: 'Impaga',
    submitted: 'Recibido',
    cancelled: 'Cancelado',
};

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
    if (normalized === 'paid') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200';
    if (normalized === 'processing') return 'border-amber-500/40 bg-amber-500/15 text-amber-200';
    if (normalized === 'pending_payment') return 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200';
    if (normalized === 'cancelled') return 'border-rose-500/40 bg-rose-500/15 text-rose-200';
    if (normalized === 'unpaid') return 'border-rose-500/40 bg-rose-500/15 text-rose-200';
    return 'border-white/20 bg-white/10 text-zinc-200';
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
        return method || 'WhatsApp (efectivo o transferencia)';
    }
    if (order?.checkout_mode === 'stripe') {
        return 'Pago online';
    }
    if (order?.checkout_mode === 'cash_on_pickup') {
        return 'Pago en local';
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

const getUserPersonalizedOffers = (offers = [], userId = '') =>
    (Array.isArray(offers) ? offers : []).filter((offer) =>
        Array.isArray(offer?.user_ids) && offer.user_ids.includes(userId)
    );

const UsersEditor = ({ manager, offersManager }) => {
    if (!manager) return null;
    const { setInspectorOpen } = useEvolutionStore();

    const {
        usersLoading,
        usersError,
        usersPage,
        usersTotalPages,
        canPrevUsers,
        canNextUsers,
        filteredUsers,
        priceLists,
        priceListsError,
        userSavingId,
        userDeletingId,
        search,
        setSearch,
        loadUsers,
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
        updateOrderStatus,
        currentUserId,
    } = manager;

    const [offerScopeFilter, setOfferScopeFilter] = React.useState('all');
    const users = Array.isArray(filteredUsers) ? filteredUsers : [];
    const offers = Array.isArray(offersManager?.offers) ? offersManager.offers : [];
    const offersLoading = Boolean(offersManager?.offersLoading);
    const offersError = offersManager?.offersError || '';
    const offerAssignmentSavingId = offersManager?.offerAssignmentSavingId || null;
    const toggleOfferUserAssignment = offersManager?.toggleOfferUserAssignment;
    const selectedUserOffers = selectedUser ? getUserPersonalizedOffers(offers, selectedUser.id) : [];
    const sortedSelectedUserOffers = selectedUser
        ? [...offers].sort((left, right) => {
            const leftAssigned = Array.isArray(left?.user_ids) && left.user_ids.includes(selectedUser.id);
            const rightAssigned = Array.isArray(right?.user_ids) && right.user_ids.includes(selectedUser.id);
            if (leftAssigned === rightAssigned) return String(left?.name || '').localeCompare(String(right?.name || ''));
            return leftAssigned ? -1 : 1;
        })
        : [];
    const visibleUsers = React.useMemo(() => {
        if (offerScopeFilter === 'all') return users;
        return users.filter((item) => {
            const personalizedOffers = getUserPersonalizedOffers(offers, item.id);
            if (offerScopeFilter === 'with_offers') return personalizedOffers.length > 0;
            if (offerScopeFilter === 'without_offers') return personalizedOffers.length === 0;
            return true;
        });
    }, [offerScopeFilter, offers, users]);

    return (
        <div className="space-y-5 pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Gestion de usuarios</h2>
                    <p className="text-sm text-zinc-400">Edita rol, estado y lista de precios en los campos de cada usuario.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por email o rol"
                        className={fieldClass}
                    />
                    <select
                        value={offerScopeFilter}
                        onChange={(e) => setOfferScopeFilter(e.target.value)}
                        className={fieldClass}
                    >
                        <option value="all" className="bg-zinc-900">Todos los usuarios</option>
                        <option value="with_offers" className="bg-zinc-900">Con ofertas personalizadas</option>
                        <option value="without_offers" className="bg-zinc-900">Sin ofertas personalizadas</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => loadUsers()}
                        className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
                    >
                        Recargar
                    </button>
                </div>
            </div>

            {usersLoading ? <p className="text-sm text-zinc-400">Cargando usuarios...</p> : null}
            {usersError ? <p className="text-sm text-rose-400">{usersError}</p> : null}
            {priceListsError ? <p className="text-sm text-rose-400">{priceListsError}</p> : null}
            {offersError ? <p className="text-sm text-rose-400">{offersError}</p> : null}

            {!usersLoading && !usersError && visibleUsers.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-400">
                    {offerScopeFilter === 'all'
                        ? 'No hay usuarios registrados para este tenant.'
                        : 'No hay usuarios que coincidan con el filtro de ofertas.'}
                </p>
            ) : null}

            {!usersLoading && visibleUsers.length > 0 ? (
                <div className="space-y-3">
                    {visibleUsers.map((item) => {
                        const draft = getUserDraft(item) || {
                            role: item.role || 'retail',
                            status: item.status || 'active',
                            price_list_id: item.price_list_id || 'auto',
                        };
                        const isDirty = hasUserDraftChanges(item);
                        const isSaving = userSavingId === item.id;
                        const isDeleting = userDeletingId === item.id;
                        const isSelected = selectedUser?.id === item.id;
                        const isCurrentUser = currentUserId === item.id;
                        const needsWholesaleApproval =
                            (item.role || '') === 'wholesale' && (item.status || '') === 'pending';

                        return (
                            <div
                                key={item.id}
                                className={`rounded-2xl border p-4 transition-all ${
                                    isSelected
                                        ? 'border-evolution-indigo/50 bg-evolution-indigo/10'
                                        : 'border-white/10 bg-white/5'
                                }`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedUser(item);
                                            setInspectorOpen(true);
                                        }}
                                        className="min-w-0 text-left"
                                    >
                                        <p className="truncate text-sm font-bold text-white">{item.email}</p>
                                        <p className="text-xs text-zinc-400">
                                            Rol: {item.role || 'retail'} · Estado: {item.status || 'active'}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            Lista: {item.price_list_name || 'Precio segun rol'}
                                        </p>
                                    </button>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                            setSelectedUser(item);
                                            setInspectorOpen(true);
                                        }}
                                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                isSelected
                                                    ? 'border-evolution-indigo/50 bg-evolution-indigo/20 text-white'
                                                    : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
                                            }`}
                                        >
                                            Abrir inspector
                                        </button>
                                        {needsWholesaleApproval ? (
                                            <button
                                                type="button"
                                                onClick={() => approveWholesaleUser(item)}
                                                disabled={isSaving}
                                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-60"
                                            >
                                                {isSaving ? '...' : 'Aprobar'}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Rol</span>
                                        <select
                                            value={draft.role || 'retail'}
                                            onChange={(e) => setUserDraftField(item.id, 'role', e.target.value)}
                                            className={compactFieldClass}
                                        >
                                            {USER_ROLE_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value} className="bg-zinc-900">
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Estado</span>
                                        <select
                                            value={draft.status || 'active'}
                                            onChange={(e) => setUserDraftField(item.id, 'status', e.target.value)}
                                            className={compactFieldClass}
                                        >
                                            {USER_STATUS_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value} className="bg-zinc-900">
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Lista de precios</span>
                                        <select
                                            value={draft.price_list_id || 'auto'}
                                            onChange={(e) => setUserDraftField(item.id, 'price_list_id', e.target.value)}
                                            className={compactFieldClass}
                                        >
                                            <option value="auto" className="bg-zinc-900">Precio segun rol</option>
                                            {priceLists.map((priceList) => (
                                                <option key={priceList.id} value={priceList.id} className="bg-zinc-900">
                                                    {priceList.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    <p className="truncate text-xs text-zinc-400">
                                        Lista actual: {item.price_list_name || 'Precio segun rol'} · Ofertas personalizadas: {getUserPersonalizedOffers(offers, item.id).length}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => saveUserSetup(item)}
                                            disabled={!isDirty || isSaving || isDeleting}
                                            className="rounded-lg bg-evolution-indigo px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-40"
                                        >
                                            {isSaving ? 'Guardando...' : 'Guardar'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeUser(item)}
                                            disabled={isSaving || isDeleting || isCurrentUser}
                                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                                                isSaving || isDeleting || isCurrentUser
                                                    ? 'border-white/10 text-zinc-500'
                                                    : 'border-rose-500/40 text-rose-300 hover:bg-rose-500/10'
                                            }`}
                                        >
                                            {isCurrentUser ? 'Tu cuenta' : (isDeleting ? 'Eliminando...' : 'Eliminar')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-1">
                <button
                    type="button"
                    disabled={!canPrevUsers || usersLoading}
                    onClick={() => setUsersPage((prev) => Math.max(prev - 1, 1))}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
                >
                    Anterior
                </button>
                <p className="text-xs text-zinc-400">
                    Pagina {usersPage} de {usersTotalPages}
                </p>
                <button
                    type="button"
                    disabled={!canNextUsers || usersLoading}
                    onClick={() => setUsersPage((prev) => Math.min(prev + 1, usersTotalPages))}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
                >
                    Siguiente
                </button>
            </div>

            {selectedUser ? (
                <div className="rounded-2xl border border-evolution-indigo/30 bg-evolution-indigo/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest admin-accent-text">Inspector activo</p>
                    <p className="mt-1 text-sm font-semibold admin-text-primary">
                        Pedidos, comprobantes y acciones del usuario seleccionado ahora se gestionan desde el inspector lateral.
                    </p>
                    <p className="mt-2 text-xs admin-text-muted">
                        Usuario actual: {selectedUser.email}
                    </p>
                </div>
            ) : null}

            {selectedUser ? (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ofertas personalizadas</p>
                            <p className="truncate text-sm font-bold text-white">{selectedUser.email}</p>
                        </div>
                        <p className="text-xs text-zinc-400">
                            {selectedUserOffers.length} vinculada{selectedUserOffers.length === 1 ? '' : 's'}
                        </p>
                    </div>

                    {offersLoading ? <p className="text-xs text-zinc-400">Cargando ofertas...</p> : null}
                    {!offersLoading && offers.length === 0 ? (
                        <p className="text-xs text-zinc-400">Todavia no hay ofertas creadas en el modulo Ofertas.</p>
                    ) : null}

                    {!offersLoading && offers.length > 0 ? (
                        <div className="space-y-2">
                            {sortedSelectedUserOffers.map((offerItem) => {
                                const userIds = Array.isArray(offerItem.user_ids) ? offerItem.user_ids : [];
                                const isAssigned = userIds.includes(selectedUser.id);
                                const isGlobal = userIds.length === 0;
                                const isSavingOffer = offerAssignmentSavingId === offerItem.id;

                                return (
                                    <div key={offerItem.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-white">{offerItem.name}</p>
                                            <p className="text-xs text-zinc-400">
                                                {offerItem.percent}% · {offerItem.enabled ? 'Activa' : 'Inactiva'} · {isGlobal ? 'Global' : `Personalizada (${userIds.length} usuarios)`}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {isGlobal
                                                    ? 'Si la vinculas desde aca, dejara de ser global y pasara a ser personalizada.'
                                                    : 'Se sincroniza con el modulo Ofertas.'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleOfferUserAssignment?.(offerItem, selectedUser)}
                                            disabled={isSavingOffer}
                                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                isAssigned
                                                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                                                    : 'border-evolution-indigo/40 bg-evolution-indigo/10 text-indigo-100 hover:bg-evolution-indigo/20'
                                            } disabled:opacity-60`}
                                        >
                                            {isSavingOffer ? '...' : isAssigned ? 'Quitar' : 'Vincular'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};

export default UsersEditor;




