import express from 'express';
import { pool } from '../db.js';
import { resolveTenant } from '../middleware/tenant.js';
import { normalizePriceAdjustments } from '../services/pricing.js';
import { resolveEffectiveProductPrice, resolvePricingProfile } from '../services/userPricing.js';
import {
  applyOfferDiscount,
  getTenantOffers,
  resolveBestOfferForProduct,
} from '../services/offers.js';
import {
  getEmailCompanyName,
  normalizeDisplayName,
  normalizeEmailInput,
  sendSmtpEmail,
} from '../services/mailer.js';
import {
  normalizeBranches,
  normalizeShippingZones,
  resolveShippingAmount,
  toNumber,
} from '../services/shipping.js';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

export const ordersRouter = express.Router();
export const adminOrdersRouter = express.Router();

ordersRouter.use(resolveTenant);
adminOrdersRouter.use(resolveTenant);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const paymentsDir = path.join(__dirname, '..', '..', 'uploads', 'payments');

if (!fs.existsSync(paymentsDir)) {
  fs.mkdirSync(paymentsDir, { recursive: true });
}

const proofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, paymentsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const proofUpload = multer({
  storage: proofStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten comprobantes (JPG, PNG, WebP, GIF, PDF)'));
    }
  },
});

const ALLOWED_METHODS = new Set(['transfer', 'cash_on_pickup']);
const ALLOWED_ORDER_CHANNELS = new Set(['whatsapp', 'email']);
const ALLOWED_STATUSES = new Set([
  'submitted',
  'pending_payment',
  'paid',
  'processing',
  'unpaid',
  'cancelled',
  'draft',
]);

function normalizePaymentMethod(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  if (raw === 'cash' || raw === 'pickup' || raw === 'local' || raw === 'store') {
    return 'cash_on_pickup';
  }
  if (raw === 'whatsapp') {
    return 'transfer';
  }
  return ALLOWED_METHODS.has(raw) ? raw : null;
}

function normalizeOrderChannel(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'gmail' || raw === 'mail' || raw === 'correo') {
    return 'email';
  }
  if (raw === 'wa') {
    return 'whatsapp';
  }
  return ALLOWED_ORDER_CHANNELS.has(raw) ? raw : null;
}

function parseBooleanInput(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function getEnabledMethods(settings = {}) {
  if (Array.isArray(settings.payment_methods)) {
    const methods = settings.payment_methods
      .map((entry) => normalizePaymentMethod(entry))
      .filter(Boolean);
    if (methods.length) {
      return [...new Set(methods)];
    }
  }

  const rawMode = settings.checkout_mode || settings.mode || 'both';
  const normalizedMode = String(rawMode).toLowerCase();
  if (normalizedMode === 'hybrid' || normalizedMode === 'both') {
    return ['transfer', 'cash_on_pickup'];
  }
  if (normalizedMode === 'transfer') {
    return ['transfer'];
  }
  if (normalizedMode === 'cash_on_pickup') {
    return ['cash_on_pickup'];
  }
  return ['transfer'];
}

function resolveCheckoutMethod(settings = {}, requested = '') {
  const enabledMethods = getEnabledMethods(settings);
  const normalizedRequested = normalizePaymentMethod(requested);
  if (normalizedRequested && enabledMethods.includes(normalizedRequested)) {
    return normalizedRequested;
  }
  return enabledMethods[0] || 'transfer';
}

function resolveOrderChannel(settings = {}, requested = '') {
  const normalizedRequested = normalizeOrderChannel(requested);
  if (normalizedRequested) {
    return normalizedRequested;
  }
  const hasWhatsapp = String(settings?.whatsapp_number || '').replace(/\D/g, '');
  return hasWhatsapp ? 'whatsapp' : 'email';
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && item.product_id)
    .map((item) => ({
      product_id: item.product_id,
      qty: Math.max(1, Number(item.qty || 1)),
    }));
}

