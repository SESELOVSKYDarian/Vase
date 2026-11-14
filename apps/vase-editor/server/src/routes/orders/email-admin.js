// Mail de aviso de pedido nuevo para el dueño de la tienda.
import { normalizeEmailInput, sendSmtpEmail } from '../../services/mailer.js';
import { formatOrderAmount } from './order-labels.js';
import { formatBillingDocumentLabel, formatBillingVatLabel, hasBillingInfo, normalizeBillingInfo } from './billing.js';
import { applyOrderTemplate, buildOrderTemplateVars } from './order-templates.js';

export async function sendAdminOrderNotificationEmail({
  tenantId,
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
    tenantId,
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
