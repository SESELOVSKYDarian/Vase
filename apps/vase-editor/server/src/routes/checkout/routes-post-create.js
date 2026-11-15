// Rutas de checkout.js: use-middleware, post-validate, post-create.
import { resolveTenant } from '../../middleware/tenant.js';
import { pool } from '../../db.js';
import { resolveShippingAmount, toNumber } from '../../services/shipping.js';
import { resolveTaxDetails } from '../../services/taxes.js';
import { generateFiscalInvoice } from '../../services/invoiceService.js';
import { buildCheckoutContext, checkoutRouter, resolveCheckoutMethod, validateItems } from './validate-items.js';

checkoutRouter.use(resolveTenant);


checkoutRouter.post('/validate', async (req, res, next) => {
  try {
    const context = await buildCheckoutContext(req);
    const result = await validateItems(req.tenant.id, req.body.items, context.adjustments, context);
    if (!result.valid) {
      return res.status(400).json(result);
    }

    // Calcula shipping y taxes para /validate (reactividad del carrito)
    const customer = req.body.customer || {};
    const shippingInfo = resolveShippingAmount(context.commerce, customer);
    const shipping = toNumber(shippingInfo?.amount, 0);

    // Resolve dynamic taxes
    const taxData = await resolveTaxDetails(req.tenant.id, result.items, customer, shipping);
    result.shipping = shipping;
    result.tax = taxData.total_tax;
    result.tax_details = taxData.tax_details;
    result.total = result.subtotal + result.shipping + result.tax;

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

checkoutRouter.post('/create', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const context = await buildCheckoutContext(req);
    const { commerce, adjustments } = context;
    const validation = await validateItems(req.tenant.id, req.body.items, adjustments, context);
    if (!validation.valid) {
      return res.status(400).json(validation);
    }

    const requestedPayment = req.body?.customer?.payment_method || req.body?.payment_method || null;
    const checkoutMode = resolveCheckoutMethod(commerce, requestedPayment);
    const customer = req.body.customer || {};
    const shippingInfo = resolveShippingAmount(commerce, customer);
    if (shippingInfo?.error) {
      return res.status(400).json({ error: shippingInfo.error });
    }

    const shipping = toNumber(shippingInfo.amount, 0);
    const taxData = await resolveTaxDetails(req.tenant.id, validation.items, customer, shipping);
    const tax = taxData.total_tax;
    const total = validation.subtotal + shipping + tax;

    // Validate Tax Acknowledgement Checkbox
    if (!req.body.taxes_acknowledged) {
       // Si el comercio habilita la validacion estricta fiscal, podemos rebotar acá
       // return res.status(400).json({ valid: false, errors: ['taxes_not_acknowledged'] });
    }

    await client.query('BEGIN');
    for (const item of validation.items) {
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
    }

    const orderStatus = checkoutMode === 'transfer' ? 'pending_payment' : 'submitted';
    const customerPayload = {
      ...customer,
      payment_method: checkoutMode,
      shipping_zone_id: shippingInfo.shipping_zone_id,
      branch_id: shippingInfo.branch_id,
      shipping_distance_km: shippingInfo.distance_km ?? null,
      shipping_zone_type: shippingInfo.shipping_zone_type || null,
    };

    const orderRes = await client.query(
      [
        'insert into orders (tenant_id, user_id, status, checkout_mode, currency, subtotal, tax, shipping, total, customer)',
        'values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb) returning id',
      ].join(' '),
      [
        req.tenant.id,
        req.user?.id || null,
        orderStatus,
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
      await client.query(
        [
          'insert into order_items (order_id, product_id, sku, name, qty, unit_price, total)',
          'values ($1, $2, $3, $4, $5, $6, $7)',
        ].join(' '),
        [orderId, item.product_id, item.sku, item.name, item.qty, item.unit_price, item.total]
      );
    }

    let payment = null;
    const whatsapp_url = null;

    const provider =
      checkoutMode === 'transfer'
        ? 'bank_transfer'
        : checkoutMode === 'cash_on_pickup'
          ? 'cash_on_pickup'
          : 'manual';
    payment = {
      provider,
      status: orderStatus === 'pending_payment' ? 'pending' : 'submitted',
    };

    await client.query(
      [
        'insert into payments (tenant_id, order_id, provider, status, amount, currency, metadata)',
        'values ($1, $2, $3, $4, $5, $6, $7::jsonb)',
      ].join(' '),
      [
        req.tenant.id,
        orderId,
        provider,
        payment.status,
        total,
        validation.currency,
        { checkout_mode: checkoutMode },
      ]
    );

    await client.query('COMMIT');

    // Generar PDF Asincronamente tras crear la orden con éxito
    const invoiceData = await generateFiscalInvoice({
      id: orderId,
      user_id: req.user?.id,
      subtotal: validation.subtotal,
      shipping: shipping,
      tax: tax,
      total: total,
      currency: validation.currency
    });

    return res.json({
        order_id: orderId,
        checkout_mode: checkoutMode,
        payment,
        whatsapp_url,
        invoice_url: invoiceData?.url || null
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (String(err?.message || '').startsWith('insufficient_stock:')) {
      return res.status(400).json({ valid: false, errors: [err.message] });
    }
    return next(err);
  } finally {
    client.release();
  }
});
