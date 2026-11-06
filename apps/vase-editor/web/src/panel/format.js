// Formatos y nombres que se repiten en todo el panel.

export const formatMoney = (value) => {
    const number = Number(value || 0);
    return `$${Math.round(number).toLocaleString('es-AR')}`;
};

// Estados reales de los pedidos, con su color.
const ORDER_STATUS = {
    draft: { label: 'Borrador', tone: '' },
    submitted: { label: 'Enviado', tone: 'b' },
    pending_payment: { label: 'Pendiente de pago', tone: 'y' },
    processing: { label: 'En proceso', tone: 'p' },
    paid: { label: 'Pagado', tone: 'g' },
    cancelled: { label: 'Cancelado', tone: 'r' },
};

export const ORDER_STATUS_ORDER = ['draft', 'submitted', 'pending_payment', 'processing', 'paid', 'cancelled'];

export const orderStatus = (status) => ORDER_STATUS[status] || { label: status ? String(status) : 'Sin estado', tone: '' };
