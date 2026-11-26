// Quita el fondo de las fotos del catálogo de una tienda.
//
// - Recorre los productos que todavía no se revisaron (data.bg_removal_done no está).
// - A cada foto con fondo liso le quita el fondo, sube la versión recortada a uploads.vase.ar
//   y la pone en lugar de la original. Las fotos con ambiente se dejan como están.
// - Cada foto revisada queda anotada en la tabla image_cutouts (por tienda y huella de la foto original):
//   si la sincronización con el sistema de gestión vuelve a mandar la misma foto, se cambia por la
//   recortada al instante, sin volver a procesarla. Ahí también queda la original para poder volver atrás.
import crypto from 'node:crypto';
import { pool } from '../../db.js';
import { buildProductUploadsUsername, uploadBufferToUploadsService } from '../uploadsService.js';
import { removeSolidBackground } from './removeBackground.js';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
/** Versión del recorte. Si cambia la forma de recortar, las fotos hechas con una versión vieja se rehacen. */
export const CUTOUT_VERSION = 3;

let schemaReady = null;

/** Crea la tabla de fotos recortadas si no existe (cambio aditivo). */
export function ensureCutoutsSchema(db = pool) {
  if (!schemaReady) {
    schemaReady = db
      .query(
        [
          'create table if not exists image_cutouts (',
          'tenant_id uuid not null references tenants(id) on delete cascade,',
          'source_key text not null,',
          'original_url text,',
          'cutout_url text,',
          'created_at timestamptz not null default now(),',
          'primary key (tenant_id, source_key)',
          ')',
        ].join(' ')
      )
      .then(() => db.query('alter table image_cutouts add column if not exists algo_version int not null default 1'))
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}

/** Huella corta de la foto original (sirve de clave aunque la foto sea una imagen incrustada enorme). */
export function imageKey(source) {
  return crypto.createHash('sha1').update(String(source || '')).digest('hex').slice(0, 24);
}

/** Dirección o contenido de una foto, venga como texto o como objeto { url } / { src }. */
export function imageSource(image) {
  if (typeof image === 'string') return image.trim();
  if (image && typeof image === 'object') return String(image.url || image.src || '').trim();
  return '';
}

/** La misma foto con otra dirección, respetando la forma en que venía (texto u objeto). */
export function withSource(image, source) {
  if (typeof image === 'string' || !image || typeof image !== 'object') return source;
  return { ...image, ...(image.src && !image.url ? { src: source } : { url: source }) };
}

/** true si se puede descargar la foto sin riesgo (no direcciones internas del servidor). */
export function isFetchableImageUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const host = url.hostname.toLowerCase();
    if (!host.includes('.') || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return false;
    return true;
  } catch {
    return false;
  }
}

/** Bytes de una foto: de una imagen incrustada (data:) o descargándola. null si no se puede. */
async function loadImage(source) {
  const dataMatch = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(source);
  if (dataMatch) {
    const buffer = Buffer.from(dataMatch[1], 'base64');
    return buffer.length && buffer.length <= MAX_IMAGE_BYTES ? buffer : null;
  }
  if (!isFetchableImageUrl(source)) return null;
  const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) return null;
  if (Number(response.headers.get('content-length') || 0) > MAX_IMAGE_BYTES) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.length <= MAX_IMAGE_BYTES ? buffer : null;
}

/** Anotación guardada de una foto: { cutout_url } (null = no tenía fondo liso) o undefined si no se revisó. */
async function findCutout(tenantId, key) {
  const row = (await pool.query('select cutout_url from image_cutouts where tenant_id = $1 and source_key = $2 and algo_version = $3', [tenantId, key, CUTOUT_VERSION])).rows[0];
  return row ? { cutoutUrl: row.cutout_url } : undefined;
}

async function saveCutout(tenantId, key, originalUrl, cutoutUrl) {
  await pool.query(
    `insert into image_cutouts (tenant_id, source_key, original_url, cutout_url, algo_version) values ($1, $2, $3, $4, $5)
     on conflict (tenant_id, source_key) do update set cutout_url = excluded.cutout_url, original_url = excluded.original_url, algo_version = excluded.algo_version`,
    [tenantId, key, originalUrl, cutoutUrl, CUTOUT_VERSION]
  );
}

