import React from 'react';
import {
    Bell,
    CheckCircle,
    CreditCard,
    UserCheck,
    GlobeHemisphereWest
} from '@phosphor-icons/react';

const formatMoney = (value, currency = 'ARS') => {
    const amount = Number(value || 0);
    try {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
    } catch (err) {
        return `${amount.toFixed(2)} ${currency}`;
    }
};

const formatDateTime = (value) => {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleString('es-AR');
    } catch (err) {
        return value;
    }
};

const NotificationsPopover = ({ manager, onOpenCenter, onClose }) => {
    const [activeTab, setActiveTab] = React.useState('summary');

    if (!manager) return null;

    const {
        loading,
        error,
        pendingUsers,
        paymentApprovals,
        recentNotifications,
        actionKey,
        refresh,
        approveUser,
        approvePayment,
    } = manager;

    const previewItems = activeTab === 'summary'
        ? recentNotifications.slice(0, 6)
        : activeTab === 'users' ? pendingUsers : paymentApprovals;

    const TabButton = ({ id, label, count, icon: Icon }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-1.5 flex-1 py-2.5 rounded-2xl transition-all duration-300 border ${activeTab === id
                    ? 'bg-evolution-indigo/10 border-evolution-indigo/20 text-evolution-indigo shadow-glow'
                    : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300'
                }`}
        >
            <div className="relative">
                <Icon size={18} weight={activeTab === id ? 'fill' : 'bold'} />
                {count > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-zinc-900" />
                )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </button>
    );

    return (
        <div
            style={{
                backgroundColor: 'var(--admin-panel-bg)',
                borderColor: 'var(--admin-border)',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.42)',
            }}
            className="absolute right-0 top-[calc(100%+12px)] z-50 w-[420px] rounded-[32px] border p-4 animate-in fade-in zoom-in-95 duration-300"
        >
            {/* Header / Centro Rapido Branding */}
            <div className="mb-4">
                <div className="flex items-center justify-between px-2 mb-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] admin-accent-text">Centro Rapido</p>
                        <h3 className="text-lg font-bold text-white tracking-tight">Notificaciones</h3>
                    </div>
                    <button
                        type="button"
                        onClick={refresh}
                        disabled={loading}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                    >
                        <Bell size={16} weight={loading ? 'duotone' : 'bold'} className={loading ? 'animate-pulse' : ''} />
                    </button>
                </div>

                <div className="flex gap-2">
                    <TabButton id="summary" label="Resumen" icon={Bell} count={0} />
                    <TabButton id="users" label="Usuarios" icon={UserCheck} count={pendingUsers.length} />
                    <TabButton id="payments" label="Pagos" icon={CreditCard} count={paymentApprovals.length} />
                </div>
            </div>

            <div className="custom-scrollbar max-h-[420px] overflow-auto pr-1 space-y-3">
                {error ? (
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                        {error}
                    </div>
                ) : null}

                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-evolution-indigo/20 border-t-evolution-indigo animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizando...</span>
                    </div>
                ) : null}

                {!loading && !previewItems.length ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-12 text-center">
                        <div className="inline-flex p-3 rounded-full bg-white/5 mb-3 text-zinc-600">
                            <CheckCircle size={24} weight="bold" />
                        </div>
                        <p className="text-sm font-medium text-zinc-500">No hay pendientes en esta sección.</p>
                    </div>
                ) : null}

                {!loading && previewItems.length ? (
                    <div className="space-y-3 pb-2">
                        {previewItems.map((item) => {
                            const isUser = item.kind === 'user_approval';
                            const approveKey = isUser ? `user:${item.userId}` : `order:${item.orderId}:paid`;
                            const busy = actionKey === approveKey;

                            return (
                                <div
                                    key={item.id}
                                    className="group rounded-2xl border border-white/5 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition-all duration-300 active:scale-[0.98]"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`p-1.5 rounded-lg ${isUser ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'}`}>
                                                    {isUser ? <UserCheck size={14} weight="bold" /> : <CreditCard size={14} weight="bold" />}
                                                </div>
                                                <p className="text-sm font-bold text-white truncate px-1">
                                                    {isUser ? item.email : item.title}
                                                </p>
                                            </div>
                                            <p className="text-xs text-zinc-400 line-clamp-1 pl-1">{item.subtitle}</p>

                                            <div className="flex items-center gap-2 mt-2 px-1">
                                                <span className="text-[10px] tabular-nums font-medium text-zinc-500">
                                                    {formatDateTime(item.created_at)}
                                                </span>
                                                {!isUser && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                        <span className="text-[10px] font-bold text-emerald-400">
                                                            {formatMoney(item.total, item.currency)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 shrink-0">
                                            {(!isUser && item.paymentProofUrl) && (
                                                <a
                                                    href={item.paymentProofUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center justify-center h-8 w-8 rounded-xl bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
                                                    title="Ver comprobante"
                                                >
                                                    <GlobeHemisphereWest size={16} weight="bold" />
                                                </a>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => (isUser ? approveUser({ id: item.userId, role: item.role }) : approvePayment(item.order))}
                                                disabled={busy}
                                                className={`flex items-center justify-center p-2.5 rounded-xl text-emerald-400 border border-emerald-500/10 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all ${busy ? 'opacity-50 animate-pulse' : ''}`}
                                                title="Aprobar"
                                            >
                                                <CheckCircle size={18} weight="bold" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : null}
            </div>

            {/* Footer Actions */}
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-3 px-1">
                <button
                    type="button"
                    onClick={() => {
                        onOpenCenter?.();
                        onClose?.();
                    }}
                    className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-zinc-300 hover:bg-white/10 transition-all active:scale-95"
                >
                    Historial Completo
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl bg-[var(--admin-accent)] px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-[var(--admin-accent-contrast)] hover:opacity-90 shadow-lg active:scale-95"
                >
                    Listo
                </button>
            </div>
        </div>
    );
};

export default NotificationsPopover;
