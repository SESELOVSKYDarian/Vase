// Ofertas y cambio de precios del Catálogo: textos y armado de lo que se manda al servidor.
import { formatMoney } from '../format.js';

export const OFFER_KIND_LABEL = { percent: '% de descuento', amount: '$ de descuento', fixed: 'Precio fijo' };

export const offerKind = (offer) => (['percent', 'amount', 'fixed'].includes(offer?.kind) ? offer.kind : 'percent');

export function offerValue(offer) {
    const value = Number(offer?.value || 0);
    if (offerKind(offer) === 'percent' && !(value > 0)) return Number(offer?.percent || 0);
    return value;
}

// "-15%", "-$3.000" o "$9.000"
export function offerBadge(offer) {
    const kind = offerKind(offer);
    const value = offerValue(offer);
    if (kind === 'percent') return `-${String(value).replace(/\.0+$/, '')}%`;
    if (kind === 'amount') return `-${formatMoney(value)}`;
    return formatMoney(value);
}

const dateOnly = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export function offerState(offer, now = new Date()) {
    if (!offer.enabled) return { label: 'Pausada', tone: '' };
    if (offer.ends_at && now > new Date(offer.ends_at)) return { label: 'Terminó', tone: '' };
    if (offer.starts_at && now < new Date(offer.starts_at)) return { label: 'Programada', tone: 'b' };
    return { label: 'Activa', tone: 'g' };
}

// A quién y a qué se aplica, en una frase.
export function offerScope(offer, { categories = [], products = [], clients = [] } = {}) {
    const name = (list, id) => list.find((item) => item.id === id)?.name;
    const what = (offer.product_ids || []).length
        ? (offer.product_ids.length === 1 ? name(products, offer.product_ids[0]) || '1 producto' : `${offer.product_ids.length} productos`)
        : (offer.category_ids || []).length
            ? (offer.category_ids.length === 1 ? name(categories, offer.category_ids[0]) || '1 categoría' : `${offer.category_ids.length} categorías`)
            : 'Todo el catálogo';
    const who = (offer.user_ids || []).length
        ? (offer.user_ids.length === 1 ? clients.find((c) => c.id === offer.user_ids[0])?.name || clients.find((c) => c.id === offer.user_ids[0])?.email || '1 cliente' : `${offer.user_ids.length} clientes`)
        : 'todos los clientes';
    return `${what} · ${who}`;
}

export function offerToDraft(offer = {}) {
    return {
        name: offer.name || '',
        label: offer.label || 'Oferta',
        kind: offerKind(offer),
        value: offer.id ? String(offerValue(offer)) : '',
        enabled: offer.enabled !== false,
        target: (offer.product_ids || []).length ? 'products' : (offer.category_ids || []).length ? 'categories' : 'all',
        product_ids: offer.product_ids || [],
        category_ids: offer.category_ids || [],
        audience: (offer.user_ids || []).length ? 'clients' : 'all',
        user_ids: offer.user_ids || [],
        starts_at: dateOnly(offer.starts_at),
        ends_at: dateOnly(offer.ends_at),
    };
}

const parseAmount = (text) => Number(String(text || '').replace(/\$/g, '').replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));

export function draftToOfferPayload(draft) {
    return {
        name: draft.name.trim(),
        label: draft.label.trim() || 'Oferta',
        kind: draft.kind,
        value: parseAmount(draft.value),
        enabled: draft.enabled,
        product_ids: draft.target === 'products' ? draft.product_ids : [],
        category_ids: draft.target === 'categories' ? draft.category_ids : [],
        user_ids: draft.audience === 'clients' ? draft.user_ids : [],
        // Fechas en hora local: empieza a las 00:00 y termina a las 23:59.
        starts_at: draft.starts_at ? new Date(`${draft.starts_at}T00:00:00`).toISOString() : null,
        ends_at: draft.ends_at ? new Date(`${draft.ends_at}T23:59:59`).toISOString() : null,
    };
}

export function offerDraftError(draft) {
    const value = parseAmount(draft.value);
    if (!draft.name.trim()) return 'Ponele un nombre';
    if (!(value > 0)) return 'Indicá cuánto descuenta';
    if (draft.kind === 'percent' && value > 100) return 'El porcentaje no puede pasar de 100';
    if (draft.target === 'products' && !draft.product_ids.length) return 'Elegí al menos un producto';
    if (draft.target === 'categories' && !draft.category_ids.length) return 'Elegí al menos una categoría';
    if (draft.audience === 'clients' && !draft.user_ids.length) return 'Elegí al menos un cliente';
    if (draft.starts_at && draft.ends_at && draft.starts_at > draft.ends_at) return 'La fecha de fin es antes del inicio';
    return null;
}

// Cambiar precios: la frase arma el pedido al servidor.
export function bulkPricePayload({ mode, amount, unit, field, scope, scopeId }, apply = false) {
    return {
        mode,
        amount: parseAmount(amount),
        unit: mode === 'set' ? 'amount' : unit,
        field,
        category_id: scope === 'category' ? scopeId || null : null,
        brand: scope === 'brand' ? scopeId || null : null,
        apply,
    };
}

export function bulkPriceError({ mode, amount, unit, scope, scopeId }) {
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value < 0 || (mode !== 'set' && value === 0)) return 'Escribí un número';
    if (mode === 'lower' && unit === 'percent' && value >= 100) return 'No se puede bajar 100% o más';
    if (scope !== 'all' && !scopeId) return scope === 'brand' ? 'Elegí una marca' : 'Elegí una categoría';
    return null;
}
