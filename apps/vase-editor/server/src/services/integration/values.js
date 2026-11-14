// Lectores chicos: texto, número, sí/no y búsqueda de un campo por sus posibles nombres.
import { DEFAULT_SYNC_OPERATION, SYNC_OPERATION_ALIASES, UNDEFINED_LIKE_TEXTS, UUID_REGEX } from './constants.js';

export const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const toTextOrNull = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

export const readNumeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const hasMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
};

export const buildFieldValidationError = (field, rawValue, detail = null) => ({
  code: 'invalid_value_format',
  field,
  raw_value: rawValue ?? null,
  detail:
    detail ||
    `El campo ${field} tiene un formato invalido${rawValue != null ? ` (${String(rawValue)})` : ''}.`,
});

export const normalizeComparableText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const hasOwn = (source, key) => Object.prototype.hasOwnProperty.call(source || {}, key);
export const isUuid = (value) => UUID_REGEX.test(String(value || '').trim());
export const normalizeSyncOperation = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return SYNC_OPERATION_ALIASES[normalized] || DEFAULT_SYNC_OPERATION;
};

export const readBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (['true', '1', 'si', 'sí', 'yes', 'y', 'on', 'activo', 'active'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off', 'inactivo', 'inactive'].includes(normalized)) return false;
  return null;
};

export const isUndefinedLikeText = (value) => UNDEFINED_LIKE_TEXTS.has(normalizeComparableText(value));

export const normalizeBrandValue = (value) => {
  const normalized = toTextOrNull(value);
  if (!normalized || isUndefinedLikeText(normalized)) return null;
  return normalized;
};

export const normalizeCategoryToken = (value) => {
  const normalized = toTextOrNull(value);
  if (!normalized) return null;
  if (isUndefinedLikeText(normalized)) return null;
  return normalized;
};

export const normalizeStockQuantity = (value) => {
  const parsed = readNumeric(value);
  if (parsed == null) return null;
  return Math.trunc(parsed);
};

export const firstPresentValue = (source, aliases = []) => {
  for (const key of aliases) {
    if (hasOwn(source, key)) {
      return source[key];
    }
  }
  return undefined;
};

export const hasAnyOwn = (source, aliases = []) => aliases.some((key) => hasOwn(source, key));

export const firstTextAlias = (source, aliases = []) => {
  for (const key of aliases) {
    const value = firstPresentValue(source, [key]);
    const normalized = toTextOrNull(value);
    if (normalized) return normalized;
  }
  return null;
};

export const firstNumericAlias = (source, aliases = []) => {
  for (const key of aliases) {
    const value = firstPresentValue(source, [key]);
    const normalized = readNumeric(value);
    if (normalized != null) return normalized;
  }
  return null;
};

export const firstBooleanAlias = (source, aliases = []) => {
  for (const key of aliases) {
    const value = firstPresentValue(source, [key]);
    const normalized = readBoolean(value);
    if (normalized != null) return normalized;
  }
  return null;
};

export const readNumericAliasState = (source, aliases = []) => {
  for (const key of aliases) {
    if (!hasOwn(source, key)) continue;
    const rawValue = source[key];
    if (!hasMeaningfulValue(rawValue)) {
      return {
        present: true,
        value: null,
        invalid: false,
        key,
        rawValue,
      };
    }

    const normalized = readNumeric(rawValue);
    if (normalized == null) {
      return {
        present: true,
        value: null,
        invalid: true,
        key,
        rawValue,
      };
    }

    return {
      present: true,
      value: normalized,
      invalid: false,
      key,
      rawValue,
    };
  }

  return {
    present: false,
    value: null,
    invalid: false,
    key: null,
    rawValue: undefined,
  };
};
