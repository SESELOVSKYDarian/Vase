import { DistancePricingMode, ShippingZoneType } from "@prisma/client";
import { listShippingBranchesByTenant, listShippingZonesByTenant } from "@/server/queries/business/shipping";
import { readText, roundMoney, toNumber } from "@/server/services/business/shared";

type GeoPoint = {
  latitude: number;
  longitude: number;
};

type ShippingCustomerInput = {
  shippingLocation?: Partial<GeoPoint> | null;
  shippingLatitude?: number | null;
  shippingLongitude?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

function normalizeLatitude(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < -90 || parsed > 90) return null;
  return parsed;
}

function normalizeLongitude(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < -180 || parsed > 180) return null;
  return parsed;
}

function normalizePolygonPoint(value: unknown) {
  if (Array.isArray(value) && value.length >= 2) {
    const latitude = normalizeLatitude(value[0]);
    const longitude = normalizeLongitude(value[1]);
    return latitude == null || longitude == null ? null : { lat: latitude, lng: longitude };
  }

  if (!value || typeof value !== "object") return null;

  const source = value as Record<string, unknown>;
  const latitude = normalizeLatitude(source.lat ?? source.latitude);
  const longitude = normalizeLongitude(source.lng ?? source.longitude ?? source.lon);
  return latitude == null || longitude == null ? null : { lat: latitude, lng: longitude };
}

function normalizeZonePolygon(value: unknown) {
  const list = Array.isArray(value) ? value : [];
  const polygon = list.map(normalizePolygonPoint).filter(Boolean) as Array<{ lat: number; lng: number }>;
  return polygon.length >= 3 ? polygon : [];
}

function pointInPolygon(point: GeoPoint, polygon: Array<{ lat: number; lng: number }>) {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const xi = polygon[index].lng;
    const yi = polygon[index].lat;
    const xj = polygon[previous].lng;
    const yj = polygon[previous].lat;

    const intersects =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function haversineKm(from: GeoPoint, to: GeoPoint) {
  const toRad = (value: number) => (value * Math.PI) / 180;
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

function readCustomerLocation(customer: ShippingCustomerInput) {
  const latitude = normalizeLatitude(
    customer.shippingLocation?.latitude ??
      customer.shippingLocation?.lat ??
      customer.shippingLatitude ??
      customer.latitude,
  );
  const longitude = normalizeLongitude(
    customer.shippingLocation?.longitude ??
      customer.shippingLocation?.lng ??
      customer.shippingLongitude ??
      customer.longitude,
  );

  return latitude == null || longitude == null ? null : { latitude, longitude };
}

export async function resolveShippingQuote(input: {
  tenantId: string;
  customer: ShippingCustomerInput;
  preferredBranchId?: string | null;
}) {
  const location = readCustomerLocation(input.customer);
  const [branches, zones] = await Promise.all([
    listShippingBranchesByTenant(input.tenantId),
    listShippingZonesByTenant(input.tenantId),
  ]);

  if (!zones.length) {
    return { ok: false, error: "location_shipping_not_configured" as const };
  }

  if (!location) {
    return { ok: false, error: "shipping_location_required" as const };
  }

  const preferredBranchId = readText(input.preferredBranchId);

  const branchCandidates = branches.filter((branch) => {
    if (preferredBranchId && branch.id !== preferredBranchId) return false;
    return branch.latitude != null && branch.longitude != null;
  });

  const polygonMatches = zones
    .filter((zone) => zone.type === ShippingZoneType.FLAT)
    .map((zone) => ({
      zone,
      polygon: normalizeZonePolygon(zone.polygon),
    }))
    .filter((entry) => entry.polygon.length >= 3 && pointInPolygon(location, entry.polygon))
    .map((entry) => ({
      zone: entry.zone,
      amount: toNumber(entry.zone.price, 0),
      branch: entry.zone.branch,
      distanceKm: null,
    }));

  if (polygonMatches.length) {
    const best = polygonMatches[0];
    return {
      ok: true,
      amount: roundMoney(best.amount),
      zoneId: best.zone.id,
      zoneType: best.zone.type,
      branchId: best.branch?.id || null,
      distanceKm: null,
    };
  }

  const distanceMatches = zones
    .filter((zone) => zone.type === ShippingZoneType.DISTANCE)
    .map((zone) => {
      const branch =
        zone.branch ||
        branchCandidates.find((candidate) => candidate.id === zone.branchId) ||
        branchCandidates[0];

      if (!branch || branch.latitude == null || branch.longitude == null) {
        return null;
      }

      const distanceKm = haversineKm(location, {
        latitude: Number(branch.latitude),
        longitude: Number(branch.longitude),
      });
      const minDistance = toNumber(zone.minDistanceKm, 0);
      const maxDistance = zone.maxDistanceKm == null ? null : toNumber(zone.maxDistanceKm, 0);

      if (distanceKm < minDistance) return null;
      if (maxDistance != null && distanceKm > maxDistance) return null;

      const baseAmount = toNumber(zone.price, 0);
      const variableAmount =
        zone.distancePricingMode === DistancePricingMode.PER_KM
          ? distanceKm * toNumber(zone.pricePerKm, 0)
          : 0;

      return {
        zone,
        branch,
        distanceKm: Number(distanceKm.toFixed(2)),
        amount: roundMoney(baseAmount + variableAmount),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.distanceKm ?? 0) - (b!.distanceKm ?? 0));

  if (!distanceMatches.length) {
    return { ok: false, error: "delivery_out_of_range" as const };
  }

  const best = distanceMatches[0]!;
  return {
    ok: true,
    amount: best.amount,
    zoneId: best.zone.id,
    zoneType: best.zone.type,
    branchId: best.branch.id,
    distanceKm: best.distanceKm,
  };
}
