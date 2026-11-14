// Recibe un pedido nuevo desde la tienda.
import { pool } from '../../db.js';
import { normalizePriceAdjustments } from '../../services/pricing.js';
import { resolvePricingProfile } from '../../services/userPricing.js';
import { loadSpecialPrices } from '../../services/specialPrices.js';
import { getTenantOffers } from '../../services/offers.js';
import { getEmailCompanyName, normalizeEmailInput } from '../../services/mailer.js';
import { resolveShippingAmount, toNumber } from '../../services/shipping.js';
import { ordersRouter } from './router.js';
import { resolveCheckoutMethod, resolveOrderChannel } from './checkout-options.js';
import { validateItems } from './validate-items.js';
import { buildWhatsAppUrl } from './order-labels.js';
import { appendOrderNotificationEntries, buildOrderNotificationEntry } from './order-templates.js';
import { sendOrderConfirmationEmail } from './email-confirmation.js';
import { sendAdminOrderNotificationEmail } from './email-admin.js';

ordersRouter.post('/submit', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const settingsRes = await pool.query(
      'select branding, commerce from tenant_settings where tenant_id = $1',
      [req.tenant.id]
    );
    const branding = (settingsRes.rows[0] && settingsRes.rows[0].branding) || {};
    const commerce = (settingsRes.rows[0] && settingsRes.rows[0].commerce) || {};
    const adminOrderConfirmationLabel =
      String(commerce.admin_order_confirmation_label || '').trim() || 'En confirmacion';
    const customerOrderProcessingLabel =
      String(commerce.customer_order_processing_label || '').trim() || 'En proceso';
    const adminOrderConfirmationText =
      String(commerce.admin_order_confirmation_text || '').trim() ||
      'Tienes un pedido en confirmacion. Revisa el panel de usuarios y confirma la compra.';
    const customerOrderProcessingText =
      String(commerce.customer_order_processing_text || '').trim() ||
      'Tu pedido fue recibido y se encuentra en proceso.';
    const adjustments = normalizePriceAdjustments(commerce);
    const pricingProfile = await resolvePricingProfile({
      tenantId: req.tenant.id,
      user: req.user || null,

      commerce,
    });
    const specialPrices = await loadSpecialPrices({
      tenantId: req.tenant.id,
      userId: req.user?.id || null,
      priceListId: pricingProfile?.priceList?.id || null,
    });

    let offers = [];
    try {
      offers = await getTenantOffers(req.tenant.id, { onlyEnabled: true });
    } catch (err) {
      console.warn('Failed to load tenant offers for order submit:', err?.message || err);
    }

    const validation = await validateItems(req.tenant.id, req.body.items, adjustments, {
      pricingProfile,
      offers,
      userId: req.user?.id || null,
      specialPrices,
    });
    if (!validation.valid) {
      return res.status(400).json(validation);
    }

    const requestedMode = String(
      req.body.checkout_mode || req.body.payment_method || req.body?.customer?.payment_method || ''
    ).toLowerCase();
    const checkoutMode = resolveCheckoutMethod(commerce, requestedMode);
    const requestedChannel = String(
      req.body.order_channel || req.body.contact_channel || req.body?.customer?.contact_channel || ''
    ).toLowerCase();
    const contactChannel = resolveOrderChannel(commerce, requestedChannel);

    const taxRate = Number(commerce.tax_rate || 0);
    const customer = req.body.customer || {};
    const shippingInfo = resolveShippingAmount(commerce, customer);
    if (shippingInfo?.error) {
      return res.status(400).json({ error: shippingInfo.error });
    }

    const shipping = toNumber(shippingInfo.amount, 0);
    const tax = (validation.subtotal + shipping) * taxRate;
    const total = validation.subtotal + shipping + tax;

    const status = checkoutMode === 'transfer' ? 'pending_payment' : 'submitted';
    const customerPayload = {
      ...customer,
      shipping_zone_id: shippingInfo.shipping_zone_id,
      branch_id: shippingInfo.branch_id,
      shipping_distance_km: shippingInfo.distance_km ?? null,
      shipping_zone_type: shippingInfo.shipping_zone_type || null,
      payment_method: checkoutMode,
      contact_channel: contactChannel,
    };

    await client.query('BEGIN');
    const orderRes = await client.query(
      [
        'insert into orders (tenant_id, user_id, status, checkout_mode, currency, subtotal, tax, shipping, total, customer)',
        'values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb) returning id',
      ].join(' '),
      [
        req.tenant.id,
        req.user?.id || null,
        status,
        checkoutMode,
        validation.currency,
        validation.subtotal,
        tax,
        shipping,
        total,
        customerPayload,
      ]
    );

    const orderId = orderRes.rows[0].id;

    for (const item of validation.items) {
      // Atomic stock decrement
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
        throw new Error(`insufficient_stock:${item.product_id}`);
      }

      await client.query(
        [
          'insert into order_items (order_id, product_id, sku, name, qty, unit_price, total)',
          'values ($1, $2, $3, $4, $5, $6, $7)',
        ].join(' '),
        [orderId, item.product_id, item.sku, item.name, item.qty, item.unit_price, item.total]
      );
    }

    const provider =
      checkoutMode === 'transfer'
        ? 'bank_transfer'
        : checkoutMode === 'cash_on_pickup'
          ? 'cash_on_pickup'
          : 'manual';
    await client.query(
      [
        'insert into payments (tenant_id, order_id, provider, status, amount, currency, metadata)',
        'values ($1, $2, $3, $4, $5, $6, $7::jsonb)',
      ].join(' '),
      [
        req.tenant.id,
        orderId,
        provider,
        status === 'pending_payment' ? 'pending' : 'submitted',
        total,
        validation.currency,
        {
          checkout_mode: checkoutMode,
        },
      ]
    );

    await client.query('COMMIT');

    const companyName = getEmailCompanyName(branding?.name || req.tenant?.name || '');
    const whatsappUrl = buildWhatsAppUrl(
      {
        items: validation.items,
        total,
        customer: customerPayload,
      },
      commerce,
      validation.currency
    );
    const emailDelivery = await sendOrderConfirmationEmail({
      tenantId: req.tenant.id,
      email: customerPayload.email,
      recipientName: customerPayload.full_name || customerPayload.fullName || customerPayload.name,
      companyName,
      orderId,
      items: validation.items,
      subtotal: validation.subtotal,
      shipping,
      tax,
      total,
      currency: validation.currency,
      checkoutMode,
      contactChannel,
      customer: customerPayload,
      processingText: customerOrderProcessingText,
      processingLabel: customerOrderProcessingLabel,
    });
    const adminDelivery = await sendAdminOrderNotificationEmail({
      tenantId: req.tenant.id,
      recipientEmail: commerce.order_notification_email || commerce.email || '',
      companyName,
      orderId,
      items: validation.items,
      subtotal: validation.subtotal,
      shipping,
      tax,
      total,
      currency: validation.currency,
      checkoutMode,
      contactChannel,
      customer: customerPayload,
      confirmationText: adminOrderConfirmationText,
      confirmationLabel: adminOrderConfirmationLabel,
    });
    try {
      await appendOrderNotificationEntries(pool, {
        tenantId: req.tenant.id,
        orderId,
        entries: [
          buildOrderNotificationEntry({
            event: 'order_confirmation_customer',
            sent: emailDelivery.sent,
            provider: emailDelivery.provider,
            email: emailDelivery.email,
            subject: emailDelivery.subject,
            actor: 'system',
            status,
          }),
          buildOrderNotificationEntry({
            event: 'order_confirmation_admin',
            sent: adminDelivery.sent,
            provider: adminDelivery.provider,
            email: adminDelivery.email,
            subject: adminDelivery.subject,
            actor: 'system',
            status,
          }),
        ],
      });
    } catch (notificationHistoryError) {
      console.warn('No se pudo guardar el historial de notificaciones del pedido', notificationHistoryError);
    }

    return res.json({
      order_id: orderId,
      status,
      checkout_mode: checkoutMode,
      contact_channel: contactChannel,
      totals: {
        subtotal: validation.subtotal,
        tax,
        shipping,
        total,
        currency: validation.currency,
      },
      whatsapp_url: whatsappUrl,
      email_delivery: {
        ...emailDelivery,
        email: normalizeEmailInput(customerPayload.email),
      },
      admin_notification: {
        ...adminDelivery,
        email: normalizeEmailInput(commerce.order_notification_email || commerce.email || ''),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});
