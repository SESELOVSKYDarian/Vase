export const DISTANCE_DELIVERY_KEY = 'distance:auto';

export const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Number(toNumber(value, 0).toFixed(2));

const normalizeDistancePricingMode = (value) =>
    String(value || '').trim().toLowerCase() === 'per_km' ? 'per_km' : 'fixed';

const normalizeLatitude = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < -90 || parsed > 90) return null;
    return parsed;
};

const normalizeLongitude = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < -180 || parsed > 180) return null;
    return parsed;
};

const normalizePolygonPoint = (value) => {
    if (Array.isArray(value) && value.length >= 2) {
        const latitude = normalizeLatitude(value[0]);
        const longitude = normalizeLongitude(value[1]);
        if (latitude == null || longitude == null) return null;
        return { lat: latitude, lng: longitude };
    }

    if (!value || typeof value !== 'object') return null;

    const latitude = normalizeLatitude(value.lat ?? value.latitude);
    const longitude = normalizeLongitude(value.lng ?? value.longitude ?? value.lon);
    if (latitude == null || longitude == null) return null;

    return { lat: latitude, lng: longitude };
};

const normalizeZonePolygon = (value) => {
    const list = Array.isArray(value) ? value : [];
    const polygon = list.map(normalizePolygonPoint).filter(Boolean);
    return polygon.length >= 3 ? polygon : [];
};

const polygonAreaScore = (polygon = []) => {
    if (polygon.length < 3) return Number.POSITIVE_INFINITY;
    let total = 0;
    for (let index = 0; index < polygon.length; index += 1) {
        const current = polygon[index];
        const next = polygon[(index + 1) % polygon.length];
        total += current.lng * next.lat - next.lng * current.lat;
    }
    return Math.abs(total / 2);
};

const pointInPolygon = (point, polygon = []) => {
    if (!point || polygon.length < 3) return false;

    const x = Number(point.longitude ?? point.lng);
    const y = Number(point.latitude ?? point.lat);
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
        const xi = polygon[i].lng;
        const yi = polygon[i].lat;
        const xj = polygon[j].lng;
        const yj = polygon[j].lat;

        const intersects =
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;

        if (intersects) inside = !inside;
    }

    return inside;
};

const getPolygonCentroid = (polygon = []) => {
    if (polygon.length < 3) return null;

    let area = 0;
    let latitude = 0;
    let longitude = 0;

    for (let index = 0; index < polygon.length; index += 1) {
        const current = polygon[index];
        const next = polygon[(index + 1) % polygon.length];
        const factor = current.lng * next.lat - next.lng * current.lat;
        area += factor;
        longitude += (current.lng + next.lng) * factor;
        latitude += (current.lat + next.lat) * factor;
    }

    if (Math.abs(area) < Number.EPSILON) {
        const average = polygon.reduce(
            (acc, point) => ({
                lat: acc.lat + point.lat,
                lng: acc.lng + point.lng,
            }),
            { lat: 0, lng: 0 },
        );
        return {
            lat: Number((average.lat / polygon.length).toFixed(6)),
            lng: Number((average.lng / polygon.length).toFixed(6)),
        };
    }

    const areaFactor = area * 0.5;
    return {
        lat: Number((latitude / (6 * areaFactor)).toFixed(6)),
        lng: Number((longitude / (6 * areaFactor)).toFixed(6)),
    };
};

export const hasZonePolygon = (zone = {}) => normalizeZonePolygon(zone?.polygon).length >= 3;

export const normalizeBranches = (source = []) =>
    (Array.isArray(source) ? source : [])
        .map((branch, index) => ({
            id: branch?.id || `branch-${index + 1}`,
            name: branch?.name || `Sucursal ${index + 1}`,
            address: branch?.address || '',
            hours: branch?.hours || '',
            phone: branch?.phone || '',
            pickup_fee: toNumber(branch?.pickup_fee, 0),
            enabled: branch?.enabled !== false,
            latitude: normalizeLatitude(branch?.latitude ?? branch?.lat),
            longitude: normalizeLongitude(branch?.longitude ?? branch?.lng ?? branch?.lon),
        }))
        .filter((branch) => branch.enabled !== false);

