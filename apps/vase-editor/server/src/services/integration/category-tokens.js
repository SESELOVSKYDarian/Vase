// Lee los rubros que manda el sistema de gestión, en cualquiera de sus formatos.
import { CATEGORY_PATH_ALIASES, CATEGORY_SIGNAL_ALIASES, PIQUIM_HELADERIA_CATEGORY_LABEL, PIQUIM_PANADERIA_CONFITERIA_CATEGORY_LABEL, PIQUIM_TENANT_IDS } from './constants.js';
import { firstPresentValue, hasOwn, isUndefinedLikeText, normalizeCategoryToken, toTextOrNull } from './values.js';

export const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const uniqueTextValues = (values = []) => [...new Set(values.map((value) => toTextOrNull(value)).filter(Boolean))];

export const isPiquimTenant = (tenantId) => PIQUIM_TENANT_IDS.has(String(tenantId || '').trim());

export const normalizePiquimText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const resolvePiquimRootCategoryLabels = (item = {}) => {
  const text = normalizePiquimText([
    item.sourceCategoryLabel,
    ...(Array.isArray(item.categoryLabels) ? item.categoryLabels : []),
    ...(Array.isArray(item.categoryPathLabels) ? item.categoryPathLabels : []),
    item.rawPayload?.category,
    item.rawPayload?.categoria,
    item.rawPayload?.rubro,
    item.rawPayload?.familia,
    item.rawPayload?.grand_family,
    item.rawPayload?.gran_familia,
  ].filter(Boolean).join(' '));

  const labels = [];
  if (text.includes('heladeria') || text.includes('helado')) {
    labels.push(PIQUIM_HELADERIA_CATEGORY_LABEL);
  }
  if (
    text.includes('panaderia') ||
    text.includes('panificacion') ||
    text.includes('pan ') ||
    text.includes('bolleria') ||
    text.includes('confiteria') ||
    text.includes('reposteria') ||
    text.includes('pasteleria')
  ) {
    labels.push(PIQUIM_PANADERIA_CONFITERIA_CATEGORY_LABEL);
  }

  return uniqueTextValues(labels);
};

export const splitCategoryTokens = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => splitCategoryTokens(entry));
  }

  const normalized = String(value || '').trim();
  if (!normalized) return [];

  if (/[;,|]/.test(normalized)) {
    return normalized
      .split(/[;,|]/)
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);
  }

  return [normalized];
};

export const splitCategoryPathTokens = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => splitCategoryPathTokens(entry));
  }

  const normalized = String(value || '').trim();
  if (!normalized) return [];

  if (/[>\\/|]/.test(normalized)) {
    return normalized
      .split(/[>\\/|]/)
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);
  }

  return [normalized];
};

export const collectCategorySignalTokens = (raw) => {
  const tokens = [];

  CATEGORY_SIGNAL_ALIASES.forEach((key) => {
    if (!hasOwn(raw, key)) return;

    const value = firstPresentValue(raw, [key]);
    const splitter = CATEGORY_PATH_ALIASES.includes(key)
      ? splitCategoryPathTokens
      : splitCategoryTokens;
    tokens.push(...splitter(value));
  });

  return tokens.map((value) => toTextOrNull(value)).filter(Boolean);
};

export const analyzeCategorySignal = (raw) => {
  const hasCategorySignalPayload = CATEGORY_SIGNAL_ALIASES.some((key) => hasOwn(raw, key));
  const tokens = collectCategorySignalTokens(raw);
  const usefulTokens = tokens.map((value) => normalizeCategoryToken(value)).filter(Boolean);

  return {
    hasCategorySignalPayload,
    hasExplicitUndefinedCategory:
      hasCategorySignalPayload &&
      tokens.length > 0 &&
      usefulTokens.length === 0 &&
      tokens.some((value) => isUndefinedLikeText(value)),
  };
};
