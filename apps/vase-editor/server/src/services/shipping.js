// El código está repartido por tema en la carpeta shipping/. Este archivo solo lo junta.
// partes: ./shipping/normalize-shipping-zone.js, ./shipping/resolve-fixed-shipping-quote.js, ./shipping/resolve-shipping-amount.js
export { toNumber, normalizeBranch, normalizeBranches, normalizeShippingZone, normalizeShippingZones } from "./shipping/normalize-shipping-zone.js";
export { resolveFixedShippingQuote } from "./shipping/resolve-fixed-shipping-quote.js";
export { resolveDistanceShippingQuote, resolveShippingAmount } from "./shipping/resolve-shipping-amount.js";