export const normalizeShippingZones = (source = [], shippingFlat = 0) => {
    const parsed = (Array.isArray(source) ? source : [])
        .map((zone, index) => {
            const type = String(zone?.type || zone?.pricing_mode || 'flat').trim().toLowerCase() === 'distance'
                ? 'distance'
                : 'flat';
            const distancePricingMode =
                type === 'distance'
                    ? normalizeDistancePricingMode(
                        zone?.distance_pricing_mode ??
                        zone?.distancePricingMode ??
                        zone?.distance_pricing ??
                        zone?.distancePricing,
                    )
                    : 'fixed';
            const polygon = type === 'distance'
                ? []
                : normalizeZonePolygon(
                    zone?.polygon ??
                    zone?.coverage_polygon ??
                    zone?.coveragePolygon ??
                    zone?.geometry?.polygon ??
                    zone?.geometry?.coordinates,
                );

            return {
                id: zone?.id || `zone-${index + 1}`,
                name: zone?.name || `Zona ${index + 1}`,
                description: zone?.description || '',
                price: toNumber(zone?.price, 0),
                price_per_km: type === 'distance' ? Math.max(0, toNumber(zone?.price_per_km ?? zone?.pricePerKm, 0)) : 0,
                enabled: zone?.enabled !== false,
                type,
                distance_pricing_mode: distancePricingMode,
                branch_id: String(zone?.branch_id || zone?.branchId || '').trim() || null,
                polygon,
                coverage_mode:
                    type === 'distance'
                        ? 'distance'
                        : polygon.length >= 3
                            ? 'polygon'
                            : 'manual',
                centroid: polygon.length >= 3 ? getPolygonCentroid(polygon) : null,
                min_distance_km: type === 'distance' ? Math.max(0, toNumber(zone?.min_distance_km ?? zone?.minDistanceKm, 0)) : 0,
                max_distance_km: type === 'distance'
                    ? (() => {
                        const raw = zone?.max_distance_km ?? zone?.maxDistanceKm ?? zone?.radius_km ?? zone?.radiusKm;
                        const parsedValue = Number(raw);
                        return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
                    })()
                    : null,
            };
        })
        .filter((zone) => zone.enabled !== false);

    if (parsed.length) return parsed;

    return [
        {
            id: 'arg-general',
            name: 'Argentina',
            description: 'Cobertura nacional',
            price: toNumber(shippingFlat, 0),
            price_per_km: 0,
            enabled: true,
            type: 'flat',
            distance_pricing_mode: 'fixed',
            branch_id: null,
            polygon: [],
            coverage_mode: 'manual',
            centroid: null,
            min_distance_km: 0,
            max_distance_km: null,
        },
    ];
};

export const haversineKm = (from, to) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const deltaLat = toRad(to.latitude - from.latitude);
    const deltaLng = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);

    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getEligibleBranches = ({ branches = [], preferredBranchId = null, lockedBranchId = null }) => {
    const withCoordinates = branches.filter((branch) => branch.latitude != null && branch.longitude != null);
    if (lockedBranchId) {
        return withCoordinates.filter((branch) => branch.id === lockedBranchId);
    }
    if (preferredBranchId) {
        const preferred = withCoordinates.filter((branch) => branch.id === preferredBranchId);
        if (preferred.length) return preferred;
    }
    return withCoordinates;
};

