// Cambiar el estado de un pedido: devuelve o vuelve a reservar stock, actualiza el pago y, si se pide,
// le avisa al cliente por correo. Lo usan el panel de Business y Pedidos de app.vase.ar (ruta interna),
// así los dos hacen exactamente lo mismo.
import { pool } from '../../db.js';
import { getEmailCompanyName } from '../../services/mailer.js';
import { ALLOWED_STATUSES, parseBooleanInput } from './checkout-options.js';
import { appendOrderNotificationEntries, buildOrderNotificationEntry } from './order-templates.js';
import { syncLatestPaymentStatus } from './payment-status.js';
import { sendCustomerOrderStatusEmail } from './email-status.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** tenant: { id, name }. Devuelve { status, body } para responder tal cual. */
export async function changeOrderStatus({ tenant, orderId, body = {}, actor = 'admin' }) {
  if (!UUID.test(String(orderId || ''))) {
    return { status: 400, body: { error: 'invalid_order_id' } };
  }
  const rawStatus = String(body?.status || '').trim().toLowerCase();
  if (!ALLOWED_STATUSES.has(rawStatus)) {
    return { status: 400, body: { error: 'invalid_status' } };
  }
  const notifyCustomer = parseBooleanInput(body?.notify_customer ?? body?.notifyCustomer, false);
  const notificationReason = String(body?.notification_reason || body?.reason || '').trim();
  if (notifyCustomer && rawStatus === 'cancelled' && !notificationReason) {
    return { status: 400, body: { error: 'notification_reason_required' } };
  }

  const client = await pool.connect();
  try {
    const currentOrderRes = await client.query(
      [
        'select id, status, checkout_mode, currency, subtotal, tax, shipping, total, customer, created_at',
        'from orders',
        'where tenant_id = $1 and id = $2',
      ].join(' '),
      [tenant.id, orderId]
    );

    if (!currentOrderRes.rowCount) {
      return { status: 404, body: { error: 'order_not_found' } };
    }

    const oldStatus = currentOrderRes.rows[0].status;

    await client.query('BEGIN');

    // Cancelar devuelve el stock; reactivar un pedido cancelado lo vuelve a reservar.
    if (rawStatus === 'cancelled' && oldStatus !== 'cancelled') {
      const itemsRes = await client.query('select product_id, qty from order_items where order_id = $1', [orderId]);
      for (const item of itemsRes.rows) {
        await client.query(
          [
            'update product_cache',
            'set stock = case when stock is null then null else stock + $1 end, updated_at = now()',
            'where tenant_id = $2 and id = $3',
          ].join(' '),
          [item.qty, tenant.id, item.product_id]
        );
      }
    } else if (rawStatus !== 'cancelled' && oldStatus === 'cancelled') {
      const itemsRes = await client.query('select product_id, qty from order_items where order_id = $1', [orderId]);
      for (const item of itemsRes.rows) {
        const stockRes = await client.query(
          [
            'update product_cache',
            'set stock = case when stock is null then null else stock - $1 end, updated_at = now()',
            'where tenant_id = $2 and id = $3 and (stock is null or stock >= $1)',
            'returning stock',
          ].join(' '),
          [item.qty, tenant.id, item.product_id]
        );
        if (!stockRes.rowCount) {
          await client.query('ROLLBACK');
          return { status: 400, body: { error: `insufficient_stock:${item.product_id}` } };
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
      [rawStatus, tenant.id, orderId]
    );

    const updatedOrder = result.rows[0];
    await syncLatestPaymentStatus(client, {
      tenantId: tenant.id,
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
        pool.query('select branding, commerce from tenant_settings where tenant_id = $1', [tenant.id]),
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
      const companyName = getEmailCompanyName(branding?.name || tenant?.name || '');
      const customer = updatedOrder.customer || {};

      emailDelivery = await sendCustomerOrderStatusEmail({
        tenantId: tenant.id,
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
          tenantId: tenant.id,
          orderId,
          entries: [
            buildOrderNotificationEntry({
              event: rawStatus === 'paid' ? 'payment_approved_customer' : 'payment_cancelled_customer',
              sent: emailDelivery.sent,
              provider: emailDelivery.provider,
              email: emailDelivery.email,
              subject: emailDelivery.subject,
              reason: notificationReason,
              actor,
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

    return { status: 200, body: { ok: true, order: updatedOrder, email_delivery: emailDelivery } };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
