// Ajustes: por dónde llega el pedido (commerce.order_channels).
export function channelChoice(channels) {
    const list = Array.isArray(channels) && channels.length ? channels : ['whatsapp', 'email'];
    if (list.includes('whatsapp') && list.includes('email')) return 'both';
    return list.includes('whatsapp') ? 'whatsapp' : 'email';
}
