// Logo de la tienda servido desde el mismo dominio de la tienda.
// Trae el logo de uploads.vase.ar, le recorta el margen transparente (así se ve más grande)
// y avisa si es claro u oscuro (cabecera X-Logo-Tone). Por venir del mismo dominio, el navegador
// también lo puede medir. Solo acepta imágenes de uploads.vase.ar: no sirve para traer cualquier cosa.
import express from 'express';
import sharp from 'sharp';

export const storefrontLogoRouter = express.Router();

const MAX_BYTES = 5 * 1024 * 1024;
const CACHE_LIMIT = 60;
const cache = new Map();

/** Dominio desde el que se aceptan logos (el de las subidas de Vase). */
function allowedHost() {
  const base = process.env.UPLOADS_PUBLIC_BASE_URL || process.env.PUBLIC_UPLOADS_BASE_URL || 'https://uploads.vase.ar';
  try {
    return new URL(base).host;
  } catch {
    return 'uploads.vase.ar';
  }
}

/** true si la dirección es https y del dominio de subidas de Vase. */
export function isAllowedLogoUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.host === allowedHost();
  } catch {
    return false;
  }
}

/** Cuenta qué parte del logo (sin lo transparente) es clara. Devuelve 'light' o 'dark'. */
async function measureTone(buffer) {
  const { data, info } = await sharp(buffer).resize(64, 64, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let visible = 0;
  let light = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    if (data[index + 3] < 60) continue;
    visible += 1;
    const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
    if (luminance > 205) light += 1;
  }
  return visible > 0 && light / visible > 0.55 ? 'light' : 'dark';
}

/** Descarga el logo, lo recorta y lo deja listo (PNG, hasta 720 px de ancho). */
async function prepareLogo(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`LOGO_FETCH_${response.status}`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_BYTES) throw new Error('LOGO_TOO_BIG');
  const original = Buffer.from(await response.arrayBuffer());
  if (original.length > MAX_BYTES) throw new Error('LOGO_TOO_BIG');
  const trimmed = await sharp(original).trim({ threshold: 8 }).resize({ width: 720, withoutEnlargement: true }).png().toBuffer();
  return { body: trimmed, tone: await measureTone(trimmed) };
}

storefrontLogoRouter.get('/logo', async (req, res) => {
  const url = String(req.query.u || '');
  if (!isAllowedLogoUrl(url)) return res.status(400).json({ error: 'logo_url_not_allowed' });
  try {
    let entry = cache.get(url);
    if (!entry) {
      entry = await prepareLogo(url);
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
      cache.set(url, entry);
    }
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('X-Logo-Tone', entry.tone);
    return res.send(entry.body);
  } catch (error) {
    console.warn('[storefront-logo] no se pudo preparar el logo', error instanceof Error ? error.message : error);
    // Si algo falla, la tienda usa el logo original.
    return res.redirect(302, url);
  }
});
