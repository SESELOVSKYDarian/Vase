export const PRICE_TIER_SLOT_COUNT = 10;

export function getDefaultPriceTierLabel(slot) {
    const safeSlot = Number(slot);
    if (safeSlot === 1) return 'Minorista';
    if (safeSlot === 2) return 'Mayorista';
    return `Precio ${safeSlot}`;
}

export function normalizePriceTierLabels(rawLabels = {}) {
    const source = rawLabels && typeof rawLabels === 'object' ? rawLabels : {};
    const labels = {};

    for (let slot = 1; slot <= PRICE_TIER_SLOT_COUNT; slot += 1) {
        const key = `price_${slot}`;
        const value = String(source[key] || '').trim();
        labels[key] = value || getDefaultPriceTierLabel(slot);
    }

    return labels;
}
