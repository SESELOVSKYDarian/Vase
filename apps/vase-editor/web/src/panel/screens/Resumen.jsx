import React, { useMemo } from 'react';
import Icon from '../components/Icon';
import DataTable from '../components/DataTable';
import { formatMoney, orderStatus } from '../format';
import { periodTotals, salesByDay, topProducts } from '../stats';
import { PanelCard, PanelTag } from '@vase/ui/panel/pieces';

// Resumen con datos reales: productos, pedidos y aprobaciones pendientes.
export default function Resumen({ products, orders, pendingUsers, paymentApprovals, go, loading }) {
    const outOfStock = useMemo(() => products.filter((product) => Number(product.stock || 0) <= 0).length, [products]);
    const monthOrders = useMemo(() => {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return orders.filter((order) => new Date(order.created_at || 0) >= start);
    }, [orders]);

    const days = useMemo(() => salesByDay(orders, 30), [orders]);
    const period = periodTotals(days);
    const best = useMemo(() => topProducts(orders, 5), [orders]);
    const maxDay = Math.max(1, ...days.map((day) => day.total));

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
            <div className="vp-rsgrid">
                <div className="vp-card vp-sec">
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                        <h3>Ventas de los últimos 30 días</h3>
                        <span className="vp-note">{formatMoney(period.total)} en {period.count} pedidos (sin cancelados)</span>
                    </div>
                    <div className="vp-bars" role="img" aria-label={`Ventas por día: total ${formatMoney(period.total)}`}>
                        {days.map((day) => (
                            <span key={day.key} title={`${day.date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}: ${formatMoney(day.total)} · ${day.count} pedidos`}>
                                <i style={{ height: `${Math.max(day.total ? 6 : 2, (day.total / maxDay) * 100)}%` }} className={day.total ? '' : 'z'} />
                            </span>
                        ))}
                    </div>
                    <div className="vp-barsx"><span>{days[0]?.date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span><span>Hoy</span></div>
                </div>
                <PanelCard stack className="vp-card vp-sec" title="Lo más vendido">
                    {best.length ? best.map((item, index) => (
                        <div key={item.key} className="vp-row">
                            <span className="vp-stepn" style={{ width: 24, height: 24, fontSize: 11 }}>{index + 1}</span>
                            <div className="g"><b style={{ fontSize: 12.5 }}>{item.name}</b><span>{item.qty} unidades · {formatMoney(item.total)}</span></div>
                        </div>
                    )) : <span className="vp-note">{loading ? 'Cargando…' : 'Cuando entren pedidos vas a ver acá lo que más se vende.'}</span>}
                </PanelCard>
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
                            return <PanelTag tone={status.tone}>{status.label}</PanelTag>;
                        },
                    },
                    { key: 'total', label: 'Total', align: 'right', render: (order) => <b>{formatMoney(order.total)}</b> },
                ]}
            />
        </>
    );
}
