// Cómo le llegan los pedidos a la tienda (Ajustes › Pagos del panel).

/**
 * true si la tienda vende "Solo por WhatsApp" y tiene número cargado: el cliente arma el carrito y manda
 * el pedido por WhatsApp, sin crear cuenta ni pagar por la web (el pago se coordina en el chat).
 */
export function isWhatsappOnlyStore(commerce = {}) {
    const channels = Array.isArray(commerce?.order_channels) ? commerce.order_channels : [];
    const onlyWhatsapp = channels.length > 0 && channels.every((channel) => String(channel).trim().toLowerCase() === 'whatsapp');
    return onlyWhatsapp && Boolean(String(commerce?.whatsapp_number || '').replace(/\D/g, ''));
}
