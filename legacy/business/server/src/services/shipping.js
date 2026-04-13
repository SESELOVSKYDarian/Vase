const DISTANCE_ZONE_TYPE = 'distance';

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Number(toNumber(value, 0).toFixed(2));
}

function readText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeLatitude(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < -90 || parsed > 90) return null;
  return parsed;
}

function normalizeLongitude(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < -180 || parsed > 180) return null;
  return parsed;
}

function normalizePolygonPoint(value) {
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

function normalizeZonePolygon(value) {
  const list = Array.isArray(value) ? value : [];
  const polygon = list.map(normalizePolygonPoint).filter(Boolean);
  return polygon.length >= 3 ? polygon : [];
}

function hasZonePolygon(zone = {}) {
  return normalizeZonePolygon(zone?.polygon).length >= 3;
}

function polygonAreaScore(polygon = []) {
  if (polygon.length < 3) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    total += current.lng * next.lat - next.lng * current.lat;
  }
  return Math.abs(total / 2);
}

function pointInPolygon(point, polygon = []) {
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

function getPolygonCentroid(polygon = []) {
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

function normalizeDistanceValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function normalizeDistancePricingMode(value) {
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
  const type = String(entry.type || entry.pricing_mode || 'flat').trim().toLowerCase() === DISTANCE_ZONE_TYPE
    ? DISTANCE_ZONE_TYPE
    : 'flat';
  const distancePricingMode = type === DISTANCE_ZONE_TYPE
    ? normalizeDistancePricingMode(
        entry.distance_pricing_mode ??
        entry.distancePricingMode ??
        entry.distance_pricing ??
        entry.distancePricing
      )
    : 'fixed';
  const polygon = type === DISTANCE_ZONE_TYPE
    ? []
    : normalizeZonePolygon(
        entry.polygon ??
          entry.coverage_polygon ??
          entry.coveragePolygon ??
          entry.geometry?.polygon ??
          entry.geometry?.coordinates
      );
  const minDistanceKm = type === DISTANCE_ZONE_TYPE
    ? normalizeDistanceValue(entry.min_distance_km ?? entry.minDistanceKm) ?? 0
    : 0;
  const maxDistanceRaw = type === DISTANCE_ZONE_TYPE
    ? normalizeDistanceValue(entry.max_distance_km ?? entry.maxDistanceKm ?? entry.radius_km ?? entry.radiusKm)
    : null;

  return {
    id,
    name: String(entry.name || '').trim() || `Zona ${index + 1}`,
    description: String(entry.description || '').trim(),
    price: toNumber(entry.price, 0),
    price_per_km: type === DISTANCE_ZONE_TYPE ? Math.max(0, toNumber(entry.price_per_km ?? entry.pricePerKm, 0)) : 0,
    enabled: entry.enabled !== false,
    type,
    distance_pricing_mode: distancePricingMode,
    branch_id: readText(entry.branch_id ?? entry.branchId ?? entry.origin_branch_id ?? entry.originBranchId),
    polygon,
    coverage_mode:
      type === DISTANCE_ZONE_TYPE ? 'distance' : polygon.length >= 3 ? 'polygon' : 'manual',
    centroid: polygon.length >= 3 ? getPolygonCentroid(polygon) : null,
    min_distance_km: minDistanceKm,
    max_distance_km:
      type === DISTANCE_ZONE_TYPE && maxDistanceRaw != null
        ? Math.max(maxDistanceRaw, minDistanceKm)
        : null,
  };
}

export function normalizeShippingZones(settings = {}) {
  const zones = Array.isArray(settings?.shipping_zones)
    ? settings.shipping_zones
    : Array.isArray(settings)
      ? settings
      : [];

  const parsed = zones
    .map((zone, index) => normalizeShippingZone(zone, index))
    .filter((zone) => zone.enabled !== false && zone.id);

  if (parsed.length) return parsed;

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

function readCustomerLocation(customer = {}) {
  const source = customer?.shipping_location || customer?.shippingLocation || customer?.location || {};
  const latitude = normalizeLatitude(
    source.latitude ??
      source.lat ??
      customer.shipping_latitude ??
      customer.shippingLatitude ??
      customer.latitude ??
      customer.lat
  );
  const longitude = normalizeLongitude(
    source.longitude ??
      source.lng ??
      source.lon ??
      customer.shipping_longitude ??
      customer.shippingLongitude ??
      customer.longitude ??
      customer.lng ??
      customer.lon
  );

  if (latitude == null || longitude == null) {
    return null;
  }

  return { latitude, longitude };
}

function haversineKm(from, to) {
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
}

function getEligibleBranches(branches = [], preferredBranchId = null, lockedBranchId = null) {
  const withCoordinates = branches.filter((branch) => branch.latitude != null && branch.longitude != null);
  if (lockedBranchId) {
    return withCoordinates.filter((branch) => branch.id === lockedBranchId);
  }
  if (preferredBranchId) {
    const preferred = withCoordinates.filter((branch) => branch.id === preferredBranchId);
    if (preferred.length) return preferred;
  }
  return withCoordinates;
}

function findNearestBranch(branches = [], location = null, options = {}) {
  const eligibleBranches = getEligibleBranches(
    branches,
    readText(options.preferredBranchId),
    readText(options.lockedBranchId)
  );
  if (!eligibleBranches.length) return null;
  if (!location) {
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
}

function findBranchForZone(zone, branches, location = null, preferredBranchId = null) {
  if (!zone) return null;
  const nearest = findNearestBranch(branches, location, {
    preferredBranchId,
    lockedBranchId: zone.branch_id,
  });
  return nearest?.branch || null;
}

function getDistanceZoneAmount(zone, distanceKm) {
  const basePrice = toNumber(zone?.price, 0);
  const pricePerKm = Math.max(0, toNumber(zone?.price_per_km, 0));
  if (zone?.distance_pricing_mode === 'per_km') {
    return roundMoney(basePrice + Math.max(0, toNumber(distanceKm, 0)) * pricePerKm);
  }
  return roundMoney(basePrice);
}

export function resolveFixedShippingQuote(settings = {}, customer = {}, options = {}) {
  const shippingZones = normalizeShippingZones(settings).filter(
    (zone) => zone.type !== DISTANCE_ZONE_TYPE && hasZonePolygon(zone)
  );
  if (!shippingZones.length) {
    return { error: 'location_shipping_not_configured' };
  }

  const location = readCustomerLocation(customer);
  if (!location) {
    return { error: 'shipping_location_required' };
  }

  const branches = normalizeBranches(settings);
  const preferredBranchId = readText(options.preferredBranchId ?? options.branchId);
  const candidateZones = preferredBranchId
    ? shippingZones.filter((zone) => !zone.branch_id || zone.branch_id === preferredBranchId)
    : shippingZones;

  const matches = candidateZones
    .filter((zone) => pointInPolygon(location, zone.polygon))
    .map((zone) => ({
      zone,
      branch: findBranchForZone(zone, branches, location, preferredBranchId),
      amount: toNumber(zone.price, 0),
      areaScore: polygonAreaScore(zone.polygon),
    }))
    .sort((a, b) => a.areaScore - b.areaScore);

  if (!matches.length) {
    return { error: 'delivery_out_of_range' };
  }

  const best = matches[0];
  return {
    ok: true,
    amount: best.amount,
    shipping_zone_id: best.zone.id,
    shipping_zone_type: best.zone.type,
    branch_id: best.branch?.id || null,
    distance_km: null,
    zone: best.zone,
    branch: best.branch || null,
    location,
    match_type: 'polygon',
  };
}

export function resolveDistanceShippingQuote(settings = {}, customer = {}, options = {}) {
  const location = readCustomerLocation(customer);
  if (!location) {
    return { error: 'shipping_location_required' };
  }

  const hasFixedLocationZones = normalizeShippingZones(settings).some(
    (zone) => zone.type !== DISTANCE_ZONE_TYPE && hasZonePolygon(zone)
  );

  const fixedZoneQuote = resolveFixedShippingQuote(settings, customer, options);
  if (fixedZoneQuote?.ok) {
    return fixedZoneQuote;
  }

  const shippingZones = normalizeShippingZones(settings).filter((zone) => zone.type === DISTANCE_ZONE_TYPE);
  if (!shippingZones.length) {
    return { error: hasFixedLocationZones ? 'delivery_out_of_range' : 'location_shipping_not_configured' };
  }

  const branches = normalizeBranches(settings);
  const preferredBranchId = readText(options.preferredBranchId ?? options.branchId);
  const candidateZones = preferredBranchId
    ? shippingZones.filter((zone) => !zone.branch_id || zone.branch_id === preferredBranchId)
    : shippingZones;

  const matches = candidateZones
    .map((zone) => {
      const nearestBranch = findNearestBranch(branches, location, {
        preferredBranchId,
        lockedBranchId: zone.branch_id,
      });
      if (!nearestBranch?.branch) {
        return null;
      }
      const branch = nearestBranch.branch;

      const distanceKm = nearestBranch.distanceKm;

      const withinMin = distanceKm >= Number(zone.min_distance_km || 0);
      const withinMax = zone.max_distance_km == null || distanceKm <= Number(zone.max_distance_km);
      if (!withinMin || !withinMax) {
        return null;
      }

      return {
        zone,
        branch,
        distance_km: Number(distanceKm.toFixed(2)),
        amount: getDistanceZoneAmount(zone, distanceKm),
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
    const hasConfiguredOrigins = candidateZones.some((zone) => {
      return Boolean(
        findNearestBranch(branches, location, {
          preferredBranchId,
          lockedBranchId: zone.branch_id,
        })?.branch
      );
    });

    if (!hasConfiguredOrigins) {
      return { error: 'shipping_origin_not_configured' };
    }

    return { error: 'delivery_out_of_range' };
  }

  const best = matches[0];
  return {
    ok: true,
    amount: best.amount,
    shipping_zone_id: best.zone.id,
    shipping_zone_type: best.zone.type,
    branch_id: best.branch.id,
    distance_km: best.distance_km,
    pricing_mode: best.pricing_mode,
    base_price: best.base_price,
    price_per_km: best.price_per_km,
    zone: best.zone,
    branch: best.branch,
    location,
    match_type: 'distance',
  };
}

export function resolveShippingAmount(settings = {}, customer = {}) {
  const deliveryRaw = String(customer?.delivery_method || customer?.deliveryMethod || '').trim();
  const shippingZones = normalizeShippingZones(settings);
  const branches = normalizeBranches(settings);

  if (deliveryRaw === 'distance:auto' || deliveryRaw === 'location:auto') {
    return resolveDistanceShippingQuote(settings, customer, {
      preferredBranchId: customer?.branch_id || customer?.branchId || customer?.shipping_location?.branch_id,
    });
  }

  if (deliveryRaw.startsWith('zone:')) {
    const zoneId = deliveryRaw.slice(5);
    const zone = shippingZones.find((entry) => entry.id === zoneId);
    if (zone) {
      if (zone.type === DISTANCE_ZONE_TYPE) {
        return resolveDistanceShippingQuote(settings, customer, {
          preferredBranchId: zone.branch_id,
        });
      }
      return {
        ok: true,
        amount: zone.price,
        shipping_zone_id: zone.id,
        shipping_zone_type: zone.type,
        branch_id: null,
        distance_km: null,
      };
    }
  }

  if (deliveryRaw.startsWith('branch:')) {
    const branchId = deliveryRaw.slice(7);
    const branch = branches.find((entry) => entry.id === branchId);
    if (branch) {
      return {
        ok: true,
        amount: branch.pickup_fee,
        shipping_zone_id: null,
        shipping_zone_type: 'pickup',
        branch_id: branch.id,
        distance_km: null,
      };
    }
  }

  if (deliveryRaw === 'mdp' || deliveryRaw === 'necochea') {
    return {
      ok: true,
      amount: 0,
      shipping_zone_id: null,
      shipping_zone_type: 'pickup',
      branch_id: deliveryRaw,
      distance_km: null,
    };
  }

  const fallbackZone = shippingZones.find((zone) => zone.type !== DISTANCE_ZONE_TYPE) || shippingZones[0];
  if (fallbackZone?.type === DISTANCE_ZONE_TYPE) {
    return resolveDistanceShippingQuote(settings, customer, {
      preferredBranchId: fallbackZone.branch_id,
    });
  }

  return {
    ok: true,
    amount: toNumber(fallbackZone?.price, toNumber(settings?.shipping_flat, 0)),
    shipping_zone_id: fallbackZone?.id || null,
    shipping_zone_type: fallbackZone?.type || 'flat',
    branch_id: null,
    distance_km: null,
  };
}
