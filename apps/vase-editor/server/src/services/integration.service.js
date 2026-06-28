import { pool } from '../db.js';

let productSyncSchemaReady = false;
let productSyncSchemaPromise = null;

const DEFAULT_SOURCE_SYSTEM = 'erp';
const ENABLE_PIQUIM_INTEGRATION_RULES =
  String(process.env.ENABLE_PIQUIM_BOOTSTRAP || process.env.ENABLE_PIQUIM_INTEGRATIONS || '')
    .trim()
    .toLowerCase() === 'true';
const PIQUIM_TENANT_IDS = new Set(
  String(ENABLE_PIQUIM_INTEGRATION_RULES ? (process.env.PIQUIM_TENANT_IDS || process.env.PIQUIM_TENANT_ID || '') : '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);
const PIQUIM_HELADERIA_CATEGORY_LABEL = 'Heladeria';
const PIQUIM_PANADERIA_CONFITERIA_CATEGORY_LABEL = 'Panaderia/Confiteria';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_SYNC_OPERATION = 'upsert';
const MAX_PRICE_TIER_COUNT = 10;
const SYNC_OPERATION_ALIASES = {
  create: 'create',
  insert: 'create',
  new: 'create',
  alta: 'create',
  update: 'update',
  edit: 'update',
  modify: 'update',
  actualizar: 'update',
  upsert: 'upsert',
  sync: 'upsert',
  sincronizar: 'upsert',
};
const UNDEFINED_LIKE_TEXTS = new Set([
  'ninguno',
  'ninguna',
  'sin definir',
  'sin categoria',
  'sin marca',
  'no definido',
  'no definida',
  'n/a',
  'na',
  'null',
  '-',
  '--',
]);
const UNDEFINED_CATEGORY_LABEL = 'Sin definir';
const STRUCTURED_PRICE_TIER_KEYS = ['price_tiers', 'priceTiers', 'prices', 'precios', 'tarifas'];
const PRICE_TIER_SLOT_ALIASES = Array.from({ length: MAX_PRICE_TIER_COUNT }, (_, index) => {
  const slot = index + 1;
  const padded = String(slot).padStart(2, '0');
  return {
    slot,
    aliases: [
      `price_${slot}`,
      `price${slot}`,
      `price_${padded}`,
      `price${padded}`,
      `precio_${slot}`,
      `precio${slot}`,
      `precio_${padded}`,
      `precio${padded}`,
      `tarifa_${slot}`,
      `tarifa${slot}`,
      `lista_${slot}`,
      `lista${slot}`,
      `price_list_${slot}`,
      `priceList${slot}`,
    ],
  };
});
const RETAIL_PRICE_ALIASES = [
  'price_retail',
  'priceRetail',
  'price',
  'precio',
  'precio_venta',
  'precioVenta',
  'precio_iva',
  'precio_final',
];
const WHOLESALE_PRICE_ALIASES = [
  'price_wholesale',
  'priceWholesale',
  'wholesale_price',
  'precio_wholesale',
  'precio_mayorista',
  'mayorista',
];
const CATEGORY_PATH_ALIASES = [
  'category_path',
  'categoryPath',
  'categoria_path',
  'categoriaPath',
  'category_tree',
  'categoryTree',
  'category_hierarchy',
  'categoryHierarchy',
  'jerarquia_categoria',
  'jerarquiaCategoria',
];
const CATEGORY_ROOT_ALIASES = [
  'categoria',
  'category',
  'rubro',
  'linea',
  'line',
  'categoria_padre',
  'categoriaPadre',
  'categoria_raiz',
  'categoriaRaiz',
  'categoria_principal',
  'categoriaPrincipal',
  'root_category',
  'rootCategory',
  'parent_category',
  'parentCategory',
];
const CATEGORY_GROUP_ALIASES = [
  'gran_familia',
  'granFamilia',
  'grand_family',
  'grandFamily',
  'group_category',
  'groupCategory',
  'subcategoria',
  'sub_category',
  'subcategory',
];
const CATEGORY_LEAF_ALIASES = ['familia', 'family'];
const CATEGORY_REF_ALIASES = [
  'category_id',
  'categoryId',
  'category_ids',
  'categoryIds',
  'family_id',
  'familyId',
  'family_ids',
  'familyIds',
  'familia_id',
  'familiaId',
  'familia_ids',
  'familiaIds',
  'categories',
  'categorias',
  'familias',
  'family',
  'familia',
  'category',
  'categoria',
];
const CATEGORY_SIGNAL_ALIASES = [
  ...new Set([
    ...CATEGORY_PATH_ALIASES,
    ...CATEGORY_REF_ALIASES,
    ...CATEGORY_ROOT_ALIASES,
    ...CATEGORY_GROUP_ALIASES,
    ...CATEGORY_LEAF_ALIASES,
  ]),
];

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toTextOrNull = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

const readNumeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
};

const buildFieldValidationError = (field, rawValue, detail = null) => ({
  code: 'invalid_value_format',
  field,
  raw_value: rawValue ?? null,
  detail:
    detail ||
    `El campo ${field} tiene un formato invalido${rawValue != null ? ` (${String(rawValue)})` : ''}.`,
});

const normalizeComparableText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const hasOwn = (source, key) => Object.prototype.hasOwnProperty.call(source || {}, key);
const isUuid = (value) => UUID_REGEX.test(String(value || '').trim());
const normalizeSyncOperation = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return SYNC_OPERATION_ALIASES[normalized] || DEFAULT_SYNC_OPERATION;
};

const readBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (['true', '1', 'si', 'sí', 'yes', 'y', 'on', 'activo', 'active'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off', 'inactivo', 'inactive'].includes(normalized)) return false;
  return null;
};

const isUndefinedLikeText = (value) => UNDEFINED_LIKE_TEXTS.has(normalizeComparableText(value));

const normalizeBrandValue = (value) => {
  const normalized = toTextOrNull(value);
  if (!normalized || isUndefinedLikeText(normalized)) return null;
  return normalized;
};

const normalizeCategoryToken = (value) => {
  const normalized = toTextOrNull(value);
  if (!normalized) return null;
  if (isUndefinedLikeText(normalized)) return null;
  return normalized;
};

const normalizeStockQuantity = (value) => {
  const parsed = readNumeric(value);
  if (parsed == null) return null;
  return Math.trunc(parsed);
};

const firstPresentValue = (source, aliases = []) => {
  for (const key of aliases) {
    if (hasOwn(source, key)) {
      return source[key];
    }
  }
  return undefined;
};

const hasAnyOwn = (source, aliases = []) => aliases.some((key) => hasOwn(source, key));

const firstTextAlias = (source, aliases = []) => {
  for (const key of aliases) {
    const value = firstPresentValue(source, [key]);
    const normalized = toTextOrNull(value);
    if (normalized) return normalized;
  }
  return null;
};

const firstNumericAlias = (source, aliases = []) => {
  for (const key of aliases) {
    const value = firstPresentValue(source, [key]);
    const normalized = readNumeric(value);
    if (normalized != null) return normalized;
  }
  return null;
};

const firstBooleanAlias = (source, aliases = []) => {
  for (const key of aliases) {
    const value = firstPresentValue(source, [key]);
    const normalized = readBoolean(value);
    if (normalized != null) return normalized;
  }
  return null;
};

const readNumericAliasState = (source, aliases = []) => {
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

const normalizeStructuredPriceTierSlot = (value) => {
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

const setNormalizedPriceTier = (target, slot, value) => {
  if (!slot || slot < 1 || slot > MAX_PRICE_TIER_COUNT) return;
  target.set(slot, Math.max(0, Number(value)));
};

const normalizePriceTiers = (raw) => {
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

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const uniqueTextValues = (values = []) => [...new Set(values.map((value) => toTextOrNull(value)).filter(Boolean))];

const isPiquimTenant = (tenantId) => PIQUIM_TENANT_IDS.has(String(tenantId || '').trim());

const normalizePiquimText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const resolvePiquimRootCategoryLabels = (item = {}) => {
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

const splitCategoryTokens = (value) => {
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

const splitCategoryPathTokens = (value) => {
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

const collectCategorySignalTokens = (raw) => {
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

const analyzeCategorySignal = (raw) => {
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

const collectRawImages = (source) => {
  const rawCollections = [];
  const directImages = firstPresentValue(source, ['images', 'imagenes']);
  if (Array.isArray(directImages)) {
    rawCollections.push(...directImages);
  } else if (typeof directImages === 'string' && directImages.trim()) {
    rawCollections.push(directImages.trim());
  }

  const singularImage = firstPresentValue(source, ['image', 'imagen', 'image_url', 'imagen_url', 'url_imagen']);
  if (typeof singularImage === 'string' && singularImage.trim()) {
    rawCollections.push(singularImage.trim());
  }

  for (let index = 1; index <= 8; index += 1) {
    [
      `image_${index}`,
      `image${index}`,
      `imagen_${index}`,
      `imagen${index}`,
      `imagen_${index}_url`,
      `url_imagen_${index}`,
    ].forEach((key) => {
      const value = firstPresentValue(source, [key]);
      if (typeof value === 'string' && value.trim()) {
        rawCollections.push(value.trim());
      }
    });
  }

  return rawCollections;
};

const normalizeCategoryRefs = (raw, aliases = []) => {
  const collected = [];

  aliases.forEach((key) => {
    const value = firstPresentValue(raw, [key]);
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        collected.push(...splitCategoryTokens(entry));
      });
      return;
    }

    collected.push(...splitCategoryTokens(value));
  });

  const unique = uniqueTextValues(collected.map((value) => normalizeCategoryToken(value)));
  return {
    ids: unique.filter((value) => isUuid(value)),
    labels: unique.filter((value) => !isUuid(value)),
  };
};

const normalizeCategoryHierarchy = (raw) => {
  const explicitPath = firstPresentValue(raw, CATEGORY_PATH_ALIASES);

  const explicitTokens = uniqueTextValues(
    splitCategoryPathTokens(explicitPath).map((value) => normalizeCategoryToken(value))
  );
  if (explicitTokens.length) {
    return explicitTokens;
  }

  const inferredPath = uniqueTextValues([
    normalizeCategoryToken(firstTextAlias(raw, CATEGORY_ROOT_ALIASES)),
    normalizeCategoryToken(firstTextAlias(raw, CATEGORY_GROUP_ALIASES)),
    normalizeCategoryToken(firstTextAlias(raw, CATEGORY_LEAF_ALIASES)),
  ]);

  return inferredPath.length ? inferredPath : [];
};

const normalizeImageCollection = (images, fallbackAlt) => {
  if (!Array.isArray(images) || !images.length) return null;

  const normalized = images
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const url = entry.trim();
        if (!url) return null;
        return { url, alt: fallbackAlt || 'Producto', primary: index === 0 };
      }

      if (!isPlainObject(entry)) return null;
      const url = String(entry.url || entry.src || '').trim();
      if (!url) return null;
      return {
        url,
        alt: String(entry.alt || fallbackAlt || 'Producto').trim() || 'Producto',
        primary: entry.primary === true || index === 0,
      };
    })
    .filter(Boolean);

  if (!normalized.length) return null;
  if (!normalized.some((item) => item.primary)) {
    normalized[0] = { ...normalized[0], primary: true };
  }

  return normalized;
};

const normalizeSyncItem = (rawItem, fallbackSourceSystem = DEFAULT_SOURCE_SYSTEM) => {
  const raw = isPlainObject(rawItem) ? rawItem : {};
  const rawImages = collectRawImages(raw);
  const externalId = firstTextAlias(raw, [
    'external_id',
    'externalId',
    'id',
    'sku',
    'codigo',
    'codigo_propio',
    'codigoPropio',
    'codigo_producto',
    'product_code',
    'codigo_barras_1',
    'codigo_barras1',
  ]);
  const sourceSystem =
    firstTextAlias(raw, ['source_system', 'sourceSystem', 'origin']) ||
    toTextOrNull(fallbackSourceSystem) ||
    DEFAULT_SOURCE_SYSTEM;
  const operation = normalizeSyncOperation(firstPresentValue(raw, ['operation', 'action', 'mode', 'sync_mode', 'syncMode']));
  const rawName = firstTextAlias(raw, ['name', 'title', 'titulo', 'detalle_ampliado', 'detalleAmpliado', 'product_name']);
  const rawSku = firstTextAlias(raw, ['sku', 'codigo', 'codigo_propio', 'codigo_producto', 'product_code']);
  const name =
    rawName ||
    firstTextAlias(raw, ['sku', 'codigo', 'codigo_propio']) ||
    externalId ||
    'Producto sincronizado';
  const sku = rawSku || externalId;
  const descriptionAliases = [
    'description',
    'descripcion',
    'descripcion_ampliada',
    'descripcion_larga',
    'long_description',
    'longDescription',
    'desc_ampliada',
    'detalle_abreviado',
    'detalleAbreviado',
    'texto_asociado',
    'textoAsociado',
    'full_description',
  ];
  const shortDescriptionAliases = [
    'short_description',
    'shortDescription',
    'descripcion_corta',
    'desc_corta',
    'detalle_abreviado',
    'detalleAbreviado',
  ];
  const description = firstTextAlias(raw, descriptionAliases);
  const shortDescription = firstTextAlias(raw, shortDescriptionAliases);
  const brandAliases = ['brand', 'marca'];
  const brand = normalizeBrandValue(firstTextAlias(raw, brandAliases));
  const categorySignal = analyzeCategorySignal(raw);
  const normalizedCategories = normalizeCategoryRefs(raw, CATEGORY_REF_ALIASES);
  const categoryPathLabels = normalizeCategoryHierarchy(raw);
  const categoryIds = normalizedCategories.ids;
  const categoryLabels = normalizedCategories.labels;
  const sourceCategoryLabel = categoryLabels[0] || categoryPathLabels[categoryPathLabels.length - 1] || null;
  const priceTiersState = normalizePriceTiers(raw);
  const priceTiers = Array.isArray(priceTiersState.priceTiers) ? priceTiersState.priceTiers : [];
  const priceTierMap = Object.fromEntries(priceTiers.map((entry) => [entry.key, entry.value]));
  const priceRetailState = readNumericAliasState(raw, RETAIL_PRICE_ALIASES);
  const priceWholesaleState = readNumericAliasState(raw, WHOLESALE_PRICE_ALIASES);
  const stockState = readNumericAliasState(raw, [
    'stock',
    'inventory',
    'quantity',
    'disponibilidad',
    'stock_actual',
    'existencia',
    'cantidad',
  ]);
  const priceRetail = priceRetailState.value ?? priceTierMap.price_1 ?? null;
  const priceWholesale = priceWholesaleState.value ?? priceTierMap.price_2 ?? null;
  const stock = stockState.value != null ? normalizeStockQuantity(stockState.value) : null;

  const validationError =
    priceTiersState.validationError ||
    (priceRetailState.invalid ? buildFieldValidationError(priceRetailState.key, priceRetailState.rawValue) : null) ||
    (priceWholesaleState.invalid ? buildFieldValidationError(priceWholesaleState.key, priceWholesaleState.rawValue) : null) ||
    (stockState.invalid ? buildFieldValidationError(stockState.key, stockState.rawValue) : null);

  const rawIsActive = firstBooleanAlias(raw, ['is_active', 'isActive', 'active', 'activo']);
  const hasIsActive = rawIsActive != null;
  const isActiveSource = hasIsActive ? rawIsActive : true;

  const rawDeletedAt = raw.deleted_at ?? raw.deletedAt ?? null;
  const explicitDeleted = raw.deleted === true || raw.is_deleted === true;
  const parsedDeletedAt = rawDeletedAt ? new Date(rawDeletedAt) : null;
  const deletedAt = explicitDeleted
    ? new Date()
    : parsedDeletedAt instanceof Date && !Number.isNaN(parsedDeletedAt.getTime())
      ? parsedDeletedAt
      : null;

  return {
    externalId,
    sourceSystem,
    operation,
    sku,
    name,
    description,
    shortDescription,
    brand,
    categoryIds,
    categoryLabels,
    categoryPathLabels,
    sourceCategoryLabel,
    hasSku: rawSku !== null,
    hasName: rawName !== null,
    hasDescription: hasAnyOwn(raw, descriptionAliases),
    hasShortDescription: hasAnyOwn(raw, shortDescriptionAliases),
    hasBrand: hasAnyOwn(raw, brandAliases),
    hasCategoryIds: categoryIds.length > 0,
    hasCategoryLabels: categoryLabels.length > 0,
    hasCategoryRefs: categoryIds.length > 0 || categoryLabels.length > 0,
    hasCategoryPath: categoryPathLabels.length > 0,
    hasCategorySignalPayload: categorySignal.hasCategorySignalPayload,
    hasExplicitUndefinedCategory: categorySignal.hasExplicitUndefinedCategory,
    hasSourceCategoryLabel: sourceCategoryLabel !== null,
    hasPriceRetail: priceRetailState.present || priceRetail != null,
    hasPriceWholesale: priceWholesaleState.present || priceWholesale != null,
    hasPriceTiers: priceTiers.length > 0,
    hasStock: stock != null,
    hasIsActive,
    priceRetail,
    priceWholesale,
    priceTiers,
    stock,
    isActiveSource,
    images: normalizeImageCollection(rawImages, name),
    hasImages: rawImages.length > 0,
    deletedAt,
    validationError,
    rawPayload: raw,
  };
};

const buildProductDataFromSync = ({ existingData, item, allowEditorialSync }) => {
  const next = isPlainObject(existingData) ? { ...existingData } : {};

  if (item.hasPriceTiers) {
    next.price_tiers = item.priceTiers.reduce((acc, entry) => {
      acc[entry.key] = entry.value;
      return acc;
    }, {});
  }

  if (allowEditorialSync && item.hasImages) {
    next.images = item.images || [];
  }

  if (allowEditorialSync && item.hasShortDescription) {
    next.short_description = item.shortDescription || null;
  }

  if (allowEditorialSync && item.hasSourceCategoryLabel) {
    next.source_category = item.sourceCategoryLabel || null;
  }

  if (allowEditorialSync && item.hasCategoryPath) {
    next.source_category_path = item.categoryPathLabels || [];
  }

  return next;
};

const buildSyncItemResultBase = ({ index, rawItem, item, sourceSystem }) => ({
  index,
  external_id: item?.externalId || toTextOrNull(rawItem?.external_id ?? rawItem?.externalId ?? rawItem?.id ?? rawItem?.sku) || null,
  sku: item?.sku || toTextOrNull(rawItem?.sku ?? rawItem?.codigo ?? rawItem?.codigo_propio) || null,
  name: item?.name || toTextOrNull(rawItem?.name ?? rawItem?.title ?? rawItem?.titulo) || null,
  source_system: item?.sourceSystem || sourceSystem,
  requested_operation: item?.operation || normalizeSyncOperation(rawItem?.operation ?? rawItem?.action ?? rawItem?.mode ?? rawItem?.sync_mode),
});

async function upsertSyncMetadata(client, { tenantId, productId, externalId, sourceSystem, lastSyncAt, rawPayload }) {
  await client.query(
    [
      'insert into product_sync_metadata (tenant_id, product_id, external_id, source_system, last_sync_at, raw_payload, updated_at)',
      'values ($1, $2, $3, $4, $5, $6::jsonb, now())',
      'on conflict (tenant_id, external_id)',
      'do update set',
      'product_id = excluded.product_id,',
      'source_system = excluded.source_system,',
      'last_sync_at = excluded.last_sync_at,',
      'raw_payload = excluded.raw_payload,',
      'updated_at = now()',
    ].join(' '),
    [tenantId, productId, externalId, sourceSystem, lastSyncAt, JSON.stringify(rawPayload || {})]
  );
}

async function replaceProductCategories(client, { tenantId, productId, categoryIds }) {
  const selectedCategoryIds = Array.isArray(categoryIds)
    ? [...new Set(categoryIds.filter((value) => isUuid(value)))]
    : [];

  if (selectedCategoryIds.length) {
    const validCategoriesRes = await client.query(
      'select id from categories where tenant_id = $1 and id = any($2::uuid[])',
      [tenantId, selectedCategoryIds]
    );

    if (validCategoriesRes.rowCount !== selectedCategoryIds.length) {
      const error = new Error('invalid_category_ids');
      error.status = 400;
      error.code = 'invalid_category_ids';
      throw error;
    }
  }

  await client.query('delete from product_categories where product_id = $1', [productId]);

  if (selectedCategoryIds.length) {
    await client.query(
      [
        'insert into product_categories (product_id, category_id)',
        'select $1, unnest($2::uuid[])',
        'on conflict do nothing',
      ].join(' '),
      [productId, selectedCategoryIds]
    );
  }
}

async function resolveCategoryIdsForSync(client, { tenantId, categoryIds = [], categoryLabels = [] }) {
  const normalizedIds = [...new Set((Array.isArray(categoryIds) ? categoryIds : []).filter((value) => isUuid(value)))];
  const normalizedLabels = [...new Set((Array.isArray(categoryLabels) ? categoryLabels : []).map((value) => toTextOrNull(value)).filter(Boolean))];

  if (normalizedIds.length) {
    const validCategoriesRes = await client.query(
      'select id from categories where tenant_id = $1 and id = any($2::uuid[])',
      [tenantId, normalizedIds]
    );

    if (validCategoriesRes.rowCount !== normalizedIds.length) {
      const error = new Error('invalid_category_ids');
      error.status = 400;
      error.code = 'invalid_category_ids';
      throw error;
    }
  }

  if (!normalizedLabels.length) {
    return {
      categoryIds: normalizedIds,
      createdCount: 0,
    };
  }

  const loweredLabels = normalizedLabels.map((value) => value.toLowerCase());
  const slugs = normalizedLabels.map((value) => slugify(value)).filter(Boolean);
  const existingRes = await client.query(
    [
      'select id, name, slug, erp_id',
      'from categories',
      'where tenant_id = $1',
      'and (lower(name) = any($2::text[]) or slug = any($3::text[]) or coalesce(erp_id, \'\') = any($4::text[]))',
    ].join(' '),
    [tenantId, loweredLabels, slugs, normalizedLabels]
  );

  const matches = new Map();
  existingRes.rows.forEach((row) => {
    const nameKey = String(row.name || '').trim().toLowerCase();
    const slugKey = String(row.slug || '').trim();
    const erpKey = String(row.erp_id || '').trim();
    if (nameKey) matches.set(nameKey, row.id);
    if (slugKey) matches.set(slugKey, row.id);
    if (erpKey) matches.set(erpKey, row.id);
  });

  const resolvedIds = [...normalizedIds];
  let createdCount = 0;

  for (const label of normalizedLabels) {
    const labelKey = label.toLowerCase();
    const labelSlug = slugify(label);
    const existingId = matches.get(labelKey) || matches.get(labelSlug) || matches.get(label);
    if (existingId) {
      resolvedIds.push(existingId);
      continue;
    }

    const baseSlug = labelSlug || `categoria-sync-${createdCount + 1}`;
    let candidateSlug = baseSlug;
    let createdId = null;

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const insertRes = await client.query(
        [
          'insert into categories (tenant_id, name, slug, data)',
          'values ($1, $2, $3, $4::jsonb)',
          'on conflict do nothing',
          'returning id',
        ].join(' '),
        [
          tenantId,
          label,
          candidateSlug,
          JSON.stringify({ auto_created_by: 'integration_sync', source_category_label: label }),
        ]
      );

      if (insertRes.rowCount) {
        createdId = insertRes.rows[0].id;
        createdCount += 1;
        break;
      }

      const existingBySlugRes = await client.query(
        'select id from categories where tenant_id = $1 and slug = $2 limit 1',
        [tenantId, candidateSlug]
      );

      if (existingBySlugRes.rowCount) {
        createdId = existingBySlugRes.rows[0].id;
        break;
      }

      candidateSlug = `${baseSlug}-${attempt + 2}`;
    }

    if (createdId) {
      resolvedIds.push(createdId);
      matches.set(labelKey, createdId);
      if (labelSlug) matches.set(labelSlug, createdId);
      matches.set(label, createdId);
    }
  }

  return {
    categoryIds: [...new Set(resolvedIds)],
    createdCount,
  };
}

async function ensureCategoryPathForSync(client, { tenantId, categoryPathLabels = [] }) {
  const normalizedPath = uniqueTextValues(
    (Array.isArray(categoryPathLabels) ? categoryPathLabels : []).map((value) => normalizeCategoryToken(value))
  );

  if (!normalizedPath.length) {
    return {
      categoryId: null,
      createdCount: 0,
    };
  }

  let parentId = null;
  let parentSlug = '';
  let currentId = null;
  let createdCount = 0;

  for (const label of normalizedPath) {
    const loweredLabel = label.toLowerCase();
    const baseLabelSlug = slugify(label) || `categoria-sync-${createdCount + 1}`;
    const findParams = parentId
      ? [tenantId, loweredLabel, baseLabelSlug, label, parentId]
      : [tenantId, loweredLabel, baseLabelSlug, label];
    const existingRes = await client.query(
      [
        'select id, slug from categories',
        'where tenant_id = $1',
        'and (lower(name) = $2 or slug = $3 or coalesce(erp_id, \'\') = $4)',
        parentId
          ? "and nullif(data->>'parent_id', '') = $5"
          : "and nullif(data->>'parent_id', '') is null",
        'limit 1',
      ].join(' '),
      findParams
    );

    if (existingRes.rowCount) {
      currentId = existingRes.rows[0].id;
      parentId = currentId;
      parentSlug = existingRes.rows[0].slug || baseLabelSlug;
      continue;
    }

    const baseSlug = slugify(parentSlug ? `${parentSlug}-${label}` : label) || baseLabelSlug;
    let candidateSlug = baseSlug;
    let createdRow = null;

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const payloadData = parentId
        ? { parent_id: parentId, auto_created_by: 'integration_sync', source_category_label: label }
        : { auto_created_by: 'integration_sync', source_category_label: label };
      const insertRes = await client.query(
        [
          'insert into categories (tenant_id, name, slug, data)',
          'values ($1, $2, $3, $4::jsonb)',
          'on conflict do nothing',
          'returning id, slug',
        ].join(' '),
        [tenantId, label, candidateSlug, JSON.stringify(payloadData)]
      );

      if (insertRes.rowCount) {
        createdRow = insertRes.rows[0];
        createdCount += 1;
        break;
      }

      const existingBySlugRes = await client.query(
        'select id, slug from categories where tenant_id = $1 and slug = $2 limit 1',
        [tenantId, candidateSlug]
      );

      if (existingBySlugRes.rowCount) {
        createdRow = existingBySlugRes.rows[0];
        break;
      }

      candidateSlug = `${baseSlug}-${attempt + 2}`;
    }

    if (!createdRow?.id) {
      const error = new Error('category_path_resolution_failed');
      error.code = 'category_path_resolution_failed';
      throw error;
    }

    currentId = createdRow.id;
    parentId = createdRow.id;
    parentSlug = createdRow.slug || candidateSlug;
  }

  return {
    categoryId: currentId,
    createdCount,
  };
}

async function resolveCategoryAssignmentForSync(client, {
  tenantId,
  item,
  existing = null,
  piquimTenant = false,
}) {
  const piquimRootCategoryLabels = piquimTenant ? resolvePiquimRootCategoryLabels(item) : [];
  const hasUsefulCategorySignal = Boolean(
    item?.hasCategoryRefs ||
    item?.hasCategoryPath ||
    (piquimTenant && piquimRootCategoryLabels.length)
  );
  const shouldAssignUndefinedCategory =
    item?.hasExplicitUndefinedCategory ||
    (!existing && !hasUsefulCategorySignal);

  if (shouldAssignUndefinedCategory) {
    const undefinedResolution = await resolveCategoryIdsForSync(client, {
      tenantId,
      categoryIds: [],
      categoryLabels: [UNDEFINED_CATEGORY_LABEL],
    });

    return {
      categoryIds: undefinedResolution.categoryIds,
      createdCount: undefinedResolution.createdCount,
      shouldReplaceCategories: true,
      source: 'undefined',
    };
  }

  if (piquimTenant) {
    if (piquimRootCategoryLabels.length) {
      const flatResolution = await resolveCategoryIdsForSync(client, {
        tenantId,
        categoryIds: [],
        categoryLabels: piquimRootCategoryLabels,
      });

      return {
        categoryIds: flatResolution.categoryIds,
        createdCount: flatResolution.createdCount,
        shouldReplaceCategories: true,
        source: 'piquim_root',
      };
    }

    if (item?.hasCategoryRefs) {
      const flatResolution = await resolveCategoryIdsForSync(client, {
        tenantId,
        categoryIds: item.categoryIds,
        categoryLabels: item.categoryLabels,
      });

      return {
        categoryIds: flatResolution.categoryIds,
        createdCount: flatResolution.createdCount,
        shouldReplaceCategories: true,
        source: 'flat',
      };
    }
  }

  if (item?.hasCategoryPath && item.categoryPathLabels.length > 1) {
    const categoryPathResolution = await ensureCategoryPathForSync(client, {
      tenantId,
      categoryPathLabels: item.categoryPathLabels,
    });

    return {
      categoryIds: categoryPathResolution.categoryId ? [categoryPathResolution.categoryId] : [],
      createdCount: categoryPathResolution.createdCount,
      shouldReplaceCategories: true,
      source: 'path',
    };
  }

  if (item?.hasCategoryRefs) {
    const flatResolution = await resolveCategoryIdsForSync(client, {
      tenantId,
      categoryIds: item.categoryIds,
      categoryLabels: item.categoryLabels,
    });

    return {
      categoryIds: flatResolution.categoryIds,
      createdCount: flatResolution.createdCount,
      shouldReplaceCategories: true,
      source: 'flat',
    };
  }

  if (item?.hasCategoryPath) {
    const flatResolution = await resolveCategoryIdsForSync(client, {
      tenantId,
      categoryIds: [],
      categoryLabels: item.categoryPathLabels,
    });

    return {
      categoryIds: flatResolution.categoryIds,
      createdCount: flatResolution.createdCount,
      shouldReplaceCategories: true,
      source: 'single_path',
    };
  }

  return {
    categoryIds: [],
    createdCount: 0,
    shouldReplaceCategories: false,
    source: 'preserve',
  };
}

const mapSyncItemError = (err) => {
  const errorCode = String(err?.code || '').trim();

  if (errorCode === 'invalid_value_format') {
    return {
      error: 'invalid_value_format',
      ...(err?.detail ? { error_detail: err.detail } : {}),
      ...(err?.field ? { error_field: err.field } : {}),
      ...(err?.raw_value !== undefined ? { error_value: err.raw_value } : {}),
    };
  }

  if (!errorCode && err?.message) {
    return { error: err.message };
  }

  if (errorCode === '22P02') {
    return {
      error: 'invalid_value_format',
      error_detail: 'Revisar formatos numericos o identificadores del item enviado.',
    };
  }

  if (errorCode === '23502') {
    return {
      error: 'required_value_missing',
      error_detail: 'Falta un dato requerido para persistir el item.',
    };
  }

  return { error: errorCode || err?.message || 'sync_item_failed' };
};

export async function ensureProductSyncSchema() {
  if (productSyncSchemaReady) return;

  if (!productSyncSchemaPromise) {
    productSyncSchemaPromise = (async () => {
      const client = await pool.connect();
      try {
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS external_id varchar');
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS source_system varchar');
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS is_active_source boolean NOT NULL DEFAULT true');
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS is_visible_web boolean NOT NULL DEFAULT true');
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS admin_locked boolean NOT NULL DEFAULT false');
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS deleted_at timestamptz');
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS last_sync_at timestamptz');

        await client.query(
          [
            'CREATE TABLE IF NOT EXISTS product_sync_metadata (',
            'id uuid PRIMARY KEY DEFAULT gen_random_uuid(),',
            'product_id uuid NOT NULL REFERENCES product_cache(id) ON DELETE CASCADE,',
            'tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,',
            'external_id varchar NOT NULL,',
            'source_system varchar NOT NULL,',
            'last_sync_at timestamptz NULL,',
            "raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,",
            'created_at timestamptz NOT NULL DEFAULT now(),',
            'updated_at timestamptz NOT NULL DEFAULT now()',
            ')',
          ].join(' ')
        );

        await client.query(
          [
            'CREATE UNIQUE INDEX IF NOT EXISTS product_sync_metadata_tenant_external_id_uidx',
            'ON product_sync_metadata(tenant_id, external_id)',
          ].join(' ')
        );

        await client.query(
          [
            'CREATE UNIQUE INDEX IF NOT EXISTS product_cache_tenant_external_id_uidx',
            'ON product_cache(tenant_id, external_id)',
            'WHERE external_id IS NOT NULL',
          ].join(' ')
        );

        await client.query(
          [
            'CREATE INDEX IF NOT EXISTS product_cache_tenant_visibility_sync_idx',
            'ON product_cache(tenant_id, status, is_active_source, is_visible_web, deleted_at)',
          ].join(' ')
        );

        await client.query(
          [
            'CREATE INDEX IF NOT EXISTS product_sync_metadata_tenant_last_sync_idx',
            'ON product_sync_metadata(tenant_id, last_sync_at DESC)',
          ].join(' ')
        );

        productSyncSchemaReady = true;
      } finally {
        client.release();
      }
    })().catch((err) => {
      productSyncSchemaPromise = null;
      throw err;
    });
  }

  await productSyncSchemaPromise;
}

export async function syncIntegrationProducts({
  tenantId,
  items,
  sourceSystem = DEFAULT_SOURCE_SYSTEM,
}) {
  await ensureProductSyncSchema();

  const sourceItems = Array.isArray(items) ? items : [];
  if (!sourceItems.length) {
    return {
      ok: true,
      tenant_id: tenantId,
      source_system: sourceSystem,
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      categories_created: 0,
      item_results: [],
    };
  }

  const normalizedEntries = sourceItems.map((rawItem, index) => {
    if (!isPlainObject(rawItem)) {
      return { index, rawItem, item: null };
    }

    return {
      index,
      rawItem,
      item: normalizeSyncItem({
        ...rawItem,
        source_system: rawItem?.source_system ?? rawItem?.sourceSystem ?? sourceSystem,
      }),
    };
  });

  const externalIds = [...new Set(
    normalizedEntries
      .map((entry) => entry.item?.externalId)
      .map((value) => toTextOrNull(value))
      .filter(Boolean)
  )];
  const piquimTenant = isPiquimTenant(tenantId);
  const skus = [...new Set(
    normalizedEntries
      .map((entry) => entry.item?.sku)
      .map((value) => toTextOrNull(value))
      .filter(Boolean)
  )];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingParams = [tenantId, externalIds];
    const existingSkuFilter = piquimTenant && skus.length
      ? `or p.sku = any($${existingParams.push(skus)}::varchar[])`
      : '';
    const existingRes = await client.query(
      [
        'select p.id, p.erp_id, p.external_id, p.sku, p.name, p.description, p.price, p.price_wholesale, p.stock, p.brand,',
        'p.data, p.status, p.admin_locked, p.deleted_at, p.is_active_source,',
        'm.external_id as metadata_external_id',
        'from product_cache p',
        'left join product_sync_metadata m on m.product_id = p.id and m.tenant_id = p.tenant_id',
        'where p.tenant_id = $1',
        `and (p.external_id = any($2::varchar[]) or p.erp_id = any($2::varchar[]) or m.external_id = any($2::varchar[]) ${existingSkuFilter})`,
      ].join(' '),
      existingParams
    );

    const existingByExternalId = new Map();
    const existingBySku = new Map();
    for (const row of existingRes.rows) {
      [row.external_id, row.erp_id, row.metadata_external_id]
        .map((value) => toTextOrNull(value))
        .filter(Boolean)
        .forEach((key) => {
          if (!existingByExternalId.has(key)) {
            existingByExternalId.set(key, row);
          }
        });
      const skuKey = toTextOrNull(row.sku);
      if (skuKey && !existingBySku.has(skuKey)) {
        existingBySku.set(skuKey, row);
      }
    }

    let created = 0;
    let updated = 0;
    let failed = 0;
    let categoriesCreated = 0;
    const syncedAt = new Date();
    const itemResults = [];

    for (const entry of normalizedEntries) {
      const { index, rawItem, item } = entry;
      const baseResult = buildSyncItemResultBase({
        index,
        rawItem: isPlainObject(rawItem) ? rawItem : {},
        item,
        sourceSystem,
      });

      if (!isPlainObject(rawItem)) {
        failed += 1;
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action: 'ignored',
          error: 'invalid_product_item',
        });
        continue;
      }

      if (!item?.externalId) {
        failed += 1;
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action: 'ignored',
          error: 'external_id_required',
        });
        continue;
      }

      if (piquimTenant) {
        item.images = [];
        item.hasImages = false;
      }

      const existing = existingByExternalId.get(item.externalId) || (piquimTenant ? existingBySku.get(item.sku) : null);

      if (item?.validationError) {
        failed += 1;
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action:
            item.operation === 'update'
              ? 'update'
              : item.operation === 'create'
                ? 'create'
                : existing
                  ? 'update'
                  : 'create',
          error: item.validationError.code || 'invalid_value_format',
          ...(item.validationError.detail ? { error_detail: item.validationError.detail } : {}),
          ...(item.validationError.field ? { error_field: item.validationError.field } : {}),
          ...(item.validationError.raw_value !== undefined ? { error_value: item.validationError.raw_value } : {}),
        });
        continue;
      }
      if (item.operation === 'create' && existing) {
        failed += 1;
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action: 'create',
          error: 'external_id_already_exists',
          product_id: existing.id,
        });
        continue;
      }

      if (item.operation === 'update' && !existing) {
        failed += 1;
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action: 'update',
          error: 'product_not_found',
        });
        continue;
      }

      const savepointName = `sync_item_${index + 1}`;
      await client.query(`SAVEPOINT ${savepointName}`);

      try {
        const categoryResolution = await resolveCategoryAssignmentForSync(client, {
          tenantId,
          item,
          existing,
          piquimTenant,
        });

        if (!existing) {
          const productData = buildProductDataFromSync({
            existingData: {},
            item,
            allowEditorialSync: true,
          });
          const insertRes = await client.query(
            [
              'insert into product_cache (',
              'tenant_id, erp_id, external_id, source_system, sku, name, description, price, price_wholesale, stock, brand, data,',
              'is_active_source, is_visible_web, admin_locked, deleted_at, last_sync_at',
              ') values (',
              '$1, $2, $3, $4, $5, $6, $7, $8, $9, greatest($10, 0), $11, $12::jsonb, $13, $14, $15, $16, $17',
              ') returning id',
            ].join(' '),
            [
              tenantId,
              item.externalId,
              item.externalId,
              item.sourceSystem,
              item.sku,
              item.name,
              item.description,
              item.hasPriceRetail ? item.priceRetail : 0,
              item.hasPriceWholesale ? item.priceWholesale : (item.hasPriceRetail ? item.priceRetail : 0),
              item.hasStock ? item.stock : 0,
              item.brand,
              JSON.stringify(productData),
              item.hasIsActive ? item.isActiveSource : true,
              true,
              false,
              item.deletedAt,
              syncedAt,
            ]
          );

          const productId = insertRes.rows[0].id;
          if (categoryResolution.shouldReplaceCategories && categoryResolution.categoryIds.length) {
            await replaceProductCategories(client, {
              tenantId,
              productId,
              categoryIds: categoryResolution.categoryIds,
            });
          }
          await upsertSyncMetadata(client, {
            tenantId,
            productId,
            externalId: item.externalId,
            sourceSystem: item.sourceSystem,
            lastSyncAt: syncedAt,
            rawPayload: item.rawPayload,
          });

          created += 1;
          categoriesCreated += categoryResolution.createdCount;
          const nextExisting = {
            id: productId,
            erp_id: item.externalId,
            external_id: item.externalId,
            sku: item.sku,
            name: item.name,
            description: item.description,
            price: item.hasPriceRetail ? item.priceRetail : 0,
            price_wholesale: item.hasPriceWholesale ? item.priceWholesale : (item.hasPriceRetail ? item.priceRetail : 0),
            stock: item.hasStock ? item.stock : 0,
            brand: item.brand,
            data: productData,
            status: item.deletedAt ? 'archived' : 'active',
            admin_locked: false,
            deleted_at: item.deletedAt,
            is_active_source: item.hasIsActive ? item.isActiveSource : true,
            metadata_external_id: item.externalId,
          };
          existingByExternalId.set(item.externalId, nextExisting);
          if (piquimTenant && item.sku) {
            existingBySku.set(item.sku, nextExisting);
          }
          await client.query(`RELEASE SAVEPOINT ${savepointName}`);
          itemResults.push({
            ...baseResult,
            ok: true,
            status: 'created',
            action: 'create',
            product_id: productId,
            categories_created: categoryResolution.createdCount,
            category_ids: categoryResolution.categoryIds,
          });
          continue;
        }

        const allowEditorialSync = existing.admin_locked !== true;
        const nextPrice = item.hasPriceRetail ? item.priceRetail : Number(existing.price || 0);
        const nextPriceWholesale = item.hasPriceWholesale
          ? item.priceWholesale
          : Number(existing.price_wholesale ?? nextPrice ?? 0);
        const nextStock = item.hasStock ? item.stock : Number(existing.stock || 0);
        const nextIsActiveSource = item.hasIsActive ? item.isActiveSource : existing.is_active_source !== false;
        const nextName = allowEditorialSync
          ? (item.hasName ? item.name : existing.name)
          : existing.name;
        const nextSku = allowEditorialSync
          ? (item.hasSku ? item.sku : existing.sku)
          : existing.sku;
        const nextDescription = allowEditorialSync
          ? (item.hasDescription ? item.description : existing.description)
          : existing.description;
        const nextBrand = allowEditorialSync
          ? (item.hasBrand ? item.brand : existing.brand)
          : existing.brand;
        const nextDeletedAt = allowEditorialSync && !existing.deleted_at && item.deletedAt
          ? item.deletedAt
          : existing.deleted_at;
        const nextData = buildProductDataFromSync({
          existingData: existing.data,
          item,
          allowEditorialSync,
        });

        await client.query(
          [
            'update product_cache',
            'set erp_id = $3,',
            'external_id = $4,',
            'source_system = $5,',
            'sku = $6,',
            'name = $7,',
            'description = $8,',
            'price = $9,',
            'price_wholesale = $10,',
            'stock = greatest($11, 0),',
            'brand = $12,',
            'data = $13::jsonb,',
            'is_active_source = $14,',
            'deleted_at = $15,',
            'last_sync_at = $16,',
            'updated_at = now()',
            'where tenant_id = $1 and id = $2',
          ].join(' '),
          [
            tenantId,
            existing.id,
            item.externalId,
            item.externalId,
            item.sourceSystem,
            nextSku,
            nextName,
            nextDescription,
            nextPrice,
            nextPriceWholesale,
            nextStock,
            nextBrand,
            JSON.stringify(nextData),
            nextIsActiveSource,
            nextDeletedAt,
            syncedAt,
          ]
        );

        if (allowEditorialSync && categoryResolution.shouldReplaceCategories) {
          await replaceProductCategories(client, {
            tenantId,
            productId: existing.id,
            categoryIds: categoryResolution.categoryIds,
          });
        }

        await upsertSyncMetadata(client, {
          tenantId,
          productId: existing.id,
          externalId: item.externalId,
          sourceSystem: item.sourceSystem,
          lastSyncAt: syncedAt,
          rawPayload: item.rawPayload,
        });

        updated += 1;
        categoriesCreated += categoryResolution.createdCount;
        existingByExternalId.set(item.externalId, {
          ...existing,
          erp_id: item.externalId,
          external_id: item.externalId,
          source_system: item.sourceSystem,
          sku: nextSku,
          name: nextName,
          description: nextDescription,
          price: nextPrice,
          price_wholesale: nextPriceWholesale,
          stock: nextStock,
          brand: nextBrand,
          data: nextData,
          deleted_at: nextDeletedAt,
          is_active_source: nextIsActiveSource,
          metadata_external_id: item.externalId,
        });
        if (piquimTenant && nextSku) {
          existingBySku.set(nextSku, existingByExternalId.get(item.externalId));
        }
        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
        itemResults.push({
          ...baseResult,
          ok: true,
          status: 'updated',
          action: 'update',
          product_id: existing.id,
          categories_created: categoryResolution.createdCount,
          category_ids: categoryResolution.categoryIds,
        });
      } catch (err) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
        failed += 1;
        const mappedError = mapSyncItemError(err);
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action: existing ? 'update' : 'create',
          error: mappedError.error,
          ...(mappedError.error_detail ? { error_detail: mappedError.error_detail } : {}),
        });
      }
    }

    await client.query('COMMIT');
    return {
      ok: failed === 0,
      partial: failed > 0 && (created > 0 || updated > 0),
      tenant_id: tenantId,
      source_system: sourceSystem,
      total: normalizedEntries.length,
      created,
      updated,
      failed,
      categories_created: categoriesCreated,
      item_results: itemResults,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const normalizeCategoryNameList = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => toTextOrNull(entry))
    .filter(Boolean);

