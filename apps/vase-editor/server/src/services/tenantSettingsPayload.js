import { normalizePriceTierLabels } from './priceTierLabels.js';

const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

export function normalizeTenantSettingsWritePayload(body = {}) {
  const source = asObject(body);
  const commerce = asObject(source.commerce);

  return {
    branding: asObject(source.branding),
    theme: asObject(source.theme),
    seo: asObject(source.seo),
    commerce: {
      ...commerce,
      price_tier_labels: normalizePriceTierLabels(commerce.price_tier_labels),
    },
  };
}
