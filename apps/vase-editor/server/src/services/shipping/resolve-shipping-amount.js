// Parte de shipping.js: resolveDistanceShippingQuote, resolveShippingAmount.
import { DISTANCE_ZONE_TYPE, hasZonePolygon, normalizeBranches, normalizeShippingZones, readText, toNumber } from "./normalize-shipping-zone.js";
import { findNearestBranch, getShippingBreakdown, readCustomerLocation, resolveFixedShippingQuote } from "./resolve-fixed-shipping-quote.js";

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
        pricing_mode: zone.distance_pricing_mode || 'fixed',
        base_price: toNumber(zone.price, 0),
        price_per_km: Math.max(0, toNumber(zone.price_per_km, 0)),
        ...getShippingBreakdown({
          zone,
          distanceKm,
          pricingMode: zone.distance_pricing_mode || 'fixed',
        }),
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
    amount: best.final_price,
    shipping_zone_id: best.zone.id,
    shipping_zone_type: best.zone.type,
    branch_id: best.branch.id,
    distance_km: best.distance_km,
    pricing_mode: best.pricing_mode,
    base_price: best.base_price,
    price_per_km: best.price_per_km,
    zone_amount: best.zone_amount,
    freight_amount: best.freight_amount,
    final_price: best.final_price,
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
  const genericFlatAmount =
    settings?.shipping_flat !== undefined && settings?.shipping_flat !== null && settings?.shipping_flat !== ''
      ? toNumber(settings.shipping_flat, 0)
      : toNumber(
        shippingZones.find((zone) => zone.type !== DISTANCE_ZONE_TYPE)?.price,
        0,
      );

  if (deliveryRaw === 'distance:auto' || deliveryRaw === 'location:auto') {
    return resolveDistanceShippingQuote(settings, customer, {
      preferredBranchId: customer?.branch_id || customer?.branchId || customer?.shipping_location?.branch_id,
    });
  }

  if (deliveryRaw.startsWith('zone:')) {
    const zoneId = deliveryRaw.slice(5);
    if (zoneId === 'arg-general') {
      return {
        ok: true,
        amount: genericFlatAmount,
        shipping_zone_id: 'arg-general',
        shipping_zone_type: 'flat',
        branch_id: null,
        distance_km: null,
        zone_amount: genericFlatAmount,
        freight_amount: 0,
        final_price: genericFlatAmount,
      };
    }
    const zone = shippingZones.find((entry) => entry.id === zoneId);
    if (zone) {
      if (zone.type === DISTANCE_ZONE_TYPE) {
        return resolveDistanceShippingQuote(settings, customer, {
          preferredBranchId: zone.branch_id,
        });
      }
      const breakdown = getShippingBreakdown({
        zone,
        pricingMode: 'fixed',
      });
      return {
        ok: true,
        amount: breakdown.final_price,
        shipping_zone_id: zone.id,
        shipping_zone_type: zone.type,
        branch_id: null,
        distance_km: null,
        zone_amount: breakdown.zone_amount,
        freight_amount: breakdown.freight_amount,
        final_price: breakdown.final_price,
      };
    }
  }

  if (deliveryRaw.startsWith('branch:')) {
    const branchId = deliveryRaw.slice(7);
    const branch = branches.find((entry) => entry.id === branchId);
    if (branch) {
      const amount = toNumber(branch.pickup_fee, 0);
      return {
        ok: true,
        amount,
        shipping_zone_id: null,
        shipping_zone_type: 'pickup',
        branch_id: branch.id,
        distance_km: null,
        zone_amount: amount,
        freight_amount: 0,
        final_price: amount,
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
      zone_amount: 0,
      freight_amount: 0,
      final_price: 0,
    };
  }

  const fallbackZone = shippingZones.find((zone) => zone.type !== DISTANCE_ZONE_TYPE) || shippingZones[0];
  if (fallbackZone?.type === DISTANCE_ZONE_TYPE) {
    return resolveDistanceShippingQuote(settings, customer, {
      preferredBranchId: fallbackZone.branch_id,
    });
  }

  const fallbackAmount = toNumber(fallbackZone?.price, genericFlatAmount);
  return {
    ok: true,
    amount: fallbackAmount,
    shipping_zone_id: fallbackZone?.id || null,
    shipping_zone_type: fallbackZone?.type || 'flat',
    branch_id: null,
    distance_km: null,
    zone_amount: fallbackAmount,
    freight_amount: 0,
    final_price: fallbackAmount,
  };
}