const findNearestBranch = ({ branches = [], location = null, preferredBranchId = null, lockedBranchId = null }) => {
    const eligibleBranches = getEligibleBranches({ branches, preferredBranchId, lockedBranchId });
    if (!eligibleBranches.length) return null;
    if (location?.latitude == null || location?.longitude == null) {
        return { branch: eligibleBranches[0], distanceKm: null };
    }

    return eligibleBranches
        .map((branch) => ({
            branch,
            distanceKm: haversineKm(location, {
                latitude: branch.latitude,
                longitude: branch.longitude,
            }),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)[0];
};

const findBranchForZone = (zone, branches, location = null, preferredBranchId = null) =>
    findNearestBranch({
        branches,
        location,
        preferredBranchId,
        lockedBranchId: zone?.branch_id || null,
    })?.branch || null;

const getDistanceZonePrice = (zone, distanceKm) => {
    const basePrice = toNumber(zone?.price, 0);
    const pricePerKm = Math.max(0, toNumber(zone?.price_per_km, 0));
    if (zone?.distance_pricing_mode === 'per_km') {
        return roundMoney(basePrice + Math.max(0, toNumber(distanceKm, 0)) * pricePerKm);
    }
    return roundMoney(basePrice);
};

export const resolveFixedZoneQuote = ({ shippingZones = [], branches = [], location = null, preferredBranchId = null }) => {
    if (location?.latitude == null || location?.longitude == null) {
        return { error: 'shipping_location_required' };
    }

    const fixedZones = shippingZones
        .filter((zone) => zone.type !== 'distance' && hasZonePolygon(zone))
        .filter((zone) => !preferredBranchId || !zone.branch_id || zone.branch_id === preferredBranchId);

    const matches = fixedZones
        .filter((zone) => pointInPolygon(location, zone.polygon))
        .map((zone) => ({
            zone,
            branch: findBranchForZone(zone, branches, location, preferredBranchId),
            price: toNumber(zone.price, 0),
            areaScore: polygonAreaScore(zone.polygon),
        }))
        .sort((a, b) => a.areaScore - b.areaScore);

    if (!matches.length) {
        return { error: 'delivery_out_of_range' };
    }

    const best = matches[0];
    return {
        ok: true,
        zone: best.zone,
        branch: best.branch,
        distance_km: null,
        price: best.price,
        match_type: 'polygon',
    };
};

export const resolveDistanceQuote = ({ shippingZones = [], branches = [], location = null, preferredBranchId = null }) => {
    if (location?.latitude == null || location?.longitude == null) {
        return { error: 'shipping_location_required' };
    }

    const hasFixedLocationZones = shippingZones.some(
        (zone) => zone.type !== 'distance' && hasZonePolygon(zone),
    );

    const fixedZoneQuote = resolveFixedZoneQuote({
        shippingZones,
        branches,
        location,
        preferredBranchId,
    });

    if (fixedZoneQuote?.ok) {
        return fixedZoneQuote;
    }

    const distanceZones = shippingZones.filter((zone) => zone.type === 'distance');
    if (!distanceZones.length) {
        return { error: hasFixedLocationZones ? 'delivery_out_of_range' : 'location_shipping_not_configured' };
    }

    const candidateZones = preferredBranchId
        ? distanceZones.filter((zone) => !zone.branch_id || zone.branch_id === preferredBranchId)
        : distanceZones;

    const matches = candidateZones
        .map((zone) => {
            const nearestBranch = findNearestBranch({
                branches,
                location,
                preferredBranchId,
                lockedBranchId: zone?.branch_id || null,
            });
            if (!nearestBranch?.branch) return null;

            const branch = nearestBranch.branch;
            const distanceKm = nearestBranch.distanceKm;

            const withinMin = distanceKm >= Number(zone.min_distance_km || 0);
            const withinMax = zone.max_distance_km == null || distanceKm <= Number(zone.max_distance_km);
            if (!withinMin || !withinMax) return null;

            return {
                zone,
                branch,
                distance_km: Number(distanceKm.toFixed(2)),
                price: getDistanceZonePrice(zone, distanceKm),
                pricing_mode: zone.distance_pricing_mode || 'fixed',
                base_price: toNumber(zone.price, 0),
                price_per_km: Math.max(0, toNumber(zone.price_per_km, 0)),
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
            const aMax = a.zone.max_distance_km == null ? Number.POSITIVE_INFINITY : a.zone.max_distance_km;
            const bMax = b.zone.max_distance_km == null ? Number.POSITIVE_INFINITY : b.zone.max_distance_km;
            return aMax - bMax;
        });

    if (!matches.length) {
        const hasOrigin = candidateZones.some((zone) => {
            return Boolean(
                findNearestBranch({
                    branches,
                    location,
                    preferredBranchId,
                    lockedBranchId: zone?.branch_id || null,
                })?.branch,
            );
        });
        return { error: hasOrigin ? 'delivery_out_of_range' : 'shipping_origin_not_configured' };
    }

    const best = matches[0];
    return {
        ok: true,
        zone: best.zone,
        branch: best.branch,
        distance_km: best.distance_km,
        price: best.price,
        pricing_mode: best.pricing_mode,
        base_price: best.base_price,
        price_per_km: best.price_per_km,
        match_type: 'distance',
    };
};
