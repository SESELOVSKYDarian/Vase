// El código está repartido por tema en la carpeta shipping/. Este archivo solo lo junta.
// partes: ./shipping/normalize-shipping-zones.js, ./shipping/resolve-distance-quote.js
export { DISTANCE_DELIVERY_KEY, toNumber, hasZonePolygon, normalizeBranches, normalizeShippingZones, haversineKm } from "./shipping/normalize-shipping-zones.js";
export { resolveFixedZoneQuote, resolveDistanceQuote } from "./shipping/resolve-distance-quote.js";
