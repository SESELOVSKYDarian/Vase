// Números del Resumen a partir de los pedidos que ya trae el panel.

// Estos estados no son ventas.
const NOT_SALE = new Set(['draft', 'cancelled']);
export const isSale = (order) => !NOT_SALE.has(String(order?.status || ''));

const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Ventas por día de los últimos `days` días (incluye hoy).
export function salesByDay(orders = [], days = 30, now = new Date()) {
    const out = [];
    const index = new Map();
    for (let i = days - 1; i >= 0; i -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const row = { key: dayKey(date), date, total: 0, count: 0 };
        index.set(row.key, row);
        out.push(row);
    }
    for (const order of orders) {
        if (!isSale(order) || !order.created_at) continue;
        const row = index.get(dayKey(new Date(order.created_at)));
        if (!row) continue;
        row.total += Number(order.total || 0);
        row.count += 1;
    }
    return out;
}

// Productos más vendidos (por unidades) en los pedidos que no están cancelados.
export function topProducts(orders = [], limit = 5) {
    const byProduct = new Map();
    for (const order of orders) {
        if (!isSale(order)) continue;
        for (const item of order.items || []) {
            const key = item.product_id || item.sku || item.name;
            if (!key) continue;
            const row = byProduct.get(key) || { key, name: item.name || 'Producto', qty: 0, total: 0 };
            const qty = Number(item.qty || item.quantity || 0);
            row.qty += qty;
            row.total += qty * Number(item.unit_price || item.price || 0);
            byProduct.set(key, row);
        }
    }
    return [...byProduct.values()].sort((a, b) => b.qty - a.qty || b.total - a.total).slice(0, limit);
}

export function periodTotals(rows = []) {
    return rows.reduce((acc, row) => ({ total: acc.total + row.total, count: acc.count + row.count }), { total: 0, count: 0 });
}
