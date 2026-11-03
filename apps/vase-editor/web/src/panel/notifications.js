// Avisos del panel: textos y orden, sin React para poder probarlos.

export function timeAgo(value, now = new Date()) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
    if (minutes < 1) return 'recién';
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.round(hours / 24);
    if (days === 1) return 'ayer';
    if (days < 30) return `hace ${days} días`;
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export const NOTIFICATION_TABS = [
    ['todos', 'Todos'],
    ['pagos', 'Pagos'],
    ['registros', 'Registros'],
];

// Junta los pagos por revisar y los registros por aprobar, lo más nuevo arriba.
export function notificationRows({ paymentApprovals = [], pendingUsers = [] } = {}, tab = 'todos') {
    const payments = tab === 'registros' ? [] : paymentApprovals.map((item) => ({ ...item, type: 'pago' }));
    const users = tab === 'pagos' ? [] : pendingUsers.map((item) => ({ ...item, type: 'registro' }));
    return [...payments, ...users].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}
