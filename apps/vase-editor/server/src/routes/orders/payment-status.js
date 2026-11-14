// Mantiene el estado del pago alineado con el estado del pedido.

export function mapPaymentStatusFromOrderStatus(orderStatus = '') {
  const normalized = String(orderStatus || '').trim().toLowerCase();
  if (normalized === 'paid') return 'paid';
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'processing') return 'processing';
  if (normalized === 'pending_payment') return 'pending';
  if (normalized === 'submitted') return 'submitted';
  if (normalized === 'unpaid') return 'unpaid';
  return normalized || 'pending';
}

export async function syncLatestPaymentStatus(db, {
  tenantId,
  orderId,
  orderStatus,
  checkoutMode = 'manual',
  total = 0,
  currency = 'ARS',
  notificationReason = '',
}) {
  const paymentStatus = mapPaymentStatusFromOrderStatus(orderStatus);
  const paymentMeta = notificationReason
    ? { admin_reason: notificationReason }
    : {};

  const paymentRes = await db.query(
    'select id, provider, metadata from payments where tenant_id = $1 and order_id = $2 order by created_at desc limit 1',
    [tenantId, orderId]
  );

  if (paymentRes.rowCount) {
    const payment = paymentRes.rows[0];
    await db.query(
      [
        'update payments',
        'set status = $1,',
        'amount = $2,',
        'currency = $3,',
        'metadata = coalesce(metadata, \'{}\'::jsonb) || $4::jsonb',
        'where id = $5',
      ].join(' '),
      [paymentStatus, Number(total || 0), currency || 'ARS', paymentMeta, payment.id]
    );
    return;
  }

  await db.query(
    [
      'insert into payments (tenant_id, order_id, provider, status, amount, currency, metadata)',
      'values ($1, $2, $3, $4, $5, $6, $7::jsonb)',
    ].join(' '),
    [
      tenantId,
      orderId,
      checkoutMode || 'manual',
      paymentStatus,
      Number(total || 0),
      currency || 'ARS',
      paymentMeta,
    ]
  );
}
