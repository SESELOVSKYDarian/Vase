// Variables para las plantillas de aviso y el registro de avisos enviados.
import { normalizeEmailInput } from '../../services/mailer.js';
import crypto from 'crypto';
import { formatCheckoutModeLabel, formatOrderAmount, formatOrderChannelLabel } from './order-labels.js';
import { formatBillingDocumentLabel, formatBillingVatLabel, normalizeBillingInfo } from './billing.js';

export function buildOrderTemplateVars({
  companyName = '',
  orderId = '',
  customer = {},
  subtotal = 0,
  shipping = 0,
  tax = 0,
  total = 0,
  currency = 'ARS',
  checkoutMode = '',
  contactChannel = '',
  statusLabel = '',
  cancelReason = '',
}) {
  const customerName =
    customer?.full_name ||
    customer?.fullName ||
    customer?.name ||
    customer?.customer_name ||
    '';
  const deliveryLabel = String(customer?.delivery_label || customer?.delivery_method || customer?.deliveryMethod || '').trim();
  const billing = normalizeBillingInfo(customer);

  return {
    company_name: companyName,
    order_id: String(orderId || ''),
    customer_name: customerName,
    customer_email: normalizeEmailInput(customer?.email),
    customer_phone: String(customer?.phone || '').trim(),
    delivery_label: deliveryLabel,
    billing_business_name: billing.businessName,
    billing_address: billing.address,
    billing_city: billing.city,
    billing_vat_type: formatBillingVatLabel(billing.vatType),
    billing_document_label: formatBillingDocumentLabel(billing.documentType),
    billing_document_number: billing.documentNumber,
    payment_method: formatCheckoutModeLabel(checkoutMode),
    contact_channel: formatOrderChannelLabel(contactChannel),
    status: statusLabel,
    cancel_reason: cancelReason,
    subtotal: formatOrderAmount(subtotal, currency),
    shipping: formatOrderAmount(shipping, currency),
    tax: formatOrderAmount(tax, currency),
    total: formatOrderAmount(total, currency),
    currency,
  };
}

export function applyOrderTemplate(template, vars = {}) {
  const source = String(template || '').trim();
  if (!source) return '';
  return source.replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (_match, key) => {
    const value = vars[key];
    return value == null ? '' : String(value);
  });
}

export function buildOrderNotificationEntry({
  event = '',
  sent = false,
  provider = 'unknown',
  email = '',
  subject = '',
  reason = '',
  actor = 'system',
  status = '',
}) {
  return {
    id: crypto.randomUUID(),
    event,
    sent: Boolean(sent),
    provider: String(provider || 'unknown'),
    email: normalizeEmailInput(email),
    subject: String(subject || '').trim(),
    reason: String(reason || '').trim(),
    actor,
    status: String(status || '').trim().toLowerCase(),
    created_at: new Date().toISOString(),
  };
}

export function getOrderNotificationHistory(customer = {}) {
  const source = customer && typeof customer === 'object' ? customer : {};
  return Array.isArray(source.notification_history)
    ? source.notification_history.filter((entry) => entry && typeof entry === 'object')
    : [];
}

export async function appendOrderNotificationEntries(db, { tenantId, orderId, entries = [] }) {
  const safeEntries = (Array.isArray(entries) ? entries : []).filter(Boolean);
  if (!safeEntries.length) return null;

  const currentRes = await db.query(
    'select customer from orders where tenant_id = $1 and id = $2',
    [tenantId, orderId]
  );

  if (!currentRes.rowCount) return null;

  const customer = currentRes.rows[0]?.customer && typeof currentRes.rows[0].customer === 'object'
    ? currentRes.rows[0].customer
    : {};
  const nextHistory = [...safeEntries, ...getOrderNotificationHistory(customer)].slice(0, 30);
  const nextCustomer = {
    ...customer,
    notification_history: nextHistory,
    last_notification: safeEntries[0],
  };

  const updateRes = await db.query(
    [
      'update orders',
      'set customer = $3::jsonb',
      'where tenant_id = $1 and id = $2',
      'returning customer',
    ].join(' '),
    [tenantId, orderId, nextCustomer]
  );

  return updateRes.rows[0]?.customer || nextCustomer;
}