async function validateItems(tenantId, items, adjustments, context = {}) {
  const { pricingProfile, offers = [], userId = null } = context;
  const normalized = normalizeItems(items);
  const ids = normalized.map((item) => item.product_id);

  if (!ids.length) {
    return { valid: false, errors: ['empty_items'] };
  }

  const result = await pool.query(
    [
      'select p.id, p.sku, p.name, p.price, p.price_wholesale, p.currency, p.stock,',
      "coalesce((select array_agg(pc.category_id) from product_categories pc where pc.product_id = p.id), '{}'::uuid[]) as category_ids",
      'from product_cache p',
      'where p.tenant_id = $1 and p.id = ANY($2::uuid[])',
    ].join(' '),
    [tenantId, ids]
  );

  const products = result.rows;
  const errors = [];
  let currency = null;
  let subtotal = 0;

  const lineItems = normalized
    .map((item) => {
      const product = products.find((row) => row.id === item.product_id);
      if (!product) {
        errors.push(`product_not_found:${item.product_id}`);
        return null;
      }

      if (product.stock < item.qty) {
        errors.push(`insufficient_stock:${product.id}`);
      }

      currency = currency || product.currency;
      const { effective } = resolveEffectiveProductPrice({
        priceRetail: product.price,
        priceWholesale: product.price_wholesale,
        profile: pricingProfile,
        adjustments,
      });
      const bestOffer = resolveBestOfferForProduct({
        offers,
        userId,
        categoryIds: product.category_ids || [],
      });
      const unitPrice = Number(applyOfferDiscount(effective, bestOffer.percent) || 0);
      subtotal += unitPrice * item.qty;

      return {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        qty: item.qty,
        unit_price: unitPrice,
        total: unitPrice * item.qty,
        currency: product.currency,
      };
    })
    .filter(Boolean);

  return {
    valid: errors.length === 0,
    currency: currency || 'ARS',
    subtotal,
    items: lineItems,
    errors,
  };
}

