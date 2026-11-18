// Pedidos en el panel: listar y cambiar el estado.
import { pool } from '../../db.js';
import { adminOrdersRouter } from './router.js';
import { changeOrderStatus } from './order-status.js';

adminOrdersRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const userId = req.query.user_id || null;

    const params = [req.tenant.id];
    let where = 'tenant_id = $1';

    if (userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return res.status(400).json({ error: 'invalid_user_id' });
      }
      params.push(userId);
      where += ` and user_id = $${params.length}`;
    }

    const ordersRes = await pool.query(
      [
        'select id, user_id, status, checkout_mode, currency, subtotal, tax, shipping, total, customer, created_at',
        'from orders',
        `where ${where}`,
        'order by created_at desc',
        `limit $${params.length + 1} offset $${params.length + 2}`,
      ].join(' '),
      [...params, limit, offset]
    );

    const orderIds = ordersRes.rows.map((row) => row.id);
    let itemsByOrder = {};

    if (orderIds.length) {
      const itemsRes = await pool.query(
        [
          'select order_id, product_id, sku, name, qty, unit_price, total',
          'from order_items',
          'where order_id = ANY($1::uuid[])',
          'order by name asc',
        ].join(' '),
        [orderIds]
      );

      itemsByOrder = itemsRes.rows.reduce((acc, item) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push(item);
        return acc;
      }, {});
    }

    const items = ordersRes.rows.map((order) => ({
      ...order,
      items: itemsByOrder[order.id] || [],
    }));

    return res.json({ items, limit, offset });
  } catch (err) {
    return next(err);
  }
});

adminOrdersRouter.patch('/:id/status', async (req, res, next) => {
  try {
    const result = await changeOrderStatus({ tenant: req.tenant, orderId: req.params.id, body: req.body });
    return res.status(result.status).json(result.body);
  } catch (err) {
    return next(err);
  }
});
