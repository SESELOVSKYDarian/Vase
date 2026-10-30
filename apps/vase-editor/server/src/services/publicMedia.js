import crypto from 'node:crypto';

// Las imagenes y videos de productos y paginas estan guardados como data URI (base64) dentro de
// los JSON de la base. Servirlos tal cual hace que el catalogo pese cientos de MB. Este modulo los
// reemplaza por URLs cortas y sirve los bytes con cache largo.

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
]);

const CONVERTIBLE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif']);

export const MIN_DATA_URI_LENGTH_TO_EXTERNALIZE = 2000;
const DEFAULT_IMAGE_WIDTH = 900;
// Solo se generan estos anchos: pedir cualquier numero permitiria forzar conversiones sin limite.
const IMAGE_WIDTH_BUCKETS = [160, 320, 480, 640, 900, 1200, 1600];

// SQL que reemplaza, dentro de data.images, cada data URI por la ruta que sirve esa imagen.
// El numero de version (updated_at) cambia cuando el producto se sincroniza, asi que el cache
// del navegador nunca muestra una imagen vieja.
const IMAGE_ROUTE_SQL =
  "'/public/products/' || p.id::text || '/images/' || (t.ord - 1)::text || '?v=' || floor(extract(epoch from p.updated_at))::bigint::text";

export const PUBLIC_PRODUCT_DATA_SQL = [
  "case when jsonb_typeof(p.data->'images') = 'array' then jsonb_set(p.data, '{images}', coalesce((",
  'select jsonb_agg(case',
  "when jsonb_typeof(im) = 'object' and left(coalesce(im->>'url', ''), 5) = 'data:'",
  `then (im - 'url') || jsonb_build_object('url', ${IMAGE_ROUTE_SQL})`,
  "when jsonb_typeof(im) = 'string' and left(im #>> '{}', 5) = 'data:'",
  `then to_jsonb(${IMAGE_ROUTE_SQL})`,
  'else im end order by t.ord)',
  "from jsonb_array_elements(p.data->'images') with ordinality as t(im, ord)",
  "), '[]'::jsonb)) else p.data end as data",
].join(' ');

export function parseDataUri(value) {
  if (typeof value !== 'string' || !value.startsWith('data:')) return null;
  const comma = value.indexOf(',');
  if (comma < 0) return null;

  const meta = value.slice(5, comma).split(';');
  const mime = String(meta[0] || '').trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mime)) return null;

  const payload = value.slice(comma + 1);
  try {
    const buffer = meta.includes('base64')
      ? Buffer.from(payload, 'base64')
      : Buffer.from(decodeURIComponent(payload), 'utf8');
    return buffer.length ? { mime, buffer } : null;
  } catch {
    return null;
  }
}

const UNSAFE_PATH_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function getValueByPath(root, path) {
  const keys = String(path || '').split('.').filter(Boolean);
  if (!keys.length) return undefined;

  let current = root;
  for (const key of keys) {
    if (UNSAFE_PATH_KEYS.has(key) || current === null || typeof current !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, key)) return undefined;
    current = current[key];
  }
  return current;
}

// Devuelve una copia de las props donde cada data URI grande apunta a la ruta de media de la seccion.
export function externalizePageProps(props, { slug, sectionId, version }) {
  const walk = (value, path) => {
    if (typeof value === 'string') {
      if (value.length >= MIN_DATA_URI_LENGTH_TO_EXTERNALIZE && parseDataUri(value)) {
        return (
          `/public/pages/${encodeURIComponent(slug)}/media/${encodeURIComponent(sectionId)}` +
          `?path=${encodeURIComponent(path.join('.'))}&v=${version}`
        );
      }
      return value;
    }
    if (Array.isArray(value)) return value.map((item, index) => walk(item, [...path, index]));
    if (value && typeof value === 'object') {
      const next = {};
      for (const [key, item] of Object.entries(value)) next[key] = walk(item, [...path, key]);
      return next;
    }
    return value;
  };

  return walk(props, []);
}

export function normalizeImageWidth(value, fallback = DEFAULT_IMAGE_WIDTH) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return IMAGE_WIDTH_BUCKETS.find((bucket) => bucket >= parsed) ?? IMAGE_WIDTH_BUCKETS[IMAGE_WIDTH_BUCKETS.length - 1];
}

let sharpPromise;
function loadSharp() {
  if (!sharpPromise) {
    sharpPromise = import('sharp').then((mod) => mod.default || mod).catch((error) => {
      console.warn('sharp no disponible, se sirven las imagenes sin optimizar:', error?.message || error);
      return null;
    });
  }
  return sharpPromise;
}