function buildWhatsAppMessage(order, template, currency) {
  const itemsLines = order.items
    .map((item) => {
      const unitPrice = Number(item.unit_price || 0);
      const lineTotal = Number(item.total != null ? item.total : unitPrice * Number(item.qty || 0));
      return `- ${item.name} (SKU: ${item.sku || item.product_id}) x${item.qty} | ${unitPrice.toFixed(2)} ${currency} | ${lineTotal.toFixed(2)} ${currency}`;
    })
    .join('\n');

  const payload = {
    items: itemsLines,
    total: order.total?.toFixed?.(2) || String(order.total || ''),
    currency,
    name: order.customer?.full_name || order.customer?.fullName || '',
    phone: order.customer?.phone || '',
    address: order.customer?.fullAddress || order.customer?.line1 || '',
  };

  if (!template) {
    return [
      'Pedido nuevo',
      payload.name ? `Cliente: ${payload.name}` : null,
      payload.phone ? `Teléfono: ${payload.phone}` : null,
      payload.address ? `Dirección: ${payload.address}` : null,
      '',
      'Productos:',
      payload.items,
      '',
      `Total: ${payload.total} ${payload.currency}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return template
    .replace(/{{\s*items\s*}}/gi, payload.items)
    .replace(/{{\s*total\s*}}/gi, payload.total)
    .replace(/{{\s*currency\s*}}/gi, payload.currency)
    .replace(/{{\s*name\s*}}/gi, payload.name)
    .replace(/{{\s*phone\s*}}/gi, payload.phone)
    .replace(/{{\s*address\s*}}/gi, payload.address);
}

function buildWhatsAppUrl(order, settings = {}, currency = 'ARS') {
  const phone = String(settings?.whatsapp_number || '').replace(/\D/g, '');
  if (!phone) return null;
  const message = buildWhatsAppMessage(order, settings?.whatsapp_template || '', currency);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function formatOrderAmount(value, currency = 'ARS') {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
}

function formatCheckoutModeLabel(mode = '') {
  const normalized = String(mode || '').toLowerCase();
  if (normalized === 'transfer') return 'Transferencia bancaria';
  if (normalized === 'stripe') return 'Pago online';
  if (normalized === 'cash_on_pickup') return 'Pago en local';
  return normalized || 'Manual';
}

function formatOrderChannelLabel(channel = '') {
  return normalizeOrderChannel(channel) === 'email' ? 'Gmail' : 'WhatsApp';
}

function normalizeBillingInfo(customer = {}) {
  const source = customer?.billing && typeof customer.billing === 'object' ? customer.billing : customer;
  const businessName = String(
    source.business_name ||
    source.businessName ||
    source.razon_social ||
    customer?.billing_business_name ||
    customer?.billingBusinessName ||
    customer?.company ||
    ''
  ).trim();
  const address = String(
    source.address ||
    source.direccion ||
    customer?.billing_address ||
    customer?.billingAddress ||
    ''
  ).trim();
  const city = String(
    source.city ||
    source.localidad ||
    customer?.billing_city ||
    customer?.billingCity ||
    ''
  ).trim();
  const rawVatType = String(
    source.vat_type ||
    source.vatType ||
    customer?.billing_vat_type ||
    customer?.billingVatType ||
    ''
  ).trim().toLowerCase();
  const rawDocumentType = String(
    source.document_type ||
    source.documentType ||
    customer?.billing_document_type ||
    customer?.billingDocumentType ||
    'cuit'
  ).trim().toLowerCase();
  const documentNumber = String(
    source.document_number ||
    source.documentNumber ||
    customer?.billing_document_number ||
    customer?.billingDocumentNumber ||
    customer?.cuit ||
    ''
  ).trim();

  return {
    businessName,
    address,
    city,
    vatType: rawVatType,
    documentType: ['cuit', 'cuil', 'dni'].includes(rawDocumentType) ? rawDocumentType : 'cuit',
    documentNumber,
  };
}

function hasBillingInfo(customer = {}) {
  const billing = normalizeBillingInfo(customer);
  return Boolean(
    billing.businessName ||
    billing.address ||
    billing.city ||
    billing.vatType ||
    billing.documentNumber
  );
}

function formatBillingVatLabel(value = '') {
  if (value === 'responsable_inscripto' || value === 'inscripto') return 'Responsable inscripto';
  if (value === 'monotributista' || value === 'monotributo') return 'Monotributista';
  if (value === 'exento') return 'Exento';
  if (value === 'consumidor_final' || value === 'consumidor final') return 'Consumidor final';
  return value || '-';
}

function formatBillingDocumentLabel(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'dni') return 'DNI';
  if (normalized === 'cuil') return 'CUIL';
  return 'CUIT';
}

function buildOrderTemplateVars({
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

function applyOrderTemplate(template, vars = {}) {
  const source = String(template || '').trim();
  if (!source) return '';
  return source.replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (_match, key) => {
    const value = vars[key];
    return value == null ? '' : String(value);
  });
}

function buildOrderNotificationEntry({
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

function getOrderNotificationHistory(customer = {}) {
  const source = customer && typeof customer === 'object' ? customer : {};
  return Array.isArray(source.notification_history)
    ? source.notification_history.filter((entry) => entry && typeof entry === 'object')
    : [];
}

async function appendOrderNotificationEntries(db, { tenantId, orderId, entries = [] }) {
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

async function sendOrderConfirmationEmail({
  email,
  recipientName,
  companyName,
  orderId,
  items = [],
  subtotal = 0,
  shipping = 0,
  tax = 0,
  total = 0,
  currency = 'ARS',
  checkoutMode = '',
  contactChannel = '',
  customer = {},
  processingText = '',
  processingLabel = 'En proceso',
}) {
  const recipient = normalizeEmailInput(email || customer?.email);
  if (!recipient) {
    return { sent: false, provider: 'missing_email' };
  }

  const safeName = normalizeDisplayName(recipientName || customer?.full_name || customer?.fullName || customer?.name);
  const greeting = safeName ? `Hola, ${safeName}:` : 'Hola:';
  const deliveryLabel = String(customer?.delivery_label || customer?.delivery_method || customer?.deliveryMethod || '').trim();
  const paymentLabel = formatCheckoutModeLabel(checkoutMode);
  const contactLabel = formatOrderChannelLabel(contactChannel);
  const billing = normalizeBillingInfo(customer);
  const includeBilling = hasBillingInfo(customer);
  const templateVars = buildOrderTemplateVars({
    companyName,
    orderId,
    customer,
    subtotal,
    shipping,
    tax,
    total,
    currency,
    checkoutMode,
    contactChannel,
    statusLabel: processingLabel,
  });
  const address = [
    customer?.fullAddress || customer?.line1 || '',
    customer?.city || '',
    customer?.postalCode || customer?.postal || '',
  ]
    .filter(Boolean)
    .join(', ');
  const statusLine =
    checkoutMode === 'transfer'
      ? 'Tu pedido quedo pendiente de pago. Cuando tengas el comprobante podes subirlo desde tu panel.'
      : checkoutMode === 'cash_on_pickup'
          ? 'Tu pedido quedo reservado para abonar al retirar.'
          : 'Tu pedido ya fue recibido correctamente.';
  const customIntro =
    applyOrderTemplate(processingText, templateVars) ||
    'Tu pedido fue recibido y se encuentra en proceso.';

  const itemsText = items
    .map((item) => `- ${item.name} (SKU: ${item.sku || item.product_id}) x${item.qty} | ${formatOrderAmount(item.total, currency)}`)
    .join('\n');

  const subject = `Confirmacion de pedido #${String(orderId).slice(0, 8)} - ${companyName}`;
  const textBody = [
    greeting,
    '',
    `Recibimos tu pedido en ${companyName}.`,
    customIntro,
    statusLine,
    '',
    `Numero de pedido: ${orderId}`,
    `Canal del pedido: ${contactLabel}`,
    `Metodo de pago: ${paymentLabel}`,
    deliveryLabel ? `Entrega: ${deliveryLabel}` : null,
    address ? `Direccion: ${address}` : null,
    customer?.phone ? `Telefono: ${customer.phone}` : null,
    includeBilling ? `Razon social: ${billing.businessName || '-'}` : null,
    includeBilling ? `Facturacion direccion: ${billing.address || '-'}` : null,
    includeBilling ? `Facturacion localidad: ${billing.city || '-'}` : null,
    includeBilling ? `Tipo de IVA: ${formatBillingVatLabel(billing.vatType)}` : null,
    includeBilling ? `${formatBillingDocumentLabel(billing.documentType)}: ${billing.documentNumber || '-'}` : null,
    '',
    'Productos:',
    itemsText || '- Sin productos',
    '',
    `Subtotal: ${formatOrderAmount(subtotal, currency)}`,
    `Envio: ${formatOrderAmount(shipping, currency)}`,
    `Impuestos: ${formatOrderAmount(tax, currency)}`,
    `Total: ${formatOrderAmount(total, currency)}`,
    '',
    'Gracias por comprar con nosotros.',
    '',
    `Equipo de ${companyName}`,
  ]
    .filter(Boolean)
    .join('\n');

  const htmlItems = items.length
    ? items
        .map(
          (item) =>
            `<li><strong>${item.name}</strong> (SKU: ${item.sku || item.product_id}) x${item.qty} <span style="color:#64748b;">${formatOrderAmount(item.total, currency)}</span></li>`
        )
        .join('')
    : '<li>Sin productos</li>';

  const htmlBody = [
    `<p>${greeting}</p>`,
    `<p>Recibimos tu pedido en <strong>${companyName}</strong>.</p>`,
    `<p>${customIntro}</p>`,
    `<p>${statusLine}</p>`,
    '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">',
    `<p><strong>Numero de pedido:</strong> ${orderId}</p>`,
    `<p><strong>Canal del pedido:</strong> ${contactLabel}</p>`,
    `<p><strong>Metodo de pago:</strong> ${paymentLabel}</p>`,
    deliveryLabel ? `<p><strong>Entrega:</strong> ${deliveryLabel}</p>` : '',
    address ? `<p><strong>Direccion:</strong> ${address}</p>` : '',
    customer?.phone ? `<p><strong>Telefono:</strong> ${customer.phone}</p>` : '',
    includeBilling ? `<p><strong>Razon social:</strong> ${billing.businessName || '-'}</p>` : '',
    includeBilling ? `<p><strong>Facturacion direccion:</strong> ${billing.address || '-'}</p>` : '',
    includeBilling ? `<p><strong>Facturacion localidad:</strong> ${billing.city || '-'}</p>` : '',
    includeBilling ? `<p><strong>Tipo de IVA:</strong> ${formatBillingVatLabel(billing.vatType)}</p>` : '',
    includeBilling ? `<p><strong>${formatBillingDocumentLabel(billing.documentType)}:</strong> ${billing.documentNumber || '-'}</p>` : '',
    '</div>',
    '<p><strong>Productos</strong></p>',
    `<ul>${htmlItems}</ul>`,
    '<div style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:12px;">',
    `<p>Subtotal: <strong>${formatOrderAmount(subtotal, currency)}</strong></p>`,
    `<p>Envio: <strong>${formatOrderAmount(shipping, currency)}</strong></p>`,
    `<p>Impuestos: <strong>${formatOrderAmount(tax, currency)}</strong></p>`,
    `<p>Total: <strong>${formatOrderAmount(total, currency)}</strong></p>`,
    '</div>',
    `<p>Gracias por comprar con ${companyName}.</p>`,
  ].join('');

  const delivery = await sendSmtpEmail({
    to: recipient,
    subject,
    text: textBody,
    html: htmlBody,
    logPrefix: 'order-confirmation',
  });
  return {
    ...delivery,
    email: recipient,
    subject,
  };
}

async function sendAdminOrderNotificationEmail({
  recipientEmail,
  companyName,
  orderId,
  items = [],
  subtotal = 0,
  shipping = 0,
  tax = 0,
  total = 0,
  currency = 'ARS',
  checkoutMode = '',
  contactChannel = '',
  customer = {},
  confirmationText = '',
  confirmationLabel = 'En confirmacion',
}) {
  const recipient = normalizeEmailInput(recipientEmail);
  if (!recipient) {
    return { sent: false, provider: 'missing_email' };
  }

  const templateVars = buildOrderTemplateVars({
    companyName,
    orderId,
    customer,
    subtotal,
    shipping,
    tax,
    total,
    currency,
    checkoutMode,
    contactChannel,
    statusLabel: confirmationLabel,
  });
  const intro =
    applyOrderTemplate(confirmationText, templateVars) ||
    'Tienes un pedido en confirmacion. Revisa el panel de usuarios y confirma la compra.';
  const customerName =
    customer?.full_name || customer?.fullName || customer?.name || customer?.customer_name || 'Cliente';
  const billing = normalizeBillingInfo(customer);
  const includeBilling = hasBillingInfo(customer);
  const subject = `Pedido en confirmacion #${String(orderId).slice(0, 8)} - ${companyName}`;
  const itemsText = items
    .map((item) => `- ${item.name} (SKU: ${item.sku || item.product_id}) x${item.qty} | ${formatOrderAmount(item.total, currency)}`)
    .join('\n');
  const textBody = [
    'Hola,',
    '',
    intro,
    '',
    `Pedido: ${orderId}`,
    `Cliente: ${customerName}`,
    customer?.email ? `Email: ${customer.email}` : null,
    customer?.phone ? `Telefono: ${customer.phone}` : null,
    templateVars.delivery_label ? `Entrega: ${templateVars.delivery_label}` : null,
    includeBilling ? `Razon social: ${billing.businessName || '-'}` : null,
    includeBilling ? `Facturacion direccion: ${billing.address || '-'}` : null,
    includeBilling ? `Facturacion localidad: ${billing.city || '-'}` : null,
    includeBilling ? `Tipo de IVA: ${formatBillingVatLabel(billing.vatType)}` : null,
    includeBilling ? `${formatBillingDocumentLabel(billing.documentType)}: ${billing.documentNumber || '-'}` : null,
    `Metodo de pago: ${templateVars.payment_method}`,
    `Canal del pedido: ${templateVars.contact_channel}`,
    '',
    'Productos:',
    itemsText || '- Sin productos',
    '',
    `Total: ${formatOrderAmount(total, currency)}`,
    '',
    'Confirma y actualiza el estado desde el panel de usuarios.',
  ]
    .filter(Boolean)
    .join('\n');
  const htmlItems = items.length
    ? items
        .map(
          (item) =>
            `<li><strong>${item.name}</strong> (SKU: ${item.sku || item.product_id}) x${item.qty} <span style="color:#64748b;">${formatOrderAmount(item.total, currency)}</span></li>`
        )
        .join('')
    : '<li>Sin productos</li>';
  const htmlBody = [
    '<p>Hola,</p>',
    `<p>${intro}</p>`,
    '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">',
    `<p><strong>Pedido:</strong> ${orderId}</p>`,
    `<p><strong>Cliente:</strong> ${customerName}</p>`,
    customer?.email ? `<p><strong>Email:</strong> ${customer.email}</p>` : '',
    customer?.phone ? `<p><strong>Telefono:</strong> ${customer.phone}</p>` : '',
    templateVars.delivery_label ? `<p><strong>Entrega:</strong> ${templateVars.delivery_label}</p>` : '',
    includeBilling ? `<p><strong>Razon social:</strong> ${billing.businessName || '-'}</p>` : '',
    includeBilling ? `<p><strong>Facturacion direccion:</strong> ${billing.address || '-'}</p>` : '',
    includeBilling ? `<p><strong>Facturacion localidad:</strong> ${billing.city || '-'}</p>` : '',
    includeBilling ? `<p><strong>Tipo de IVA:</strong> ${formatBillingVatLabel(billing.vatType)}</p>` : '',
    includeBilling ? `<p><strong>${formatBillingDocumentLabel(billing.documentType)}:</strong> ${billing.documentNumber || '-'}</p>` : '',
    `<p><strong>Metodo de pago:</strong> ${templateVars.payment_method}</p>`,
    `<p><strong>Canal del pedido:</strong> ${templateVars.contact_channel}</p>`,
    `<p><strong>Estado esperado:</strong> ${confirmationLabel}</p>`,
    '</div>',
    '<p><strong>Productos</strong></p>',
    `<ul>${htmlItems}</ul>`,
    `<p><strong>Total:</strong> ${formatOrderAmount(total, currency)}</p>`,
    '<p>Confirma y actualiza el estado desde el panel de usuarios.</p>',
  ].join('');

  const delivery = await sendSmtpEmail({
    to: recipient,
    subject,
    text: textBody,
    html: htmlBody,
    logPrefix: 'admin-order-notification',
  });
  return {
    ...delivery,
    email: recipient,
    subject,
  };
}

function mapPaymentStatusFromOrderStatus(orderStatus = '') {
  const normalized = String(orderStatus || '').trim().toLowerCase();
  if (normalized === 'paid') return 'paid';
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'processing') return 'processing';
  if (normalized === 'pending_payment') return 'pending';
  if (normalized === 'submitted') return 'submitted';
  if (normalized === 'unpaid') return 'unpaid';
  return normalized || 'pending';
}

async function syncLatestPaymentStatus(db, {
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

async function sendCustomerOrderStatusEmail({
  email,
  recipientName,
  companyName,
  orderId,
  items = [],
  subtotal = 0,
  shipping = 0,
  tax = 0,
  total = 0,
  currency = 'ARS',
  checkoutMode = '',
  contactChannel = '',
  customer = {},
  status = '',
  notificationReason = '',
  approvedSubject = '',
  approvedText = '',
  cancelledSubject = '',
  cancelledText = '',
}) {
  const recipient = normalizeEmailInput(email || customer?.email);
  if (!recipient) {
    return { sent: false, provider: 'missing_email' };
  }

  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (!['paid', 'cancelled'].includes(normalizedStatus)) {
    return { sent: false, provider: 'status_not_supported' };
  }

  const safeName = normalizeDisplayName(recipientName || customer?.full_name || customer?.fullName || customer?.name);
  const greeting = safeName ? `Hola, ${safeName}:` : 'Hola:';
  const deliveryLabel = String(customer?.delivery_label || customer?.delivery_method || customer?.deliveryMethod || '').trim();
  const billing = normalizeBillingInfo(customer);
  const includeBilling = hasBillingInfo(customer);
  const statusLabel = normalizedStatus === 'paid' ? 'Pago aprobado' : 'Pago cancelado';
  const templateVars = buildOrderTemplateVars({
    companyName,
    orderId,
    customer,
    subtotal,
    shipping,
    tax,
    total,
    currency,
    checkoutMode,
    contactChannel,
    statusLabel,
    cancelReason: notificationReason,
  });
  const address = [
    customer?.fullAddress || customer?.line1 || '',
    customer?.city || '',
    customer?.postalCode || customer?.postal || '',
  ]
    .filter(Boolean)
    .join(', ');
  const defaultSubject =
    normalizedStatus === 'paid'
      ? `Pago aprobado para tu pedido #${String(orderId).slice(0, 8)} - ${companyName}`
      : `Actualizacion de tu pedido #${String(orderId).slice(0, 8)} - ${companyName}`;
  const subjectTemplate = normalizedStatus === 'paid' ? approvedSubject : cancelledSubject;
  const introTemplate = normalizedStatus === 'paid' ? approvedText : cancelledText;
  const subject = applyOrderTemplate(subjectTemplate, templateVars) || defaultSubject;
  const intro =
    applyOrderTemplate(introTemplate, templateVars) ||
    (normalizedStatus === 'paid'
      ? 'Confirmamos que tu pago fue aprobado. Ya estamos preparando tu pedido para el siguiente paso.'
      : 'Te informamos de manera formal que no pudimos aprobar el pago de tu pedido.');
  const reasonBlock = normalizedStatus === 'cancelled' && notificationReason
    ? `Motivo informado: ${notificationReason}`
    : '';
  const itemsText = items
    .map((item) => `- ${item.name} (SKU: ${item.sku || item.product_id}) x${item.qty} | ${formatOrderAmount(item.total, currency)}`)
    .join('\n');
  const textBody = [
    greeting,
    '',
    intro,
    reasonBlock,
    '',
    `Numero de pedido: ${orderId}`,
    `Estado: ${statusLabel}`,
    `Metodo de pago: ${formatCheckoutModeLabel(checkoutMode)}`,
    `Canal del pedido: ${formatOrderChannelLabel(contactChannel)}`,
    deliveryLabel ? `Entrega: ${deliveryLabel}` : null,
    address ? `Direccion: ${address}` : null,
    customer?.phone ? `Telefono: ${customer.phone}` : null,
    includeBilling ? `Razon social: ${billing.businessName || '-'}` : null,
    includeBilling ? `Facturacion direccion: ${billing.address || '-'}` : null,
    includeBilling ? `Facturacion localidad: ${billing.city || '-'}` : null,
    includeBilling ? `Tipo de IVA: ${formatBillingVatLabel(billing.vatType)}` : null,
    includeBilling ? `${formatBillingDocumentLabel(billing.documentType)}: ${billing.documentNumber || '-'}` : null,
    '',
    'Productos:',
    itemsText || '- Sin productos',
    '',
    `Subtotal: ${formatOrderAmount(subtotal, currency)}`,
    `Envio: ${formatOrderAmount(shipping, currency)}`,
    `Impuestos: ${formatOrderAmount(tax, currency)}`,
    `Total: ${formatOrderAmount(total, currency)}`,
    '',
    normalizedStatus === 'paid'
      ? `Gracias por tu compra. El equipo de ${companyName} continuara con el pedido.`
      : `Si necesitas mas informacion, responde este correo o contactate con ${companyName}.`,
    '',
    `Equipo de ${companyName}`,
  ]
    .filter(Boolean)
    .join('\n');
  const htmlItems = items.length
    ? items
        .map(
          (item) =>
            `<li><strong>${item.name}</strong> (SKU: ${item.sku || item.product_id}) x${item.qty} <span style="color:#64748b;">${formatOrderAmount(item.total, currency)}</span></li>`
        )
        .join('')
    : '<li>Sin productos</li>';
  const bannerColor = normalizedStatus === 'paid' ? '#16a34a' : '#dc2626';
  const htmlBody = [
    `<p>${greeting}</p>`,
    `<div style="margin:16px 0;padding:14px 16px;border-radius:14px;background:${normalizedStatus === 'paid' ? '#ecfdf5' : '#fff1f2'};border:1px solid ${normalizedStatus === 'paid' ? '#bbf7d0' : '#fecdd3'};">`,
    `<p style="margin:0;color:${bannerColor};font-size:16px;font-weight:700;">${statusLabel}</p>`,
    `<p style="margin:8px 0 0 0;color:#334155;">${intro}</p>`,
    reasonBlock ? `<p style="margin:8px 0 0 0;color:#334155;"><strong>Motivo informado:</strong> ${notificationReason}</p>` : '',
    '</div>',
    '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">',
    `<p><strong>Numero de pedido:</strong> ${orderId}</p>`,
    `<p><strong>Estado:</strong> ${statusLabel}</p>`,
    `<p><strong>Metodo de pago:</strong> ${formatCheckoutModeLabel(checkoutMode)}</p>`,
    `<p><strong>Canal del pedido:</strong> ${formatOrderChannelLabel(contactChannel)}</p>`,
    deliveryLabel ? `<p><strong>Entrega:</strong> ${deliveryLabel}</p>` : '',
    address ? `<p><strong>Direccion:</strong> ${address}</p>` : '',
    customer?.phone ? `<p><strong>Telefono:</strong> ${customer.phone}</p>` : '',
    includeBilling ? `<p><strong>Razon social:</strong> ${billing.businessName || '-'}</p>` : '',
    includeBilling ? `<p><strong>Facturacion direccion:</strong> ${billing.address || '-'}</p>` : '',
    includeBilling ? `<p><strong>Facturacion localidad:</strong> ${billing.city || '-'}</p>` : '',
    includeBilling ? `<p><strong>Tipo de IVA:</strong> ${formatBillingVatLabel(billing.vatType)}</p>` : '',
    includeBilling ? `<p><strong>${formatBillingDocumentLabel(billing.documentType)}:</strong> ${billing.documentNumber || '-'}</p>` : '',
    '</div>',
    '<p><strong>Productos</strong></p>',
    `<ul>${htmlItems}</ul>`,
    '<div style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:12px;">',
    `<p>Subtotal: <strong>${formatOrderAmount(subtotal, currency)}</strong></p>`,
    `<p>Envio: <strong>${formatOrderAmount(shipping, currency)}</strong></p>`,
    `<p>Impuestos: <strong>${formatOrderAmount(tax, currency)}</strong></p>`,
    `<p>Total: <strong>${formatOrderAmount(total, currency)}</strong></p>`,
    '</div>',
    `<p>${normalizedStatus === 'paid' ? `Gracias por confiar en ${companyName}.` : `Quedamos a disposicion para ayudarte desde ${companyName}.`}</p>`,
  ].join('');

  const delivery = await sendSmtpEmail({
    to: recipient,
    subject,
    text: textBody,
    html: htmlBody,
    logPrefix: normalizedStatus === 'paid' ? 'order-payment-approved' : 'order-payment-cancelled',
  });
  return {
    ...delivery,
    email: recipient,
    subject,
  };
}

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

    await client.query('BEGIN');

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
