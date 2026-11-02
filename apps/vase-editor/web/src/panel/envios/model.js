// Envíos del panel nuevo sobre la configuración de siempre (commerce.branches y commerce.shipping_zones).
// Los tramos por distancia son zonas `distance` encadenadas; las zonas especiales son zonas con
// polígono, que el servidor revisa primero (por eso su precio gana). Las demás zonas se dejan como están.

const num = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const isDistanceZone = (zone) => String(zone?.type || '').toLowerCase() === 'distance';
export const isSpecialZone = (zone) => !isDistanceZone(zone) && Array.isArray(zone?.polygon) && zone.polygon.length >= 3;

export const branchLocated = (branch) => Number.isFinite(Number(branch?.latitude)) && Number.isFinite(Number(branch?.longitude))
    && branch.latitude !== null && branch.longitude !== null && branch.latitude !== '' && branch.longitude !== '';

// Zonas por distancia → tramos ordenados "hasta X km".
export function zonesToTiers(zones = []) {
    return zones
        .filter(isDistanceZone)
        .filter((zone) => zone.enabled !== false)
        .map((zone) => ({
            id: zone.id,
            max_km: zone.max_distance_km === null || zone.max_distance_km === undefined || zone.max_distance_km === '' ? null : num(zone.max_distance_km),
            price: num(zone.price),
            per_km: zone.distance_pricing_mode === 'per_km' ? num(zone.price_per_km) : 0,
        }))
        .sort((a, b) => (a.max_km ?? Infinity) - (b.max_km ?? Infinity));
}

// Tramos → zonas por distancia, cada una empieza donde termina la anterior.
export function tiersToZones(tiers = []) {
    const sorted = [...tiers].sort((a, b) => (a.max_km ?? Infinity) - (b.max_km ?? Infinity));
    let previous = 0;
    return sorted.map((tier, index) => {
        const zone = {
            id: tier.id || `ring-${index + 1}`,
            name: tier.max_km === null ? `Más de ${previous} km` : `Hasta ${tier.max_km} km`,
            description: '',
            type: 'distance',
            enabled: true,
            price: num(tier.price),
            distance_pricing_mode: tier.per_km > 0 ? 'per_km' : 'fixed',
            price_per_km: num(tier.per_km),
            branch_id: null,
            min_distance_km: previous,
            max_distance_km: tier.max_km,
        };
        if (tier.max_km !== null) previous = tier.max_km;
        return zone;
    });
}

// Reemplaza solo los tramos y las zonas especiales; el resto de las zonas queda igual.
export function mergeShippingZones(zones = [], tiers = [], specials = []) {
    const others = zones.filter((zone) => !isDistanceZone(zone) && !isSpecialZone(zone));
    return [...others, ...tiersToZones(tiers), ...specials];
}

export function tiersError(tiers = []) {
    const seen = new Set();
    for (const tier of tiers) {
        if (tier.max_km !== null && !(num(tier.max_km, -1) > 0)) return 'Cada tramo necesita los km';
        if (num(tier.price, -1) < 0) return 'El precio no puede ser negativo';
        const key = tier.max_km ?? 'sin-limite';
        if (seen.has(key)) return 'Hay dos tramos con la misma distancia';
        seen.add(key);
    }
    if (tiers.filter((tier) => tier.max_km === null).length > 1) return 'Solo puede haber un tramo sin límite';
    return null;
}

// Rectángulo de un lugar buscado (boundingbox de OpenStreetMap: [sur, norte, oeste, este]).
export function polygonFromBoundingBox(box) {
    const [south, north, west, east] = (box || []).map(Number);
    if (![south, north, west, east].every(Number.isFinite)) return [];
    return [
        { lat: north, lng: west },
        { lat: north, lng: east },
        { lat: south, lng: east },
        { lat: south, lng: west },
    ];
}

// Qué le pasa a un cliente según a cuántos km está (para el simulador del mapa).
export function quoteForDistance(tiers = [], km) {
    let previous = 0;
    for (const tier of [...tiers].sort((a, b) => (a.max_km ?? Infinity) - (b.max_km ?? Infinity))) {
        const max = tier.max_km ?? Infinity;
        if (km >= previous && km <= max) return { ok: true, price: Math.round((num(tier.price) + num(tier.per_km) * km) * 100) / 100 };
        previous = max;
    }
    return { ok: false };
}
