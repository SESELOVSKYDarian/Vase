// Listas de precios que llegan del sistema de gestión.
import { MAX_PRICE_TIER_COUNT, PRICE_TIER_SLOT_ALIASES, STRUCTURED_PRICE_TIER_KEYS } from './constants.js';
import { buildFieldValidationError, hasMeaningfulValue, hasOwn, isPlainObject, readNumeric, readNumericAliasState } from './values.js';

export const normalizeStructuredPriceTierSlot = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.trunc(value);
    return normalized >= 1 && normalized <= MAX_PRICE_TIER_COUNT ? normalized : null;
  }

  const normalizedText = String(value || '').trim().toLowerCase();
  if (!normalizedText) return null;

  const directNumber = Number(normalizedText);
  if (Number.isFinite(directNumber)) {
    const slot = Math.trunc(directNumber);
    return slot >= 1 && slot <= MAX_PRICE_TIER_COUNT ? slot : null;
  }

  const matchedAlias = PRICE_TIER_SLOT_ALIASES.find((entry) => entry.aliases.includes(normalizedText));
  return matchedAlias?.slot || null;
};

export const setNormalizedPriceTier = (target, slot, value) => {
  if (!slot || slot < 1 || slot > MAX_PRICE_TIER_COUNT) return;
  target.set(slot, Math.max(0, Number(value)));
};

export const normalizePriceTiers = (raw) => {
  const tiers = new Map();

  for (const key of STRUCTURED_PRICE_TIER_KEYS) {
    if (!hasOwn(raw, key)) continue;

    const rawStructured = raw[key];
    if (!hasMeaningfulValue(rawStructured)) continue;

    if (Array.isArray(rawStructured)) {
      for (let index = 0; index < rawStructured.length; index += 1) {
        const entry = rawStructured[index];
        if (!hasMeaningfulValue(entry)) continue;

        if (isPlainObject(entry)) {
          const slot = normalizeStructuredPriceTierSlot(
            entry.slot ?? entry.index ?? entry.position ?? entry.id ?? entry.key ?? entry.name
          );
          const rawValue = entry.value ?? entry.price ?? entry.amount;
          if (!slot) {
            return {
              priceTiers: [],
              validationError: buildFieldValidationError(`${key}[${index}]`, rawValue, `No se pudo resolver el slot de ${key}[${index}].`),
            };
          }
          if (!hasMeaningfulValue(rawValue)) continue;
          const numericValue = readNumeric(rawValue);
          if (numericValue == null) {
            return {
              priceTiers: [],
              validationError: buildFieldValidationError(`${key}[${index}]`, rawValue),
            };
          }
          setNormalizedPriceTier(tiers, slot, numericValue);
          continue;
        }

        const slot = index + 1;
        if (slot > MAX_PRICE_TIER_COUNT) continue;
        const numericValue = readNumeric(entry);
        if (numericValue == null) {
          return {
            priceTiers: [],
            validationError: buildFieldValidationError(`${key}[${index}]`, entry),
          };
        }
        setNormalizedPriceTier(tiers, slot, numericValue);
      }
      continue;
    }

    if (isPlainObject(rawStructured)) {
      for (const [entryKey, entryValue] of Object.entries(rawStructured)) {
        if (!hasMeaningfulValue(entryValue)) continue;
        const slot = normalizeStructuredPriceTierSlot(entryKey);
        if (!slot) {
          return {
            priceTiers: [],
            validationError: buildFieldValidationError(`${key}.${entryKey}`, entryValue, `No se pudo resolver el slot de ${key}.${entryKey}.`),
          };
        }
        const numericValue = readNumeric(entryValue);
        if (numericValue == null) {
          return {
            priceTiers: [],
            validationError: buildFieldValidationError(`${key}.${entryKey}`, entryValue),
          };
        }
        setNormalizedPriceTier(tiers, slot, numericValue);
      }
    }
  }

  for (const entry of PRICE_TIER_SLOT_ALIASES) {
    const numericState = readNumericAliasState(raw, entry.aliases);
    if (!numericState.present) continue;
    if (numericState.invalid) {
      return {
        priceTiers: [],
        validationError: buildFieldValidationError(numericState.key, numericState.rawValue),
      };
    }
    if (numericState.value == null) continue;
    setNormalizedPriceTier(tiers, entry.slot, numericState.value);
  }

  const priceTiers = [...tiers.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([slot, value]) => ({
      slot,
      key: `price_${slot}`,
      value,
    }));

  return {
    priceTiers,
    validationError: null,
  };
};
