// Ajustes: por dónde llega el pedido (commerce.order_channels).
export function channelChoice(channels) {
    const list = Array.isArray(channels) && channels.length ? channels : ['whatsapp', 'email'];
    if (list.includes('whatsapp') && list.includes('email')) return 'both';
    return list.includes('whatsapp') ? 'whatsapp' : 'email';
}

// Prender o apagar una forma de pago sin dejar la tienda sin ninguna (devuelve la misma lista si no se puede).
export function paymentMethodsToggle(methods, method) {
    const list = Array.isArray(methods) ? methods : [];
    if (list.includes(method)) return list.length <= 1 ? list : list.filter((item) => item !== method);
    return [...list, method];
}

// El IVA se guarda como fracción (0.21) y se muestra como porcentaje (21).
export const taxPercent = (rate) => {
    const value = Number(rate || 0);
    return Number.isFinite(value) ? String(Math.round(value * 10000) / 100) : '0';
};

export const taxRateFromPercent = (text) => {
    const value = Number(String(text ?? '').trim().replace(',', '.') || 0);
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.round(Math.min(value, 100) * 100) / 10000;
};

// Ejemplo del mensaje que arma el carrito para WhatsApp.
export const whatsappPreview = (storeName = 'la tienda') => `Hola ${storeName || 'la tienda'}, quiero hacer este pedido: • 2 × Producto de ejemplo • 1 × Otro producto. Total: $45.000 · Pedido #1044`;

// Contador de letras para Google: "52 de 60 letras".
export const seoLimit = (text, max) => {
    const count = String(text || '').length;
    return { count, over: count > max, text: `${count} de ${max} letras` };
};

// Suma una palabra clave sin repetir (sin importar mayúsculas).
export function keywordsAdd(words = [], word = '') {
    const value = String(word || '').trim();
    if (!value || words.some((item) => item.toLowerCase() === value.toLowerCase())) return words;
    return [...words, value];
}

// Productos que llegan del sistema de gestión: cuántos, la última vez y cuántos hay que revisar.
export function erpStats(products = []) {
    const synced = products.filter((product) => product?.external_id);
    let last = null;
    for (const product of synced) {
        const at = product.last_sync_at ? new Date(product.last_sync_at) : null;
        if (at && !Number.isNaN(at.getTime()) && (!last || at > last)) last = at;
    }
    return { total: synced.length, lastSync: last, toReview: synced.filter((product) => product.sync_status && product.sync_status !== 'synced').length };
}
