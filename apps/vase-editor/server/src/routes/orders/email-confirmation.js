// Mail de confirmación del pedido para el cliente.
import { normalizeDisplayName, normalizeEmailInput, sendSmtpEmail } from '../../services/mailer.js';
import { formatCheckoutModeLabel, formatOrderAmount, formatOrderChannelLabel } from './order-labels.js';
import { formatBillingDocumentLabel, formatBillingVatLabel, hasBillingInfo, normalizeBillingInfo } from './billing.js';
import { applyOrderTemplate, buildOrderTemplateVars } from './order-templates.js';

export async function sendOrderConfirmationEmail({
  tenantId,
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
    tenantId,
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