/** Devuelve la foto sin fondo (dirección) o null si no tenía fondo liso. Usa lo ya anotado si existe. */
async function cutoutFor(tenantId, productId, source) {
  const key = imageKey(source);
  const known = await findCutout(tenantId, key);
  if (known) return known.cutoutUrl;

  const buffer = await loadImage(source);
  const result = buffer ? await removeSolidBackground(buffer) : { status: 'skipped' };
  if (result.status !== 'removed') {
    await saveCutout(tenantId, key, source.startsWith('data:') ? null : source, null);
    return null;
  }
  const upload = await uploadBufferToUploadsService({
    buffer: result.buffer,
    originalName: `${productId}-sin-fondo.webp`,
    mimeType: 'image/webp',
    username: buildProductUploadsUsername(tenantId),
    tenantId,
  });
  await saveCutout(tenantId, key, source.startsWith('data:') ? null : source, upload.public_url);
  // La versión recortada también queda anotada como "ya revisada", para no procesarla de nuevo.
  await saveCutout(tenantId, imageKey(upload.public_url), null, null);
  return upload.public_url;
}

/** Procesa las fotos de un producto. Devuelve las fotos nuevas y cuántas cambiaron (null si hubo un error pasajero). */
async function processProduct(tenantId, product) {
  const data = product.data && typeof product.data === 'object' ? product.data : {};
  const images = Array.isArray(data.images) ? data.images : [];
  let changed = 0;
  const nextImages = [];
  for (const image of images) {
    const source = imageSource(image);
    if (!source || (source.startsWith('/') && !source.startsWith('//'))) {
      nextImages.push(image);
      continue;
    }
    try {
      const cutout = await cutoutFor(tenantId, product.id, source);
      if (cutout) changed += 1;
      nextImages.push(cutout ? withSource(image, cutout) : image);
    } catch (error) {
      // Error pasajero (red, subida): no se marca el producto, se reintenta en la próxima pasada.
      console.warn(`[bg-removal] producto ${product.id}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }
  return { images: nextImages, changed };
}

const statusByTenant = new Map();

/** Estado de la última pasada de una tienda (para mostrar el avance en el panel). */
export function getCutoutStatus(tenantId) {
  return statusByTenant.get(tenantId) || { state: 'idle' };
}

const PENDING_SQL = `tenant_id = $1
  and jsonb_typeof(data->'images') = 'array' and jsonb_array_length(data->'images') > 0
  and coalesce((data->>'bg_removal_done')::boolean, false) = false`;

/** Cuántos productos con fotos faltan revisar en la tienda. */
export async function countPendingProducts(tenantId) {
  return Number((await pool.query(`select count(*)::int as n from product_cache where ${PENDING_SQL}`, [tenantId])).rows[0]?.n || 0);
}

/**
 * Revisa hasta `limit` productos de la tienda que todavía no se revisaron.
 * Solo corre una pasada por tienda a la vez. Devuelve el estado con lo que hizo.
 */
export async function processTenantCatalog(tenantId, { limit = 50, productId = null } = {}) {
  const current = statusByTenant.get(tenantId);
  if (current?.state === 'running') return current;
  const status = { state: 'running', startedAt: new Date().toISOString(), products: 0, images: 0, failed: 0 };
  statusByTenant.set(tenantId, status);
  try {
    await ensureCutoutsSchema();
    // productId: solo ese producto (botón "Quitar fondo" de un producto).
    const rows = productId
      ? (await pool.query(`select id, data from product_cache where ${PENDING_SQL} and id = $2`, [tenantId, productId])).rows
      : (await pool.query(`select id, data from product_cache where ${PENDING_SQL} order by updated_at desc limit $2`, [tenantId, limit])).rows;
    for (const product of rows) {
      const result = await processProduct(tenantId, product);
      if (!result) {
        status.failed += 1;
        continue;
      }
      // Se guarda solo la lista de fotos y la marca: si en el medio cambió otra cosa del producto, no se pisa.
      await pool.query(
        `update product_cache set data = jsonb_set(data, '{images}', $3::jsonb) || '{"bg_removal_done": true}'::jsonb, updated_at = now()
         where id = $1 and tenant_id = $2`,
        [product.id, tenantId, JSON.stringify(result.images)]
      );
      status.products += 1;
      status.images += result.changed;
    }
    Object.assign(status, { state: 'done', finishedAt: new Date().toISOString(), remaining: await countPendingProducts(tenantId) });
    return status;
  } catch (error) {
    Object.assign(status, { state: 'error', error: error instanceof Error ? error.message : String(error) });
    return status;
  }
}

/** Vuelve a revisar todo el catálogo de la tienda, o un solo producto (por ejemplo después de cambiarle fotos). */
export async function resetTenantCutouts(tenantId, productId = null) {
  await pool.query(
    `update product_cache set data = data - 'bg_removal_done' where tenant_id = $1 and data ? 'bg_removal_done' ${productId ? 'and id = $2' : ''}`,
    productId ? [tenantId, productId] : [tenantId]
  );
}

/**
 * Procesa todo lo pendiente de la tienda en tandas, sin frenar el pedido que lo pidió.
 * Si ya hay una pasada corriendo para esa tienda, no arranca otra.
 */
export function processWholeCatalogInBackground(tenantId) {
  if (getCutoutStatus(tenantId).state === 'running') return false;
  void (async () => {
    for (let round = 0; round < 500; round += 1) {
      const status = await processTenantCatalog(tenantId, { limit: 40 });
      if (status.state !== 'done' || !status.remaining || !status.products) break;
    }
  })();
  return true;
}

/** Vuelve a poner las fotos originales (las que se guardaron como dirección) en todos los productos de la tienda. */
export async function restoreTenantOriginals(tenantId) {
  await ensureCutoutsSchema();
  const pairs = (await pool.query('select original_url, cutout_url from image_cutouts where tenant_id = $1 and cutout_url is not null and original_url is not null', [tenantId])).rows;
  if (!pairs.length) return 0;
  const back = new Map(pairs.map((row) => [row.cutout_url, row.original_url]));
  const rows = (await pool.query("select id, data from product_cache where tenant_id = $1 and jsonb_typeof(data->'images') = 'array'", [tenantId])).rows;
  let restored = 0;
  for (const product of rows) {
    const images = product.data.images;
    let touched = false;
    const next = images.map((image) => {
      const original = back.get(imageSource(image));
      if (!original) return image;
      touched = true;
      return withSource(image, original);
    });
    if (!touched) continue;
    await pool.query(
      `update product_cache set data = jsonb_set(data, '{images}', $3::jsonb) || '{"bg_removal_done": true}'::jsonb, updated_at = now() where id = $1 and tenant_id = $2`,
      [product.id, tenantId, JSON.stringify(next)]
    );
    restored += 1;
  }
  return restored;
}

/**
 * Si la tienda tiene fotos recortadas con una versión vieja del recorte: les vuelve a poner la foto
 * original, borra esas anotaciones y deja los productos para revisar de nuevo (se rehacen con la versión actual).
 * Las fotos viejas que venían incrustadas (sin dirección original) quedan como estaban.
 */
export async function upgradeOldCutouts(tenantId) {
  await ensureCutoutsSchema();
  const old = (await pool.query('select cutout_url, original_url from image_cutouts where tenant_id = $1 and algo_version < $2', [tenantId, CUTOUT_VERSION])).rows;
  if (!old.length) return 0;
  const back = new Map(old.filter((row) => row.cutout_url && row.original_url).map((row) => [row.cutout_url, row.original_url]));
  let touched = 0;
  if (back.size) {
    const rows = (await pool.query("select id, data->'images' as images from product_cache where tenant_id = $1 and jsonb_typeof(data->'images') = 'array'", [tenantId])).rows;
    for (const product of rows) {
      let changed = false;
      const images = product.images.map((image) => {
        const original = back.get(imageSource(image));
        if (!original) return image;
        changed = true;
        return withSource(image, original);
      });
      if (!changed) continue;
      await pool.query(
        "update product_cache set data = jsonb_set(data, '{images}', $3::jsonb) - 'bg_removal_done', updated_at = now() where id = $1 and tenant_id = $2",
        [product.id, tenantId, JSON.stringify(images)]
      );
      touched += 1;
    }
  }
  await pool.query('delete from image_cutouts where tenant_id = $1 and algo_version < $2', [tenantId, CUTOUT_VERSION]);
  return touched;
}
