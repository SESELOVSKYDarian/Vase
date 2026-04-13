import { pool } from '../db.js';

let productSyncSchemaReady = false;
let productSyncSchemaPromise = null;

const DEFAULT_SOURCE_SYSTEM = 'erp';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_SYNC_OPERATION = 'upsert';
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
const UPDATE_REQUIRED_FIELDS = [
  { key: 'sku', check: (item) => item?.hasSku === true },
  { key: 'name', check: (item) => item?.hasName === true },
  { key: 'price_retail', check: (item) => item?.hasPriceRetail === true },
  { key: 'stock', check: (item) => item?.hasStock === true },
  { key: 'is_active', check: (item) => item?.hasIsActive === true },
  { key: 'brand', check: (item) => item?.hasBrand === true },
  { key: 'description', check: (item) => item?.hasDescription === true },
  { key: 'category', check: (item) => item?.hasCategoryRefs === true },
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

const firstPresentValue = (source, aliases = []) => {
  for (const key of aliases) {
    if (hasOwn(source, key)) {
      return source[key];
    }
  }
  return undefined;
};

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

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

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

  const unique = [...new Set(collected.map((value) => String(value || '').trim()).filter(Boolean))];
  return {
    ids: unique.filter((value) => isUuid(value)),
    labels: unique.filter((value) => !isUuid(value)),
  };
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
  const description = firstTextAlias(raw, [
    'description',
    'descripcion',
    'descripcion_ampliada',
    'descripcion_larga',
    'desc_ampliada',
    'detalle_abreviado',
    'detalleAbreviado',
    'texto_asociado',
    'textoAsociado',
    'full_description',
  ]);
  const shortDescription = firstTextAlias(raw, [
    'short_description',
    'descripcion_corta',
    'desc_corta',
    'detalle_abreviado',
    'detalleAbreviado',
  ]);
  const brand = firstTextAlias(raw, ['brand', 'marca']);
  const normalizedCategories = normalizeCategoryRefs(raw, [
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
  ]);
  const categoryIds = normalizedCategories.ids;
  const categoryLabels = normalizedCategories.labels;
  const sourceCategoryLabel = categoryLabels[0] || null;
  const priceRetail = firstNumericAlias(raw, [
    'price_retail',
    'priceRetail',
    'price',
    'precio',
    'precio_venta',
    'precioVenta',
    'precio_iva',
    'precio_final',
    'precio01',
    'precio_01',
    'tarifa_1',
  ]);
  const priceWholesale = firstNumericAlias(raw, [
    'price_wholesale',
    'priceWholesale',
    'wholesale_price',
    'precio_wholesale',
    'precio_mayorista',
    'mayorista',
    'precio03',
    'precio_03',
    'tarifa_3',
  ]);
  const stock = firstNumericAlias(raw, [
    'stock',
    'inventory',
    'quantity',
    'disponibilidad',
    'stock_actual',
    'existencia',
    'cantidad',
  ]);

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
    sourceCategoryLabel,
    hasSku: rawSku !== null,
    hasName: rawName !== null,
    hasDescription: description !== null,
    hasShortDescription: shortDescription !== null,
    hasBrand: brand !== null,
    hasCategoryIds: categoryIds.length > 0,
    hasCategoryLabels: categoryLabels.length > 0,
    hasCategoryRefs: categoryIds.length > 0 || categoryLabels.length > 0,
    hasSourceCategoryLabel: sourceCategoryLabel !== null,
    hasPriceRetail: priceRetail != null,
    hasPriceWholesale: priceWholesale != null,
    hasStock: stock != null,
    hasIsActive,
    priceRetail,
    priceWholesale,
    stock,
    isActiveSource,
    images: normalizeImageCollection(rawImages, name),
    hasImages: rawImages.length > 0,
    deletedAt,
    rawPayload: raw,
  };
};

const getMissingUpdateFields = (item) =>
  UPDATE_REQUIRED_FIELDS
    .filter((field) => !field.check(item))
    .map((field) => field.key);

const buildProductDataFromSync = ({ existingData, item, allowEditorialSync }) => {
  const next = isPlainObject(existingData) ? { ...existingData } : {};

  if (allowEditorialSync && item.hasImages) {
    next.images = item.images || [];
  }

  if (allowEditorialSync && item.hasShortDescription) {
    next.short_description = item.shortDescription || null;
  }

  if (allowEditorialSync && item.hasSourceCategoryLabel) {
    next.source_category = item.sourceCategoryLabel || null;
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      [
        'select p.id, p.erp_id, p.external_id, p.sku, p.name, p.description, p.price, p.price_wholesale, p.stock, p.brand,',
        'p.data, p.status, p.admin_locked, p.deleted_at, p.is_active_source,',
        'm.external_id as metadata_external_id',
        'from product_cache p',
        'left join product_sync_metadata m on m.product_id = p.id and m.tenant_id = p.tenant_id',
        'where p.tenant_id = $1',
        'and (p.external_id = any($2::varchar[]) or p.erp_id = any($2::varchar[]) or m.external_id = any($2::varchar[]))',
      ].join(' '),
      [tenantId, externalIds]
    );

    const existingByExternalId = new Map();
    for (const row of existingRes.rows) {
      [row.external_id, row.erp_id, row.metadata_external_id]
        .map((value) => toTextOrNull(value))
        .filter(Boolean)
        .forEach((key) => {
          if (!existingByExternalId.has(key)) {
            existingByExternalId.set(key, row);
          }
        });
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

      const existing = existingByExternalId.get(item.externalId);
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

      if (existing) {
        const missingFields = getMissingUpdateFields(item);
        if (missingFields.length) {
          failed += 1;
          itemResults.push({
            ...baseResult,
            ok: false,
            status: 'error',
            action: 'update',
            error: 'update_payload_incomplete',
            missing_fields: missingFields,
          });
          continue;
        }
      }

      const savepointName = `sync_item_${index + 1}`;
      await client.query(`SAVEPOINT ${savepointName}`);

      try {
        const categoryResolution = item.hasCategoryRefs
          ? await resolveCategoryIdsForSync(client, {
              tenantId,
              categoryIds: item.categoryIds,
              categoryLabels: item.categoryLabels,
            })
          : { categoryIds: [], createdCount: 0 };

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
          if (categoryResolution.categoryIds.length) {
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
          await client.query(`RELEASE SAVEPOINT ${savepointName}`);
          itemResults.push({
            ...baseResult,
            ok: true,
            status: 'created',
            action: 'create',
            product_id: productId,
            categories_created: categoryResolution.createdCount,
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
        const nextName = allowEditorialSync ? item.name : existing.name;
        const nextSku = allowEditorialSync ? item.sku : existing.sku;
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

        if (allowEditorialSync && categoryResolution.categoryIds.length) {
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
        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
        itemResults.push({
          ...baseResult,
          ok: true,
          status: 'updated',
          action: 'update',
          product_id: existing.id,
          categories_created: categoryResolution.createdCount,
        });
      } catch (err) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
        failed += 1;
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action: existingByExternalId.has(item.externalId) ? 'update' : 'create',
          error: err?.code || err?.message || 'sync_item_failed',
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
