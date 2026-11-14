// Textos del pedido: mensaje de WhatsApp, montos y etiquetas.
import { normalizeOrderChannel } from './checkout-options.js';

export function buildWhatsAppMessage(order, template, currency) {
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

export function buildWhatsAppUrl(order, settings = {}, currency = 'ARS') {
  const phone = String(settings?.whatsapp_number || '').replace(/\D/g, '');
  if (!phone) return null;
  const message = buildWhatsAppMessage(order, settings?.whatsapp_template || '', currency);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function formatOrderAmount(value, currency = 'ARS') {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
}

export function formatCheckoutModeLabel(mode = '') {
  const normalized = String(mode || '').toLowerCase();
  if (normalized === 'transfer') return 'Transferencia bancaria';
  if (normalized === 'stripe') return 'Pago online';
  if (normalized === 'cash_on_pickup') return 'Pago en local';
  return normalized || 'Manual';
}

export function formatOrderChannelLabel(channel = '') {
  return normalizeOrderChannel(channel) === 'email' ? 'Gmail' : 'WhatsApp';
}
