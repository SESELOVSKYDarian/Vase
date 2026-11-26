// Convierte un producto recibido al formato de la tienda.
import { CATEGORY_GROUP_ALIASES, CATEGORY_LEAF_ALIASES, CATEGORY_PATH_ALIASES, CATEGORY_REF_ALIASES, CATEGORY_ROOT_ALIASES, DEFAULT_SOURCE_SYSTEM, RETAIL_PRICE_ALIASES, WHOLESALE_PRICE_ALIASES } from './constants.js';
import { buildFieldValidationError, firstBooleanAlias, firstPresentValue, firstTextAlias, hasAnyOwn, isPlainObject, isUuid, normalizeBrandValue, normalizeCategoryToken, normalizeStockQuantity, normalizeSyncOperation, readNumericAliasState, toTextOrNull } from './values.js';
import { normalizePriceTiers } from './price-tiers.js';
import { analyzeCategorySignal, splitCategoryPathTokens, splitCategoryTokens, uniqueTextValues } from './category-tokens.js';

export const collectRawImages = (source) => {
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

export const normalizeCategoryRefs = (raw, aliases = []) => {
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

export const normalizeCategoryHierarchy = (raw) => {
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

export const normalizeImageCollection = (images, fallbackAlt) => {
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

export const normalizeSyncItem = (rawItem, fallbackSourceSystem = DEFAULT_SOURCE_SYSTEM) => {
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

export const buildProductDataFromSync = ({ existingData, item, allowEditorialSync }) => {
  const next = isPlainObject(existingData) ? { ...existingData } : {};

  if (item.hasPriceTiers) {
    next.price_tiers = item.priceTiers.reduce((acc, entry) => {
      acc[entry.key] = entry.value;
      return acc;
    }, {});
  }

  if (allowEditorialSync && item.hasImages) {
    next.images = item.images || [];
    // Fotos nuevas o cambiadas: se vuelven a revisar para quitarles el fondo (las ya recortadas se cambian
    // por su versión sin fondo al instante, sin procesarlas de nuevo).
    delete next.bg_removal_done;
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

export const buildSyncItemResultBase = ({ index, rawItem, item, sourceSystem }) => ({
  index,
  external_id: item?.externalId || toTextOrNull(rawItem?.external_id ?? rawItem?.externalId ?? rawItem?.id ?? rawItem?.sku) || null,
  sku: item?.sku || toTextOrNull(rawItem?.sku ?? rawItem?.codigo ?? rawItem?.codigo_propio) || null,
  name: item?.name || toTextOrNull(rawItem?.name ?? rawItem?.title ?? rawItem?.titulo) || null,
  source_system: item?.sourceSystem || sourceSystem,
  requested_operation: item?.operation || normalizeSyncOperation(rawItem?.operation ?? rawItem?.action ?? rawItem?.mode ?? rawItem?.sync_mode),
});
