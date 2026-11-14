// Parte de shipping.js: getShippingBreakdown, resolveFixedZoneQuote, resolveDistanceQuote.
import { findBranchForZone, findNearestBranch, hasZonePolygon, haversineKm, pointInPolygon, polygonAreaScore, roundMoney, toNumber } from "./normalize-shipping-zones.js";

export const getShippingBreakdown = ({ zone, distanceKm = null, pricingMode = 'fixed' }) => {
    const zoneAmount = roundMoney(Math.max(0, toNumber(zone?.price, 0)));
    const distance = Math.max(0, toNumber(distanceKm, 0));
    const pricePerKm = Math.max(0, toNumber(zone?.price_per_km, 0));
    const freightAmount =
        pricingMode === 'per_km'
            ? roundMoney(distance * pricePerKm)
            : 0;
    const finalPrice = roundMoney(zoneAmount + freightAmount);

    return {
        zone_amount: zoneAmount,
        freight_amount: freightAmount,
        final_price: finalPrice,
    };
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
        .map((zone) => {
            const branch = findBranchForZone(zone, branches, location, preferredBranchId);
            const distanceKm = branch
                ? haversineKm(location, {
                      latitude: branch.latitude,
                      longitude: branch.longitude,
                  })
                : 0;

            return {
                zone,
                branch,
                distanceKm,
                areaScore: polygonAreaScore(zone.polygon),
            };
        })
        .sort((a, b) => a.areaScore - b.areaScore);

    if (!matches.length) {
        return { error: 'delivery_out_of_range' };
    }

    const best = matches[0];
    const breakdown = getShippingBreakdown({
        zone: best.zone,
        distanceKm: best.distanceKm,
        pricingMode: best.zone.distance_pricing_mode || 'fixed',
    });

    return {
        ok: true,
        zone: best.zone,
        branch: best.branch,
        distance_km: best.distanceKm,
        price: breakdown.final_price,
        zone_amount: breakdown.zone_amount,
        freight_amount: breakdown.freight_amount,
        final_price: breakdown.final_price,
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
        price: best.final_price,
        pricing_mode: best.pricing_mode,
        base_price: best.base_price,
        price_per_km: best.price_per_km,
        zone_amount: best.zone_amount,
        freight_amount: best.freight_amount,
        final_price: best.final_price,
        match_type: 'distance',
    };
};
