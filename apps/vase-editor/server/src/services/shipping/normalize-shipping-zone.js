// Parte de shipping.js: DISTANCE_ZONE_TYPE, toNumber, roundMoney, readText, normalizeLatitude, normalizeLongitude y más.

export const DISTANCE_ZONE_TYPE = 'distance';

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function roundMoney(value) {
  return Number(toNumber(value, 0).toFixed(2));
}

export function readText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export function normalizeLatitude(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < -90 || parsed > 90) return null;
  return parsed;
}

export function normalizeLongitude(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < -180 || parsed > 180) return null;
  return parsed;
}

export function normalizePolygonPoint(value) {
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
}

export function normalizeZonePolygon(value) {
  const list = Array.isArray(value) ? value : [];
  const polygon = list.map(normalizePolygonPoint).filter(Boolean);
  return polygon.length >= 3 ? polygon : [];
}

export function hasZonePolygon(zone = {}) {
  return normalizeZonePolygon(zone?.polygon).length >= 3;
}

export function polygonAreaScore(polygon = []) {
  if (polygon.length < 3) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    total += current.lng * next.lat - next.lng * current.lat;
  }
  return Math.abs(total / 2);
}

export function pointInPolygon(point, polygon = []) {
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
}

export function getPolygonCentroid(polygon = []) {
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
      { lat: 0, lng: 0 }
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
}

export function normalizeDistanceValue(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function normalizeDistancePricingMode(value) {
  return String(value || '').trim().toLowerCase() === 'per_km' ? 'per_km' : 'fixed';
}

export function normalizeBranch(entry = {}, index = 0) {
  const id = String(entry.id || '').trim() || `branch-${index + 1}`;
  return {
    id,
    name: String(entry.name || '').trim(),
    address: String(entry.address || '').trim(),
    hours: String(entry.hours || '').trim(),
    phone: String(entry.phone || '').trim(),
    pickup_fee: toNumber(entry.pickup_fee, 0),
    enabled: entry.enabled !== false,
    latitude: normalizeLatitude(entry.latitude ?? entry.lat),
    longitude: normalizeLongitude(entry.longitude ?? entry.lng ?? entry.lon),
  };
}

export function normalizeBranches(settings = {}) {
  const branches = Array.isArray(settings?.branches) ? settings.branches : Array.isArray(settings) ? settings : [];
  return branches
    .map((branch, index) => normalizeBranch(branch, index))
    .filter((branch) => branch.enabled !== false && branch.id);
}

export function normalizeShippingZone(entry = {}, index = 0) {
  const id = String(entry.id || '').trim() || `zone-${index + 1}`;
  const type =
    String(entry.type || entry.pricing_mode || 'flat').trim().toLowerCase() === DISTANCE_ZONE_TYPE
      ? DISTANCE_ZONE_TYPE
      : 'flat';

  const distancePricingMode = normalizeDistancePricingMode(
    entry.distance_pricing_mode ??
      entry.distancePricingMode ??
      entry.distance_pricing ??
      entry.distancePricing
  );

  const polygon =
    type === DISTANCE_ZONE_TYPE
      ? []
      : normalizeZonePolygon(
          entry.polygon ??
            entry.coverage_polygon ??
            entry.coveragePolygon ??
            entry.geometry?.polygon ??
            entry.geometry?.coordinates
        );

  const minDistanceKm = normalizeDistanceValue(entry.min_distance_km ?? entry.minDistanceKm) ?? 0;
  const maxDistanceRaw = normalizeDistanceValue(
    entry.max_distance_km ?? entry.maxDistanceKm ?? entry.radius_km ?? entry.radiusKm
  );

  return {
    id,
    name: String(entry.name || '').trim() || `Zona ${index + 1}`,
    description: String(entry.description || '').trim(),
    price: toNumber(entry.price, 0),
    price_per_km: Math.max(0, toNumber(entry.price_per_km ?? entry.pricePerKm, 0)),
    enabled: entry.enabled !== false,
    type,
    distance_pricing_mode: distancePricingMode,
    branch_id: readText(entry.branch_id ?? entry.branchId ?? entry.origin_branch_id ?? entry.originBranchId),
    polygon,
    coverage_mode:
      type === DISTANCE_ZONE_TYPE ? 'distance' : polygon.length >= 3 ? 'polygon' : 'manual',
    centroid: polygon.length >= 3 ? getPolygonCentroid(polygon) : null,
    min_distance_km: minDistanceKm,
    max_distance_km: maxDistanceRaw != null ? Math.max(maxDistanceRaw, minDistanceKm) : null,
  };
}

export function normalizeShippingZones(settings = {}) {
  const zones = Array.isArray(settings?.shipping_zones)
    ? settings.shipping_zones
    : Array.isArray(settings)
      ? settings
      : null;

  if (zones === null) {
    return [
      {
        id: 'arg-general',
        name: 'Argentina',
        description: 'Cobertura nacional',
        price: toNumber(settings?.shipping_flat, 0),
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
  }

  return zones
    .map((zone, index) => normalizeShippingZone(zone, index))
    .filter((zone) => zone.enabled !== false && zone.id);
}