const normalizeCategoryIdList = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);

const hasOnlyUndefinedCategories = (categoryNames = []) => {
  const names = normalizeCategoryNameList(categoryNames);
  return names.length > 0 && names.every((name) => isUndefinedLikeText(name));
};

const productNeedsCategoryRepair = (row) => {
  const categoryIds = normalizeCategoryIdList(row?.category_ids);
  const categoryNames = normalizeCategoryNameList(row?.category_names);
  return categoryIds.length === 0 || hasOnlyUndefinedCategories(categoryNames);
};

const buildRepairRawPayload = (row) => {
  const data = isPlainObject(row?.data) ? row.data : {};
  const rawPayload = isPlainObject(row?.raw_payload) ? { ...row.raw_payload } : {};
  const sourcePath = Array.isArray(data.source_category_path)
    ? data.source_category_path.map((value) => toTextOrNull(value)).filter(Boolean)
    : [];
  const hasPayloadPath = CATEGORY_PATH_ALIASES.some((key) => hasOwn(rawPayload, key));

  if (sourcePath.length && !hasPayloadPath) {
    rawPayload.category_path = sourcePath;
  }

  if (!firstTextAlias(rawPayload, ['external_id', 'externalId', 'id', 'sku', 'codigo', 'codigo_propio'])) {
    rawPayload.external_id = row.external_id || row.erp_id || row.sku || row.id;
  }
  if (!firstTextAlias(rawPayload, ['sku', 'codigo', 'codigo_propio', 'codigo_producto', 'product_code']) && row.sku) {
    rawPayload.sku = row.sku;
  }
  if (!firstTextAlias(rawPayload, ['name', 'title', 'titulo', 'detalle_ampliado', 'detalleAmpliado', 'product_name']) && row.name) {
    rawPayload.name = row.name;
  }
  if (!firstTextAlias(rawPayload, ['source_system', 'sourceSystem', 'origin']) && row.source_system) {
    rawPayload.source_system = row.source_system;
  }

  return rawPayload;
};

