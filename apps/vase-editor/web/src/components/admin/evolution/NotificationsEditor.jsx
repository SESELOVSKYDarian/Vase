import React from 'react';
import {
    Bell,
    CheckCircle,
    CreditCard,
    GlobeHemisphereWest,
    UserCheck,
} from '@phosphor-icons/react';
import useEvolutionStore from '../../../store/useEvolutionStore';

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

const StatCard = ({ icon: Icon, label, value, tone = 'default' }) => (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-start justify-between gap-3">
            <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
            </div>
            <div
                className={`rounded-2xl p-3 ${
                    tone === 'success'
                        ? 'bg-emerald-500/12 text-emerald-300'
                        : tone === 'warning'
                            ? 'bg-amber-500/12 text-amber-300'
                            : 'bg-white/10 text-zinc-200'
                }`}
            >
                <Icon size={22} weight="bold" />
            </div>
        </div>
    </div>
);

const NotificationsEditor = ({ manager }) => {
    const { setActiveModule } = useEvolutionStore();

    if (!manager) return null;

    const {
        loading,
        error,
        pendingUsers,
        paymentApprovals,
        badgeCount,
        actionKey,
        refresh,
        approveUser,
        approvePayment,
        markOrderProcessing,
        lastUpdatedAt,
    } = manager;

    return (
        <div className="space-y-6 pb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight text-white">Notificaciones</h2>
                    <p className="text-sm text-zinc-400">
                        Centraliza aprobaciones de usuarios y validaciones de pago pendientes.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400">
                        Ultima actualizacion: {formatDateTime(lastUpdatedAt)}
                    </div>
                    <button
                        type="button"
                        onClick={refresh}
                        disabled={loading}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/10 disabled:opacity-60"
                    >
                        {loading ? 'Actualizando...' : 'Recargar'}
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard icon={Bell} label="Pendientes totales" value={badgeCount} tone={badgeCount ? 'warning' : 'success'} />
                <StatCard icon={UserCheck} label="Usuarios por aprobar" value={pendingUsers.length} tone={pendingUsers.length ? 'warning' : 'success'} />
                <StatCard icon={CreditCard} label="Pagos por revisar" value={paymentApprovals.length} tone={paymentApprovals.length ? 'warning' : 'success'} />
            </div>

            {error ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {error}
                </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Usuarios pendientes</p>
                            <p className="mt-1 text-sm text-zinc-400">Personas que todavia necesitan aprobacion para operar.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveModule('users')}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-200 transition hover:bg-white/10"
                        >
                            Ir a usuarios
                        </button>
                    </div>

                    {pendingUsers.length ? (
                        <div className="space-y-3">
                            {pendingUsers.map((item) => {
                                const busy = actionKey === `user:${item.userId}`;
                                return (
                                    <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-white">{item.title}</p>
                                                <p className="mt-1 text-xs text-zinc-400">{item.subtitle}</p>
                                                <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                                    Alta: {formatDateTime(item.created_at)}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => approveUser({ id: item.userId, role: item.role })}
                                                disabled={busy}
                                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/12 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300 transition hover:bg-emerald-500/18 disabled:opacity-60"
                                            >
                                                <CheckCircle size={14} weight="bold" />
                                                {busy ? 'Aprobando...' : 'Aprobar'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-sm text-zinc-500">
                            No hay usuarios pendientes de aprobacion.
                        </div>
                    )}
                </section>

                <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Pagos para revisar</p>
                            <p className="mt-1 text-sm text-zinc-400">Pedidos en estado pendiente de pago con acceso rapido a aprobacion.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveModule('users')}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-200 transition hover:bg-white/10"
                        >
                            Ir a pedidos
                        </button>
                    </div>

                    {paymentApprovals.length ? (
                        <div className="space-y-3">
                            {paymentApprovals.map((item) => {
                                const approveKey = `order:${item.orderId}:paid`;
                                const processingKey = `order:${item.orderId}:processing`;
                                const customerEmail = item.customerEmail || 'Sin email';
                                return (
                                    <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-semibold text-white">{item.title}</p>
                                                    {item.hasProof ? (
                                                        <span className="rounded-full border border-sky-500/20 bg-sky-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300">
                                                            Con comprobante
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                                                            Sin comprobante
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-zinc-400">{item.subtitle}</p>
                                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                                                    <span>{customerEmail}</span>
                                                    <span>{formatMoney(item.total, item.currency)}</span>
                                                    <span>{formatDateTime(item.created_at)}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {item.paymentProofUrl ? (
                                                    <a
                                                        href={item.paymentProofUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/12 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-300 transition hover:bg-sky-500/18"
                                                    >
                                                        <GlobeHemisphereWest size={14} weight="bold" />
                                                        Ver comprobante
                                                    </a>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={() => markOrderProcessing(item.order)}
                                                    disabled={actionKey === processingKey}
                                                    className="rounded-xl border border-amber-500/20 bg-amber-500/12 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300 transition hover:bg-amber-500/18 disabled:opacity-60"
                                                >
                                                    {actionKey === processingKey ? 'Guardando...' : 'En proceso'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => approvePayment(item.order)}
                                                    disabled={actionKey === approveKey}
                                                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/12 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300 transition hover:bg-emerald-500/18 disabled:opacity-60"
                                                >
                                                    {actionKey === approveKey ? 'Aprobando...' : 'Aprobar pago'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-sm text-zinc-500">
                            No hay pagos pendientes de aprobacion.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default NotificationsEditor;
