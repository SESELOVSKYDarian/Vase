// Parte de shipping.js: readCustomerLocation, haversineKm, getEligibleBranches, findNearestBranch, findBranchForZone, getShippingBreakdown y más.
import { DISTANCE_ZONE_TYPE, hasZonePolygon, normalizeBranches, normalizeLatitude, normalizeLongitude, normalizeShippingZones, pointInPolygon, polygonAreaScore, readText, roundMoney, toNumber } from "./normalize-shipping-zone.js";

export function readCustomerLocation(customer = {}) {
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

export function haversineKm(from, to) {
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

export function getEligibleBranches(branches = [], preferredBranchId = null, lockedBranchId = null) {
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

export function findNearestBranch(branches = [], location = null, options = {}) {
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

export function findBranchForZone(zone, branches, location = null, preferredBranchId = null) {
  if (!zone) return null;
  const nearest = findNearestBranch(branches, location, {
    preferredBranchId,
    lockedBranchId: zone.branch_id,
  });
  return nearest?.branch || null;
}

export function getShippingBreakdown({ zone = null, distanceKm = null, pricingMode = 'fixed', fallbackAmount = null }) {
  const zoneAmount = roundMoney(Math.max(0, toNumber(zone?.price, 0)));
  const distance = Math.max(0, toNumber(distanceKm, 0));
  const pricePerKm = Math.max(0, toNumber(zone?.price_per_km, 0));
  const freightAmount =
    pricingMode === 'per_km'
      ? roundMoney(distance * pricePerKm)
      : 0;
  const computedFinal = roundMoney(zoneAmount + freightAmount);
  const finalAmount = fallbackAmount == null ? computedFinal : roundMoney(Math.max(0, toNumber(fallbackAmount, 0)));

  return {
    zone_amount: zoneAmount,
    freight_amount: freightAmount,
    final_price: finalAmount,
  };
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
      ...getShippingBreakdown({
        zone,
        pricingMode: 'fixed',
      }),
      areaScore: polygonAreaScore(zone.polygon),
    }))
    .sort((a, b) => a.areaScore - b.areaScore);

  if (!matches.length) {
    return { error: 'delivery_out_of_range' };
  }

  const best = matches[0];
  return {
    ok: true,
    amount: best.final_price,
    shipping_zone_id: best.zone.id,
    shipping_zone_type: best.zone.type,
    branch_id: best.branch?.id || null,
    distance_km: null,
    zone_amount: best.zone_amount,
    freight_amount: best.freight_amount,
    final_price: best.final_price,
    zone: best.zone,
    branch: best.branch || null,
    location,
    match_type: 'polygon',
  };
}