export async function repairSyncedProductCategories({
  tenantId,
  apply = false,
  filters = {},
} = {}) {
  await ensureProductSyncSchema();

  const normalizedTenantId = String(tenantId || '').trim();
  if (!isUuid(normalizedTenantId)) {
    const error = new Error('invalid_tenant_id');
    error.code = 'invalid_tenant_id';
    throw error;
  }

  const params = [normalizedTenantId];
  const where = [
    'p.tenant_id = $1',
    '(p.external_id is not null or p.erp_id is not null or p.source_system is not null or m.id is not null)',
  ];

  const sku = toTextOrNull(filters.sku);
  if (sku) {
    params.push(sku);
    where.push(`p.sku = $${params.length}`);
  }

  const externalId = toTextOrNull(filters.externalId);
  if (externalId) {
    params.push(externalId);
    where.push(`(p.external_id = $${params.length} or p.erp_id = $${params.length} or m.external_id = $${params.length})`);
  }

  const query = toTextOrNull(filters.query);
  if (query) {
    params.push(`%${query}%`);
    where.push([
      `(p.name ilike $${params.length}`,
      `or p.sku ilike $${params.length}`,
      `or p.erp_id ilike $${params.length}`,
      `or p.external_id ilike $${params.length})`,
    ].join(' '));
  }

  const limit = Number(filters.limit || 0);
  const hasLimit = Number.isInteger(limit) && limit > 0;
  if (hasLimit) {
    params.push(limit);
  }

  const client = await pool.connect();
  const results = [];
  let scanned = 0;
  let repaired = 0;
  let skipped = 0;
  let categoriesCreated = 0;

  try {
    await client.query('BEGIN');

    const productsRes = await client.query(
      [
        'select p.id, p.erp_id, p.external_id, p.source_system, p.sku, p.name, p.data,',
        'm.raw_payload,',
        "coalesce(array_agg(distinct pc.category_id) filter (where pc.category_id is not null), '{}'::uuid[]) as category_ids,",
        "coalesce(array_agg(distinct c.name) filter (where c.name is not null), '{}'::text[]) as category_names",
        'from product_cache p',
        [
          'left join lateral (',
          'select metadata.id, metadata.external_id, metadata.raw_payload',
          'from product_sync_metadata metadata',
          'where metadata.product_id = p.id and metadata.tenant_id = p.tenant_id',
          'order by metadata.last_sync_at desc nulls last, metadata.updated_at desc',
          'limit 1',
          ') m on true',
        ].join(' '),
        'left join product_categories pc on pc.product_id = p.id',
        'left join categories c on c.id = pc.category_id and c.tenant_id = p.tenant_id',
        `where ${where.join(' and ')}`,
        'group by p.id, p.erp_id, p.external_id, p.source_system, p.sku, p.name, p.data, m.raw_payload',
        'order by p.name asc',
        hasLimit ? `limit $${params.length}` : '',
      ].filter(Boolean).join(' '),
      params
    );

    for (const row of productsRes.rows) {
      scanned += 1;

      if (!productNeedsCategoryRepair(row)) {
        skipped += 1;
        continue;
      }

      const rawPayload = buildRepairRawPayload(row);
      const item = normalizeSyncItem(rawPayload, row.source_system || DEFAULT_SOURCE_SYSTEM);
      const hasUsefulSourceCategory = item.hasCategoryRefs || item.hasCategoryPath || item.hasExplicitUndefinedCategory;

      let categoryResolution = null;
      if (hasUsefulSourceCategory) {
        categoryResolution = await resolveCategoryAssignmentForSync(client, {
          tenantId: normalizedTenantId,
          item,
          existing: { id: row.id },
          piquimTenant: isPiquimTenant(normalizedTenantId),
        });
      } else if (!normalizeCategoryIdList(row.category_ids).length) {
        const fallbackResolution = await resolveCategoryIdsForSync(client, {
          tenantId: normalizedTenantId,
          categoryIds: [],
          categoryLabels: [UNDEFINED_CATEGORY_LABEL],
        });
        categoryResolution = {
          categoryIds: fallbackResolution.categoryIds,
          createdCount: fallbackResolution.createdCount,
          shouldReplaceCategories: true,
          source: 'missing_fallback',
        };
      }

      if (!categoryResolution?.shouldReplaceCategories) {
        skipped += 1;
        results.push({
          product_id: row.id,
          sku: row.sku,
          name: row.name,
          status: 'skipped',
          reason: 'no_source_category',
          current_categories: normalizeCategoryNameList(row.category_names),
          source_category_path: item.categoryPathLabels || [],
        });
        continue;
      }

      await replaceProductCategories(client, {
        tenantId: normalizedTenantId,
        productId: row.id,
        categoryIds: categoryResolution.categoryIds,
      });

      repaired += 1;
      categoriesCreated += Number(categoryResolution.createdCount || 0);
      results.push({
        product_id: row.id,
        sku: row.sku,
        external_id: row.external_id || row.erp_id || null,
        name: row.name,
        status: apply ? 'repaired' : 'would_repair',
        current_categories: normalizeCategoryNameList(row.category_names),
        next_category_ids: categoryResolution.categoryIds,
        source_category_path: item.categoryPathLabels || [],
        source: categoryResolution.source,
        categories_created: categoryResolution.createdCount,
      });
    }

    if (apply) {
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }

    return {
      ok: true,
      mode: apply ? 'apply' : 'dry-run',
      tenant_id: normalizedTenantId,
      scanned,
      repaired,
      skipped,
      categories_created: categoriesCreated,
      items: results,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
