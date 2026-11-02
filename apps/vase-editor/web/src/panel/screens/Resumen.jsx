import React, { useMemo } from 'react';
import Icon from '../components/Icon';
import DataTable from '../components/DataTable';
import { formatMoney, orderStatus } from '../format';

// Resumen con datos reales: productos, pedidos y aprobaciones pendientes.
export default function Resumen({ products, orders, pendingUsers, paymentApprovals, go, loading }) {
    const outOfStock = useMemo(() => products.filter((product) => Number(product.stock || 0) <= 0).length, [products]);
    const monthOrders = useMemo(() => {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return orders.filter((order) => new Date(order.created_at || 0) >= start);
    }, [orders]);

    const recent = useMemo(() => [...orders].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 8), [orders]);

    const kpis = [
        { icon: 'box', label: 'Productos publicados', value: products.length, note: `${outOfStock} sin stock`, tone: outOfStock ? 'dn' : 'up', to: 'catalogo' },
        { icon: 'bag', label: 'Pedidos del mes', value: monthOrders.length, note: 'desde el día 1', tone: 'up', to: 'pedidos' },
        { icon: 'bell', label: 'Pagos por revisar', value: paymentApprovals.length, note: paymentApprovals.length ? 'esperan tu confirmación' : 'nada pendiente', tone: paymentApprovals.length ? 'dn' : 'up', to: 'pedidos' },
        { icon: 'user', label: 'Clientes por aprobar', value: pendingUsers.length, note: pendingUsers.length ? 'esperan tu aprobación' : 'nada pendiente', tone: pendingUsers.length ? 'dn' : 'up', to: 'clientes' },
    ];

    return (
        <>
            <div className="vp-kpis">
                {kpis.map((kpi) => (
                    <button key={kpi.label} type="button" className="vp-kpi" onClick={() => go(kpi.to)}>
                        <span className="vp-kic"><Icon name={kpi.icon} /></span>
                        <span><small>{kpi.label}</small><b>{loading ? '…' : kpi.value}</b><span className={`vp-${kpi.tone}`}>{kpi.note}</span></span>
                    </button>
                ))}
            </div>
            <div className="vp-ch">
                <div><h2>Últimos pedidos</h2><small>Los más recientes que entraron por la tienda</small></div>
                <div className="vp-sp" />
                <button type="button" className="vp-btn soft sm" onClick={() => go('pedidos')}>Ver todos</button>
            </div>
            <DataTable
                rows={recent}
                empty={loading ? 'Cargando pedidos…' : 'Todavía no entraron pedidos.'}
                pageSize={8}
                columns={[
                    { key: 'number', label: 'Pedido', render: (order) => <span title={order.id}>#{order.number || String(order.id || '').slice(0, 6).toUpperCase()}</span> },
                    { key: 'date', label: 'Fecha', render: (order) => (order.created_at ? new Date(order.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '—') },
                    { key: 'customer', label: 'Cliente', render: (order) => <b>{order.customer?.full_name || order.customer?.name || order.customer?.email || 'Sin nombre'}</b> },
                    {
                        key: 'status',
                        label: 'Estado',
                        render: (order) => {
                            const status = orderStatus(order.status);
                            return <span className={`vp-tag ${status.tone}`}><i />{status.label}</span>;
                        },
                    },
                    { key: 'total', label: 'Total', align: 'right', render: (order) => <b>{formatMoney(order.total)}</b> },
                ]}
            />
        </>
    );
}
