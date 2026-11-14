// Pedidos en el panel: listar y cambiar el estado.
import { pool } from '../../db.js';
import { getEmailCompanyName } from '../../services/mailer.js';
import { adminOrdersRouter } from './router.js';
import { ALLOWED_STATUSES, parseBooleanInput } from './checkout-options.js';
import { appendOrderNotificationEntries, buildOrderNotificationEntry } from './order-templates.js';
import { syncLatestPaymentStatus } from './payment-status.js';
import { sendCustomerOrderStatusEmail } from './email-status.js';

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
  const client = await pool.connect();
  try {
    const orderId = req.params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return res.status(400).json({ error: 'invalid_order_id' });
    }

    const rawStatus = String(req.body?.status || '').trim().toLowerCase();
    if (!ALLOWED_STATUSES.has(rawStatus)) {
      return res.status(400).json({ error: 'invalid_status' });
    }
    const notifyCustomer = parseBooleanInput(req.body?.notify_customer ?? req.body?.notifyCustomer, false);
    const notificationReason = String(req.body?.notification_reason || req.body?.reason || '').trim();
    if (notifyCustomer && rawStatus === 'cancelled' && !notificationReason) {
      return res.status(400).json({ error: 'notification_reason_required' });
    }

    const currentOrderRes = await client.query(
      [
        'select id, status, checkout_mode, currency, subtotal, tax, shipping, total, customer, created_at',
        'from orders',
        'where tenant_id = $1 and id = $2',
      ].join(' '),
      [req.tenant.id, orderId]
    );

    if (!currentOrderRes.rowCount) {
      return res.status(404).json({ error: 'order_not_found' });
    }

    const oldStatus = currentOrderRes.rows[0].status;

    await client.query('BEGIN');

    // Handle stock returns or re-reservations
    if (rawStatus === 'cancelled' && oldStatus !== 'cancelled') {
      // Returning stock to inventory
      const itemsRes = await client.query(
        'select product_id, qty from order_items where order_id = $1',
        [orderId]
      );
      for (const item of itemsRes.rows) {
        await client.query(
          [
            'update product_cache',
            'set stock = case when stock is null then null else stock + $1 end, updated_at = now()',
            'where tenant_id = $2 and id = $3',
          ].join(' '),
          [item.qty, req.tenant.id, item.product_id]
        );
      }
    } else if (rawStatus !== 'cancelled' && oldStatus === 'cancelled') {
      // Re-reserving stock
      const itemsRes = await client.query(
        'select product_id, qty from order_items where order_id = $1',
        [orderId]
      );
      for (const item of itemsRes.rows) {
        const stockRes = await client.query(
          [
            'update product_cache',
            'set stock = case when stock is null then null else stock - $1 end, updated_at = now()',
            'where tenant_id = $2 and id = $3 and (stock is null or stock >= $1)',
            'returning stock',
          ].join(' '),
          [item.qty, req.tenant.id, item.product_id]
        );
        if (!stockRes.rowCount) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `insufficient_stock:${item.product_id}` });
        }
      }
    }

    const result = await client.query(
      [
        'update orders',
        'set status = $1',
        'where tenant_id = $2 and id = $3',
        'returning id, status, checkout_mode, currency, subtotal, tax, shipping, total, customer, created_at',
      ].join(' '),
      [rawStatus, req.tenant.id, orderId]
    );

    const updatedOrder = result.rows[0];
    await syncLatestPaymentStatus(client, {
      tenantId: req.tenant.id,
      orderId,
      orderStatus: rawStatus,
      checkoutMode: updatedOrder.checkout_mode,
      total: updatedOrder.total,
      currency: updatedOrder.currency,
      notificationReason,
    });

    await client.query('COMMIT');

    let emailDelivery = { sent: false, provider: notifyCustomer ? 'not_applicable' : 'not_requested' };
    if (notifyCustomer && ['paid', 'cancelled'].includes(rawStatus)) {
      const [settingsRes, itemsRes] = await Promise.all([
        pool.query(
          'select branding, commerce from tenant_settings where tenant_id = $1',
          [req.tenant.id]
        ),
        pool.query(
          [
            'select product_id, sku, name, qty, unit_price, total',
            'from order_items',
            'where order_id = $1',
            'order by name asc',
          ].join(' '),
          [orderId]
        ),
      ]);

      const branding = settingsRes.rows[0]?.branding || {};
      const commerce = settingsRes.rows[0]?.commerce || {};
      const companyName = getEmailCompanyName(branding?.name || req.tenant?.name || '');
      const customer = updatedOrder.customer || {};

      emailDelivery = await sendCustomerOrderStatusEmail({
        tenantId: req.tenant.id,
        email: customer.email,
        recipientName: customer.full_name || customer.fullName || customer.name,
        companyName,
        orderId,
        items: itemsRes.rows || [],
        subtotal: updatedOrder.subtotal,
        shipping: updatedOrder.shipping,
        tax: updatedOrder.tax,
        total: updatedOrder.total,
        currency: updatedOrder.currency,
        checkoutMode: updatedOrder.checkout_mode,
        contactChannel: customer.contact_channel || customer.order_channel || '',
        customer,
        status: rawStatus,
        notificationReason,
        approvedSubject: String(commerce.customer_payment_approved_subject || '').trim(),
        approvedText: String(commerce.customer_payment_approved_text || '').trim(),
        cancelledSubject: String(commerce.customer_payment_cancelled_subject || '').trim(),
        cancelledText: String(commerce.customer_payment_cancelled_text || '').trim(),
      });

      try {
        const nextCustomer = await appendOrderNotificationEntries(pool, {
          tenantId: req.tenant.id,
          orderId,
          entries: [
            buildOrderNotificationEntry({
              event: rawStatus === 'paid' ? 'payment_approved_customer' : 'payment_cancelled_customer',
              sent: emailDelivery.sent,
              provider: emailDelivery.provider,
              email: emailDelivery.email,
              subject: emailDelivery.subject,
              reason: notificationReason,
              actor: 'admin',
              status: rawStatus,
            }),
          ],
        });

        if (nextCustomer) {
          updatedOrder.customer = nextCustomer;
        }
      } catch (notificationHistoryError) {
        console.warn('No se pudo guardar el historial de notificaciones del pedido', notificationHistoryError);
      }
    }

    return res.json({ ok: true, order: updatedOrder, email_delivery: emailDelivery });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
});
