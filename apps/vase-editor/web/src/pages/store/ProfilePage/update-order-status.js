// Parte de ProfilePage: updateOrderStatus.
/** Arma updateOrderStatus con lo que necesita del componente. */
export function makeUpdateOrderStatus({ setOrders, user }) {
    return (orderId, nextStatus) => {
        if (!orderId) return;
        const historyKey = `teflon_orders_${user?.id || user?.email || "guest"}`;
        setOrders((prev) => {
            const next = prev.map((order) =>
                order.id === orderId ? { ...order, status: nextStatus } : order
            );
            try {
                localStorage.setItem(historyKey, JSON.stringify(next));
            } catch (err) {
                console.warn('No se pudo actualizar el pedido', err);
            }
            try {
                const raw = localStorage.getItem("teflon_last_order");
                if (raw) {
                    const last = JSON.parse(raw);
                    if (last?.id === orderId) {
                        localStorage.setItem("teflon_last_order", JSON.stringify({ ...last, status: nextStatus }));
                    }
                }
            } catch (err) {
                console.warn('No se pudo actualizar el pedido reciente', err);
            }
            return next;
        });
    };
}
