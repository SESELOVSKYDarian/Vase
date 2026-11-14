// Pedidos del cliente: ver los suyos y subir el comprobante.
import { pool } from '../../db.js';
import { ordersRouter } from './router.js';
import { proofUpload } from './proof-upload.js';

ordersRouter.get('/mine', async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    const ordersRes = await pool.query(
      [
        'select id, user_id, status, checkout_mode, currency, subtotal, tax, shipping, total, customer, created_at',
        'from orders',
        'where tenant_id = $1 and user_id = $2',
        'order by created_at desc',
        'limit $3 offset $4',
      ].join(' '),
      [req.tenant.id, req.user.id, limit, offset]
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

ordersRouter.post('/:id/proof', proofUpload.single('proof'), async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return res.status(400).json({ error: 'invalid_order_id' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'proof_required' });
    }

    const result = await pool.query(
      'select id, user_id, customer, total, currency, checkout_mode from orders where tenant_id = $1 and id = $2',
      [req.tenant.id, orderId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'order_not_found' });
    }

    const order = result.rows[0];
    if (req.user?.id && order.user_id && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const proofUrl = `${protocol}://${host}/uploads/payments/${req.file.filename}`;

    await pool.query(
      [
        'update orders',
        'set customer = jsonb_set(coalesce(customer, \'{}\'::jsonb), \'{payment_proof_url}\', to_jsonb($3::text), true)',
        'where tenant_id = $1 and id = $2',
      ].join(' '),
      [req.tenant.id, orderId, proofUrl]
    );

    const paymentMeta = { proof_url: proofUrl };
    const paymentRes = await pool.query(
      'select id, provider, status from payments where tenant_id = $1 and order_id = $2 order by created_at desc limit 1',
      [req.tenant.id, orderId]
    );

    if (paymentRes.rowCount) {
      const payment = paymentRes.rows[0];
      const nextProvider = payment.provider || 'manual';
      const nextStatus = payment.provider === 'bank_transfer' ? 'proof_submitted' : payment.status;
      await pool.query(
        [
          'update payments',
          'set provider = $1,',
          'status = $2,',
          'amount = $3,',
          'currency = $4,',
          'metadata = metadata || $5::jsonb',
          'where id = $6',
        ].join(' '),
        [
          nextProvider,
          nextStatus,
          Number(order.total || 0),
          order.currency || 'ARS',
          paymentMeta,
          payment.id,
        ]
      );
    } else {
      await pool.query(
        [
          'insert into payments (tenant_id, order_id, provider, status, amount, currency, metadata)',
          'values ($1, $2, $3, $4, $5, $6, $7::jsonb)',
        ].join(' '),
        [
          req.tenant.id,
          orderId,
          'manual',
          'proof_submitted',
          Number(order.total || 0),
          order.currency || 'ARS',
          paymentMeta,
        ]
      );
    }

    return res.json({ ok: true, proof_url: proofUrl });
  } catch (err) {
    return next(err);
  }
});
