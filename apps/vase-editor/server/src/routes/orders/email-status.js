// Mail al cliente cuando cambia el estado de su pedido.
import { normalizeDisplayName, normalizeEmailInput, sendSmtpEmail } from '../../services/mailer.js';
import { formatCheckoutModeLabel, formatOrderAmount, formatOrderChannelLabel } from './order-labels.js';
import { formatBillingDocumentLabel, formatBillingVatLabel, hasBillingInfo, normalizeBillingInfo } from './billing.js';
import { applyOrderTemplate, buildOrderTemplateVars } from './order-templates.js';

export async function sendCustomerOrderStatusEmail({
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
    tenantId,
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
