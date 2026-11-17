// Mi cuenta en la tienda: últimos pedidos y su estado.
import { ExternalLink } from './profile-helpers.jsx';
import { STATUS_ICONS } from './profile-helpers.jsx';
import { STATUS_STYLES } from './profile-helpers.jsx';
import { formatCurrency } from '../../../utils/format';

export default function ProfileOrders({ currency, formatOrderDate, handleViewOrder, locale, ordersSpanClass, setActiveSection, updateOrderStatus, visibleOrders }) {
    return (
        <div className={`${ordersSpanClass} space-y-8`}>
            <div className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-[#e5e1de] dark:border-[#3d2f21] flex flex-wrap gap-3 justify-between items-center">
                    <h3 className="font-bold text-lg">Pedidos recientes</h3>
                    <button
                        type="button"
                        onClick={() => setActiveSection('orders')}
                        className="text-sm text-primary font-semibold hover:underline"
                    >
                        Ver todo
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-4 p-4 lg:hidden">
                    {visibleOrders.length ? (
                        visibleOrders.map((order) => {
                            const statusLabel = order.status || 'Pendiente';
                            return (
                                <div key={order.id} className="border border-[#e5e1de] dark:border-[#3d2f21] rounded-xl p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-sm text-[#181411] dark:text-white">#{order.id}</span>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_STYLES[statusLabel] || STATUS_STYLES.Pendiente}`}>
                                            {statusLabel}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-[#8a7560]">{formatOrderDate(order.createdAt)}</span>
                                            <span className="font-black text-primary mt-1">
                                                {order.total != null ? formatCurrency(order.total, order.currency || currency, order.locale || locale) : '-'}
                                            </span>
                                        </div>
                                        <button type="button" onClick={() => handleViewOrder(order)} className="text-xs font-bold text-[#181411] dark:text-white underline decoration-2">Ver detalle</button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center text-[#8a7560] text-sm py-4">No hay pedidos recientes.</div>
                    )}
                </div>
                <div className="hidden lg:block">
                    <table className="w-full text-left table-fixed">
                        <thead>
                            <tr className="bg-[#f5f2f0]/60 dark:bg-[#2d241c] text-xs font-bold text-[#8a7560] uppercase tracking-wider">
                                <th className="px-3 py-3 w-[20%]">Pedido</th>
                                <th className="px-3 py-3 w-[18%]">Fecha</th>
                                <th className="px-3 py-3 w-[24%]">Estado</th>
                                <th className="px-3 py-3 w-[18%]">Total</th>
                                <th className="px-3 py-3 w-[20%]">Accion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e1de] dark:divide-[#3d2e21] text-sm">
                            {visibleOrders.length ? (
                                visibleOrders.map((order) => {
                                    const statusLabel = order.status || 'Pendiente';
                                    const isPending = statusLabel === 'Pendiente' || statusLabel === 'Pendiente de pago';
                                    return (
                                        <tr key={order.id} className="hover:bg-[#f5f2f0]/40 transition-colors">
                                            <td className="px-3 py-3 font-mono font-medium truncate" title={`#${order.id}`}>#{order.id}</td>
                                            <td className="px-3 py-3 truncate">{formatOrderDate(order.createdAt)}</td>
                                            <td className="px-3 py-3">
                                                <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLES[statusLabel] || STATUS_STYLES.Pendiente} inline-flex items-center gap-1 w-fit max-w-full`}>
                                                    {(() => {
                                                        const Icon = STATUS_ICONS[statusLabel] || STATUS_ICONS.Pendiente;
                                                        return <Icon className="w-3 h-3 shrink-0" />;
                                                    })()}
                                                    <span className="truncate">{statusLabel}</span>
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 font-bold truncate">
                                                {order.total != null
                                                    ? formatCurrency(order.total, order.currency || currency, order.locale || locale)
                                                    : '-'}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col items-start gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewOrder(order)}
                                                        className="text-primary hover:text-primary/70 font-semibold underline decoration-2 inline-flex items-center gap-1 text-xs"
                                                    >
                                                        Detalles
                                                        <ExternalLink className="w-3 h-3" />
                                                    </button>
                                                    {isPending ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateOrderStatus(order.id, 'Pagado')}
                                                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-600 text-left"
                                                        >
                                                            Marcar pagado
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-[#8a7560]">
                                        Todavia no hay pedidos recientes.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