// Reduce y pasa a WebP las imagenes raster. Si algo falla devuelve el archivo original.
export async function optimizeMedia({ mime, buffer }, width = DEFAULT_IMAGE_WIDTH) {
  if (!CONVERTIBLE_MIME_TYPES.has(mime)) return { mime, buffer };
  const sharp = await loadSharp();
  if (!sharp) return { mime, buffer };

  try {
    const output = await sharp(buffer, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return output.length < buffer.length ? { mime: 'image/webp', buffer: output } : { mime, buffer };
  } catch (error) {
    console.warn('No se pudo optimizar la imagen:', error?.message || error);
    return { mime, buffer };
  }
}

export function createLoadingCache({
  ttlMs,
  maxEntries = 100,
  maxEntryBytes = Infinity,
  maxTotalBytes = Infinity,
  // Tiempo adicional tras vencer en el que se sigue sirviendo la copia vieja al instante mientras se
  // renueva en segundo plano ("stale-while-revalidate"): nadie espera la consulta pesada a la base.
  staleMs = 0,
  // Renovacion periodica de lo que se pidio hace poco: asi la primera visita tras un rato sin trafico
  // tampoco espera. Solo se renuevan las claves usadas en los ultimos `warmIdleMs` (maximo `warmMaxKeys`).
  keepWarmMs = 0,
  warmIdleMs = 10 * 60_000,
  warmMaxKeys = 12,
  sizeOf = (value) => value?.length || 0,
}) {
  const entries = new Map();
  const inflight = new Map();
  let totalBytes = 0;

  const remove = (key) => {
    const existing = entries.get(key);
    if (!existing) return;
    totalBytes -= existing.size;
    entries.delete(key);
  };

  const store = (key, value) => {
    const size = sizeOf(value);
    if (size > maxEntryBytes) return;
    remove(key);
    entries.set(key, { value, size, expires: Date.now() + ttlMs });
    totalBytes += size;
    // Se descartan primero las entradas mas viejas hasta entrar en el limite de memoria.
    while (entries.size > maxEntries || totalBytes > maxTotalBytes) remove(entries.keys().next().value);
  };

  // Una sola carga por clave a la vez; si la carga falla y hay un valor vencido, se sirve ese.
  const startLoad = (key, loader, hit) => {
    if (inflight.has(key)) return inflight.get(key);
    const pending = (async () => {
      try {
        const value = await loader();
        store(key, value);
        return value;
      } catch (error) {
        if (hit) return hit.value;
        throw error;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, pending);
    return pending;
  };

  const hot = new Map();
  if (keepWarmMs > 0) {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [key, item] of hot) {
        if (now - item.lastUsed > warmIdleMs) hot.delete(key);
        else if (!inflight.has(key)) startLoad(key, item.loader, entries.get(key)).catch(() => {});
      }
    }, keepWarmMs);
    timer.unref?.();
  }
  const markHot = (key, loader) => {
    if (keepWarmMs <= 0) return;
    hot.delete(key);
    hot.set(key, { loader, lastUsed: Date.now() });
    while (hot.size > warmMaxKeys) hot.delete(hot.keys().next().value);
  };

  return {
    async get(key, loader) {
      markHot(key, loader);
      const hit = entries.get(key);
      const now = Date.now();
      if (hit && hit.expires > now) return hit.value;
      if (hit && staleMs > 0 && now - hit.expires < staleMs) {
        startLoad(key, loader, hit).catch(() => {});
        return hit.value;
      }
      return startLoad(key, loader, hit);
    },
    clear() {
      entries.clear();
      hot.clear();
      totalBytes = 0;
    },
  };
}

export function hashBuffer(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 20);
}

export function sendMedia(req, res, { mime, buffer, etag }) {
  const quotedEtag = `"${etag}"`;
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('ETag', quotedEtag);
  if (mime === 'image/svg+xml') {
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  }

  if (req.headers['if-none-match'] === quotedEtag) {
    res.status(304).end();
    return;
  }

  const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || '').trim());
  if (range && (range[1] || range[2])) {
    const total = buffer.length;
    let start = range[1] ? Number(range[1]) : total - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : total - 1;
    start = Math.max(start, 0);
    end = Math.min(end, total - 1);
    if (start > end || start >= total) {
      res.status(416).setHeader('Content-Range', `bytes */${total}`);
      res.end();
      return;
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', end - start + 1);
    res.end(buffer.subarray(start, end + 1));
    return;
  }

  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
}
